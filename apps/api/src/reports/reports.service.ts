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

  async dreSimplified(scope: EntityScope, from: string, to: string) {
    const ids = await this.entityIds(scope);
    const start = new Date(from);
    const end = new Date(to);

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

    const receita = Number(rev._sum.netAmount ?? 0);
    const despesas = Number(exp._sum.amount ?? 0);
    return {
      scope,
      from,
      to,
      receitaLiquida: receita,
      despesas,
      resultado: receita - despesas,
      detalhe: {
        receitaBruta: Number(rev._sum.grossAmount ?? 0),
        impostosDescontos: Number(rev._sum.taxDiscount ?? 0),
      },
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
