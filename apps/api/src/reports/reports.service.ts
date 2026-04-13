import { Injectable } from '@nestjs/common';
import {
  ContractStatus,
  EntityType,
  ExpenseStatus,
  RevenueStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { endOfMonth, startOfMonth } from '../common/utils/date.util';

export type EntityScope = 'PF' | 'PJ' | 'CONSOLIDADO';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private async entityIds(scope: EntityScope): Promise<string[] | undefined> {
    const all = await this.prisma.financialEntity.findMany();
    if (scope === 'CONSOLIDADO') return undefined;
    const t = scope === 'PF' ? EntityType.PF : EntityType.PJ;
    return all.filter((e) => e.type === t).map((e) => e.id);
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
          financialEntityId: ids ? { in: ids } : undefined,
        },
        include: { payerSource: true, category: true, financialEntity: true },
      }),
      this.prisma.expense.findMany({
        where: {
          competenceDate: { gte: start, lte: end },
          financialEntityId: ids ? { in: ids } : undefined,
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
          status: { in: [RevenueStatus.RECEBIDO, RevenueStatus.PREVISTO] },
          financialEntityId: ids ? { in: ids } : undefined,
        },
        _sum: { netAmount: true, grossAmount: true, taxDiscount: true },
      }),
      this.prisma.expense.aggregate({
        where: {
          competenceDate: { gte: start, lte: end },
          status: { in: [ExpenseStatus.PAGO, ExpenseStatus.PREVISTO] },
          financialEntityId: ids ? { in: ids } : undefined,
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
      nota: 'Receitas: PREVISTO + RECEBIDO. Despesas: PREVISTO + PAGO (competência em cada mês).',
    };
  }

  /** Despesas “CDB”: texto em descrição ou nome da categoria contém “cdb” (minúsculas). */
  private isCdbExpense(description: string | null, categoryName: string | null): boolean {
    const s = `${description ?? ''} ${categoryName ?? ''}`.toLowerCase();
    return s.includes('cdb');
  }

  /**
   * Liquidez mensal no ano: receitas e despesas (mesma regra da DRE por competência),
   * subtotal de despesas ligadas a CDB (heurística por texto) e sobra livre (receitas − despesas).
   */
  async monthlyLiquidityYear(
    scope: EntityScope,
    year: number,
    financialEntityId?: string,
  ) {
    const yearStart = startOfMonth(new Date(year, 0, 1));
    const yearEnd = endOfMonth(new Date(year, 11, 1));

    const entityWhere: { financialEntityId?: string | { in: string[] } } = {};
    const fid = financialEntityId?.trim();
    if (fid) {
      entityWhere.financialEntityId = fid;
    } else {
      const ids = await this.entityIds(scope);
      if (ids) entityWhere.financialEntityId = { in: ids };
    }

    const [revenues, expenses] = await Promise.all([
      this.prisma.revenue.findMany({
        where: {
          competenceDate: { gte: yearStart, lte: yearEnd },
          status: { in: [RevenueStatus.RECEBIDO, RevenueStatus.PREVISTO] },
          ...entityWhere,
        },
        select: { competenceDate: true, netAmount: true },
      }),
      this.prisma.expense.findMany({
        where: {
          competenceDate: { gte: yearStart, lte: yearEnd },
          status: { in: [ExpenseStatus.PAGO, ExpenseStatus.PREVISTO] },
          ...entityWhere,
        },
        select: {
          competenceDate: true,
          amount: true,
          description: true,
          category: { select: { name: true } },
        },
      }),
    ]);

    const revByMonth = Array.from({ length: 12 }, () => 0);
    const expByMonth = Array.from({ length: 12 }, () => 0);
    const cdbExpByMonth = Array.from({ length: 12 }, () => 0);

    for (const r of revenues) {
      const d = new Date(r.competenceDate);
      if (d.getFullYear() !== year) continue;
      revByMonth[d.getMonth()] += Number(r.netAmount);
    }
    for (const e of expenses) {
      const d = new Date(e.competenceDate);
      if (d.getFullYear() !== year) continue;
      const mi = d.getMonth();
      const amt = Number(e.amount);
      expByMonth[mi] += amt;
      if (this.isCdbExpense(e.description, e.category?.name ?? null)) {
        cdbExpByMonth[mi] += amt;
      }
    }

    const months: {
      month: number;
      monthKey: string;
      receitas: number;
      despesas: number;
      despesasCdb: number;
      despesasOutras: number;
      sobraLivre: number;
    }[] = [];

    let sumR = 0;
    let sumE = 0;
    let sumCdb = 0;
    let sumOutras = 0;
    let sumSobra = 0;

    for (let m = 1; m <= 12; m++) {
      const i = m - 1;
      const receitas = revByMonth[i];
      const despesas = expByMonth[i];
      const despesasCdb = cdbExpByMonth[i];
      const despesasOutras = despesas - despesasCdb;
      const sobraLivre = receitas - despesas;
      sumR += receitas;
      sumE += despesas;
      sumCdb += despesasCdb;
      sumOutras += despesasOutras;
      sumSobra += sobraLivre;
      months.push({
        month: m,
        monthKey: `${year}-${String(m).padStart(2, '0')}`,
        receitas,
        despesas,
        despesasCdb,
        despesasOutras,
        sobraLivre,
      });
    }

    return {
      scope,
      year,
      financialEntityId: fid ?? null,
      months,
      totals: {
        receitas: sumR,
        despesas: sumE,
        despesasCdb: sumCdb,
        despesasOutras: sumOutras,
        sobraLivre: sumSobra,
      },
      nota:
        'Receitas: PREVISTO + RECEBIDO. Despesas: PREVISTO + PAGO (competência). Despesas CDB: descrição ou categoria contém "cdb". Sobra livre = receitas − despesas (inclui CDB e demais).',
    };
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
        financialEntityId: ids ? { in: ids } : undefined,
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
        financialEntityId: ids ? { in: ids } : undefined,
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
        financialEntityId: ids ? { in: ids } : undefined,
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
