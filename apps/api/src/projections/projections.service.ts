import { Injectable } from '@nestjs/common';
import {
  ExpenseStatus,
  RevenueStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { endOfMonth, startOfMonth } from '../common/utils/date.util';
import { BalanceService } from '../ledger/balance.service';

@Injectable()
export class ProjectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly balance: BalanceService,
  ) {}

  async monthlyBase(months: number) {
    const balances = await this.balance.entityTypeTotals();
    const now = new Date();
    const rows: {
      month: string;
      projectedBalance: number;
      inflow: number;
      outflow: number;
    }[] = [];
    let running = balances.consolidated;

    for (let i = 0; i < months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const s = startOfMonth(d);
      const e = endOfMonth(d);
      const [rin, rout] = await Promise.all([
        this.prisma.revenue.aggregate({
          where: {
            competenceDate: { gte: s, lte: e },
            status: {
              in: [RevenueStatus.PREVISTO, RevenueStatus.RECEBIDO, RevenueStatus.ATRASADO],
            },
          },
          _sum: { netAmount: true },
        }),
        this.prisma.expense.aggregate({
          where: {
            competenceDate: { gte: s, lte: e },
            status: {
              in: [ExpenseStatus.PREVISTO, ExpenseStatus.PAGO, ExpenseStatus.ATRASADO],
            },
          },
          _sum: { amount: true },
        }),
      ]);
      const inflow = Number(rin._sum.netAmount ?? 0);
      const outflow = Number(rout._sum.amount ?? 0);
      running = running + inflow - outflow;
      rows.push({
        month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        projectedBalance: Math.round(running * 100) / 100,
        inflow,
        outflow,
      });
    }
    return { startingConsolidated: balances.consolidated, months: rows };
  }

  async conservative(months: number) {
    const base = await this.monthlyBase(months);
    const monthsAdj = base.months.map((m) => ({
      ...m,
      projectedBalance: Math.round((m.projectedBalance * 0.98) * 100) / 100,
      inflow: Math.round(m.inflow * 0.95 * 100) / 100,
      outflow: Math.round(m.outflow * 1.05 * 100) / 100,
    }));
    return { ...base, months: monthsAdj, note: 'Receitas -5%, despesas +5%, saldo ajustado' };
  }

  async contractImpact(monthlyNetDelta: number, months: number) {
    const base = await this.monthlyBase(months);
    const adj = base.months.map((m, idx) => ({
      ...m,
      projectedBalance: m.projectedBalance + monthlyNetDelta * (idx + 1),
      contractDelta: monthlyNetDelta,
    }));
    return { monthlyNetDelta, months: adj };
  }

  async expenseShock(extraMonthly: number, months: number) {
    const base = await this.monthlyBase(months);
    const adj = base.months.map((m, idx) => ({
      ...m,
      projectedBalance: m.projectedBalance - extraMonthly * (idx + 1),
      extraMonthly,
    }));
    return { extraMonthly, months: adj };
  }

  async earlyPayoff(financingId: string, payoffAmount: number) {
    const f = await this.prisma.financing.findUnique({
      where: { id: financingId },
      include: { installments: true },
    });
    if (!f) return { error: 'Financiamento não encontrado' };
    const future = f.installments.filter((i) => i.status === ExpenseStatus.PREVISTO);
    const futurePay = future.reduce((s, i) => s + Number(i.payment), 0);
    const saved = Math.max(0, futurePay - payoffAmount);
    return {
      financingId,
      payoffAmount,
      futureInstallmentsSum: futurePay,
      estimatedInterestAvoided: saved,
    };
  }
}
