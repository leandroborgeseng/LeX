import { Injectable } from '@nestjs/common';
import { CdbApplicationService } from '../cdb-application/cdb-application.service';
import { FinancingService } from '../financing/financing.service';
import {
  ContractStatus,
  EntityType,
  ExpenseStatus,
  RevenueStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EMPTY_SCOPE_ENTITY_ID } from '../common/entity-filter';
import { competenceUtcYearMonth1, endOfMonth, startOfMonth } from '../common/utils/date.util';

export type EntityScope = 'PF' | 'PJ' | 'CONSOLIDADO';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cdbApplications: CdbApplicationService,
    private readonly financings: FinancingService,
  ) {}

  private async entityIds(scope: EntityScope): Promise<string[] | undefined> {
    const all = await this.prisma.financialEntity.findMany();
    if (scope === 'CONSOLIDADO') return undefined;
    const t = scope === 'PF' ? EntityType.PF : EntityType.PJ;
    const ids = all.filter((e) => e.type === t).map((e) => e.id);
    return ids.length > 0 ? ids : [EMPTY_SCOPE_ENTITY_ID];
  }

  async cashflowMonthly(
    scope: EntityScope,
    year: number,
    month: number,
  ) {
    const ids = await this.entityIds(scope);
    const start = startOfMonth(new Date(year, month - 1, 1));
    const end = endOfMonth(start);

    const [rev, exp] = await Promise.all([
      this.prisma.revenue.findMany({
        where: {
          competenceDate: { gte: start, lte: end },
          ...(ids === undefined ? {} : { financialEntityId: { in: ids } }),
        },
        include: { payerSource: true, category: true, financialEntity: true },
      }),
      this.prisma.expense.findMany({
        where: {
          competenceDate: { gte: start, lte: end },
          ...(ids === undefined ? {} : { financialEntityId: { in: ids } }),
        },
        include: { category: true, originator: true, financialEntity: true },
      }),
    ]);

    const totalRev = rev.reduce((s, r) => s + Number(r.netAmount), 0);
    const totalExp = exp.reduce((s, r) => s + Number(r.amount), 0);

    return { period: { year, month }, revenues: rev, expenses: exp, totalRev, totalExp, net: totalRev - totalExp };
  }

  private async dreAggregate(scope: EntityScope, start: Date, end: Date) {
    const ids = await this.entityIds(scope);
    const [rev, exp] = await Promise.all([
      this.prisma.revenue.aggregate({
        where: {
          competenceDate: { gte: start, lte: end },
          status: {
            in: [RevenueStatus.RECEBIDO, RevenueStatus.PREVISTO, RevenueStatus.ATRASADO],
          },
          ...(ids === undefined ? {} : { financialEntityId: { in: ids } }),
        },
        _sum: { netAmount: true, grossAmount: true, taxDiscount: true },
      }),
      this.prisma.expense.aggregate({
        where: {
          competenceDate: { gte: start, lte: end },
          status: { in: [ExpenseStatus.PAGO, ExpenseStatus.PREVISTO, ExpenseStatus.ATRASADO] },
          ...(ids === undefined ? {} : { financialEntityId: { in: ids } }),
        },
        _sum: { amount: true },
      }),
    ]);

    const receitaLiquida = Number(rev._sum.netAmount ?? 0);
    const despesas = Number(exp._sum.amount ?? 0);
    return {
      receitaLiquida,
      despesas,
      resultado: receitaLiquida - despesas,
      detalhe: {
        receitaBruta: Number(rev._sum.grossAmount ?? 0),
        impostosDescontos: Number(rev._sum.taxDiscount ?? 0),
      },
    };
  }

  async dreSimplified(scope: EntityScope, from: string, to: string) {
    const start = new Date(from);
    const end = new Date(to);
    const core = await this.dreAggregate(scope, start, end);
    return {
      scope,
      from,
      to,
      ...core,
    };
  }

  /** DRE por mês (competência), alinhada à DRE simplificada (receita prevista/recebida; despesa prevista/paga). */
  async dreMonthly(scope: EntityScope, year: number) {
    const months: {
      month: number;
      monthKey: string;
      receitaLiquida: number;
      despesas: number;
      resultado: number;
      detalhe: { receitaBruta: number; impostosDescontos: number };
    }[] = [];
    let sumR = 0;
    let sumE = 0;
    for (let m = 1; m <= 12; m++) {
      const start = new Date(year, m - 1, 1);
      const end = endOfMonth(start);
      const row = await this.dreAggregate(scope, start, end);
      sumR += row.receitaLiquida;
      sumE += row.despesas;
      months.push({
        month: m,
        monthKey: `${year}-${String(m).padStart(2, '0')}`,
        receitaLiquida: row.receitaLiquida,
        despesas: row.despesas,
        resultado: row.resultado,
        detalhe: row.detalhe,
      });
    }
    return {
      scope,
      year,
      months,
      totals: {
        receitaLiquida: sumR,
        despesas: sumE,
        resultado: sumR - sumE,
      },
      nota: 'Receitas: PREVISTO + RECEBIDO + ATRASADO. Despesas: PREVISTO + PAGO + ATRASADO (competência em cada mês).',
    };
  }

  /**
   * Reexecuta sync de receitas (CDB com recorrência) e de despesas (parcelas de financiamento),
   * para os mesmos critérios de entidade da liquidez mensal.
   */
  async syncLiquidityMoviments(scope: EntityScope, financialEntityId?: string) {
    const entityWhere = await this.liquidityEntityWhere(scope, financialEntityId);
    const cdbWhere: { financialEntityId?: string | { in: string[] } } = {};
    const finWhere: { financialEntityId?: string | { in: string[] } } = {};
    if (entityWhere.financialEntityId !== undefined) {
      cdbWhere.financialEntityId = entityWhere.financialEntityId;
      finWhere.financialEntityId = entityWhere.financialEntityId;
    }

    const cdbs = await this.prisma.cdbApplication.findMany({ where: cdbWhere });
    const fins = await this.prisma.financing.findMany({ where: finWhere });

    for (const c of cdbs) {
      await this.cdbApplications.syncRevenuesForCdbApplication(c.id);
    }
    for (const f of fins) {
      await this.financings.syncExpensesForFinancing(f.id);
    }

    return {
      synced: {
        cdbApplications: cdbs.length,
        financings: fins.length,
      },
    };
  }

  private async liquidityEntityWhere(
    scope: EntityScope,
    financialEntityId?: string,
  ): Promise<{ financialEntityId?: string | { in: string[] } }> {
    const fid = financialEntityId?.trim();
    if (fid) return { financialEntityId: fid };
    const ids = await this.entityIds(scope);
    if (ids) return { financialEntityId: { in: ids } };
    return {};
  }

  /**
   * Despesas geradas pela app para financiamento/empréstimo têm `financingInstallmentId`.
   * Despesas “CDB” (aportes manuais etc.): texto em descrição, categoria ou notas contém “cdb”.
   */
  private isCdbExpenseText(
    description: string | null,
    categoryName: string | null,
    notes: string | null,
  ): boolean {
    const s = `${description ?? ''} ${categoryName ?? ''} ${notes ?? ''}`.toLowerCase();
    return s.includes('cdb');
  }

  private liquidityExpenseBucket(e: {
    financingInstallmentId: string | null;
    description: string | null;
    notes: string | null;
    category: { name: string } | null;
  }): 'financing' | 'cdb' | 'other' {
    if (e.financingInstallmentId) return 'financing';
    if (this.isCdbExpenseText(e.description, e.category?.name ?? null, e.notes)) return 'cdb';
    return 'other';
  }

  /**
   * Liquidez mensal no ano: receitas e despesas (DRE por competência),
   * receitas estimadas do CDB (`cdbApplicationId`), despesas de contrato (`financingInstallmentId`),
   * despesas CDB (texto), demais despesas e sobra livre.
   */
  async monthlyLiquidityYear(
    scope: EntityScope,
    year: number,
    financialEntityId?: string,
  ) {
    const yearStart = startOfMonth(new Date(year, 0, 1));
    const yearEnd = endOfMonth(new Date(year, 11, 1));
    const entityWhere = await this.liquidityEntityWhere(scope, financialEntityId);
    const fid = financialEntityId?.trim() ?? null;

    const [revenues, expenses] = await Promise.all([
      this.prisma.revenue.findMany({
        where: {
          competenceDate: { gte: yearStart, lte: yearEnd },
          status: {
            in: [RevenueStatus.RECEBIDO, RevenueStatus.PREVISTO, RevenueStatus.ATRASADO],
          },
          ...entityWhere,
        },
        select: { competenceDate: true, netAmount: true, cdbApplicationId: true },
      }),
      this.prisma.expense.findMany({
        where: {
          competenceDate: { gte: yearStart, lte: yearEnd },
          status: { in: [ExpenseStatus.PAGO, ExpenseStatus.PREVISTO, ExpenseStatus.ATRASADO] },
          ...entityWhere,
        },
        select: {
          competenceDate: true,
          amount: true,
          financingInstallmentId: true,
          description: true,
          notes: true,
          category: { select: { name: true } },
        },
      }),
    ]);

    const revByMonth = Array.from({ length: 12 }, () => 0);
    const revCdbByMonth = Array.from({ length: 12 }, () => 0);
    const expByMonth = Array.from({ length: 12 }, () => 0);
    const finExpByMonth = Array.from({ length: 12 }, () => 0);
    const cdbExpByMonth = Array.from({ length: 12 }, () => 0);

    for (const r of revenues) {
      const ym = competenceUtcYearMonth1(r.competenceDate);
      if (!ym || ym.year !== year) continue;
      const mi = ym.month1 - 1;
      const net = Number(r.netAmount);
      revByMonth[mi] += net;
      if (r.cdbApplicationId) revCdbByMonth[mi] += net;
    }
    for (const e of expenses) {
      const ym = competenceUtcYearMonth1(e.competenceDate);
      if (!ym || ym.year !== year) continue;
      const mi = ym.month1 - 1;
      const amt = Number(e.amount);
      expByMonth[mi] += amt;
      const b = this.liquidityExpenseBucket(e);
      if (b === 'financing') finExpByMonth[mi] += amt;
      else if (b === 'cdb') cdbExpByMonth[mi] += amt;
    }

    const months: {
      month: number;
      monthKey: string;
      receitas: number;
      receitasCdb: number;
      despesas: number;
      despesasFinanciamento: number;
      despesasCdb: number;
      despesasOutras: number;
      sobraLivre: number;
    }[] = [];

    let sumR = 0;
    let sumRc = 0;
    let sumE = 0;
    let sumFin = 0;
    let sumCdb = 0;
    let sumOutras = 0;
    let sumSobra = 0;

    for (let m = 1; m <= 12; m++) {
      const i = m - 1;
      const receitas = revByMonth[i];
      const receitasCdb = revCdbByMonth[i];
      const despesas = expByMonth[i];
      const despesasFinanciamento = finExpByMonth[i];
      const despesasCdb = cdbExpByMonth[i];
      const despesasOutras = despesas - despesasFinanciamento - despesasCdb;
      const sobraLivre = receitas - despesas;
      sumR += receitas;
      sumRc += receitasCdb;
      sumE += despesas;
      sumFin += despesasFinanciamento;
      sumCdb += despesasCdb;
      sumOutras += despesasOutras;
      sumSobra += sobraLivre;
      months.push({
        month: m,
        monthKey: `${year}-${String(m).padStart(2, '0')}`,
        receitas,
        receitasCdb,
        despesas,
        despesasFinanciamento,
        despesasCdb,
        despesasOutras,
        sobraLivre,
      });
    }

    return {
      scope,
      year,
      financialEntityId: fid,
      months,
      totals: {
        receitas: sumR,
        receitasCdb: sumRc,
        despesas: sumE,
        despesasFinanciamento: sumFin,
        despesasCdb: sumCdb,
        despesasOutras: sumOutras,
        sobraLivre: sumSobra,
      },
      nota:
        'Receitas: PREVISTO + RECEBIDO + ATRASADO. Rendimento CDB na app: receitas com vínculo à aplicação CDB. Despesas: PREVISTO + PAGO + ATRASADO. Financiamento/empréstimo: despesas geradas pela app (parcela do contrato). Despesas CDB: demais despesas com “cdb” em descrição, categoria ou notas. Sobra livre = receitas − despesas. Competências agrupadas pelo calendário UTC (YYYY-MM-DD).',
    };
  }

  /** Lançamentos do mês para detalhe na tela de liquidez (edição/exclusão na API de movimentos). */
  async monthlyLiquidityLines(
    scope: EntityScope,
    year: number,
    month: number,
    financialEntityId: string | undefined,
    side: 'revenues' | 'expenses',
    segment: 'all' | 'cdb' | 'financing' | 'other',
  ) {
    const entityWhere = await this.liquidityEntityWhere(scope, financialEntityId);
    const start = startOfMonth(new Date(year, month - 1, 1));
    const end = endOfMonth(start);

    if (side === 'revenues') {
      const whereRev = {
        competenceDate: { gte: start, lte: end },
        status: {
          in: [RevenueStatus.RECEBIDO, RevenueStatus.PREVISTO, RevenueStatus.ATRASADO],
        },
        ...entityWhere,
        ...(segment === 'cdb' ? { cdbApplicationId: { not: null } } : {}),
      };
      const rows = await this.prisma.revenue.findMany({
        where: whereRev,
        orderBy: [{ competenceDate: 'asc' }, { id: 'asc' }],
        include: {
          category: true,
          payerSource: true,
          financialEntity: { select: { id: true, name: true } },
          destinationAccount: true,
          cdbApplication: { select: { id: true, name: true } },
        },
      });
      return { scope, year, month, side, segment, rows };
    }

    const rows = await this.prisma.expense.findMany({
      where: {
        competenceDate: { gte: start, lte: end },
        status: { in: [ExpenseStatus.PAGO, ExpenseStatus.PREVISTO, ExpenseStatus.ATRASADO] },
        ...entityWhere,
      },
      orderBy: [{ competenceDate: 'asc' }, { id: 'asc' }],
      include: {
        category: true,
        originator: true,
        financialEntity: { select: { id: true, name: true } },
        bankAccount: true,
        creditCard: true,
        financingInstallment: {
          select: {
            id: true,
            number: true,
            financing: { select: { id: true, name: true, kind: true } },
          },
        },
      },
    });

    const filtered =
      segment === 'all'
        ? rows
        : rows.filter((e) => this.liquidityExpenseBucket(e) === segment);

    return { scope, year, month, side, segment, rows: filtered };
  }

  async expensesByCategory(
    scope: EntityScope,
    from: string,
    to: string,
  ) {
    const ids = await this.entityIds(scope);
    const list = await this.prisma.expense.findMany({
      where: {
        competenceDate: { gte: new Date(from), lte: new Date(to) },
        ...(ids === undefined ? {} : { financialEntityId: { in: ids } }),
      },
      include: { category: true },
    });
    const map = new Map<string, number>();
    for (const x of list) {
      const k = x.category?.name ?? 'Sem categoria';
      map.set(k, (map.get(k) ?? 0) + Number(x.amount));
    }
    return Array.from(map.entries()).map(([category, total]) => ({ category, total }));
  }

  async expensesByOriginator(
    scope: EntityScope,
    from: string,
    to: string,
  ) {
    const ids = await this.entityIds(scope);
    const list = await this.prisma.expense.findMany({
      where: {
        competenceDate: { gte: new Date(from), lte: new Date(to) },
        ...(ids === undefined ? {} : { financialEntityId: { in: ids } }),
      },
      include: { originator: true },
    });
    const map = new Map<string, number>();
    for (const x of list) {
      const k = x.originator?.name ?? '—';
      map.set(k, (map.get(k) ?? 0) + Number(x.amount));
    }
    return Array.from(map.entries()).map(([originator, total]) => ({ originator, total }));
  }

  async revenuesBySource(
    scope: EntityScope,
    from: string,
    to: string,
  ) {
    const ids = await this.entityIds(scope);
    const list = await this.prisma.revenue.findMany({
      where: {
        competenceDate: { gte: new Date(from), lte: new Date(to) },
        ...(ids === undefined ? {} : { financialEntityId: { in: ids } }),
      },
      include: { payerSource: true },
    });
    const map = new Map<string, number>();
    for (const x of list) {
      const k = x.payerSource?.name ?? '—';
      map.set(k, (map.get(k) ?? 0) + Number(x.netAmount));
    }
    return Array.from(map.entries()).map(([source, total]) => ({ source, total }));
  }

  async debtEvolution(months: number) {
    const now = new Date();
    const rows: { year: number; month: number; outstanding: number }[] = [];
    for (let i = 0; i < months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = endOfMonth(d);
      const paidAgg = await this.prisma.financingInstallment.aggregate({
        where: { status: ExpenseStatus.PAGO, paidAt: { lte: end } },
        _sum: { amortization: true },
      });
      const totalOriginal = await this.prisma.financing.aggregate({
        _sum: { originalValue: true },
      });
      const orig = Number(totalOriginal._sum.originalValue ?? 0);
      const amort = Number(paidAgg._sum.amortization ?? 0);
      rows.push({
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        outstanding: Math.max(0, orig - amort),
      });
    }
    return rows.reverse();
  }

  async contractsMargin() {
    const list = await this.prisma.contract.findMany({
      where: { status: ContractStatus.ATIVO },
    });
    return list.map((c) => ({
      id: c.id,
      client: c.clientName,
      monthlyGross: Number(c.monthlyGross),
      estimatedTax: Number(c.estimatedTax),
      estimatedOpCost: Number(c.estimatedOpCost),
      estimatedNet: Number(c.estimatedNet),
      marginPct:
        Number(c.monthlyGross) > 0
          ? (Number(c.estimatedNet) / Number(c.monthlyGross)) * 100
          : 0,
    }));
  }
}
