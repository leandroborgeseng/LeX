import { Injectable } from '@nestjs/common';
import {
  ContractStatus,
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
    const safeMonths = Math.max(1, Math.min(120, months || 12));
    const balances = await this.balance.entityTypeTotals();
    const now = new Date();
    const rows: {
      month: string;
      projectedBalance: number;
      inflow: number;
      outflow: number;
    }[] = [];
    let running = balances.consolidated;

    const contracts = await this.prisma.contract.findMany({
      where: { status: { in: [ContractStatus.ATIVO, 'PROSPECT' as ContractStatus] } },
    });

    for (let i = 0; i < safeMonths; i++) {
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
      const projectedContractsInflow = this.contractInflowForMonth(contracts, d);
      running = running + inflow + projectedContractsInflow - outflow;
      rows.push({
        month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        projectedBalance: Math.round(running * 100) / 100,
        inflow: Math.round((inflow + projectedContractsInflow) * 100) / 100,
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
    const totalPremium = Number((f as { insuranceTotalPremium?: unknown }).insuranceTotalPremium ?? 0);
    const remainingMonths = future.length;
    const monthsTotal = f.installmentsCount;
    const insuranceProportionalRefund =
      totalPremium > 0 && monthsTotal > 0
        ? Math.round(totalPremium * (remainingMonths / monthsTotal) * 100) / 100
        : 0;
    return {
      financingId,
      payoffAmount,
      futureInstallmentsSum: futurePay,
      estimatedInterestAvoided: saved,
      insuranceTotalPremium: totalPremium,
      insuranceRemainingMonths: remainingMonths,
      insuranceContractMonths: monthsTotal,
      insuranceProportionalRefund,
      totalEstimatedBenefit: saved + insuranceProportionalRefund,
    };
  }

  private contractInflowForMonth(
    contracts: {
      monthlyGross: unknown;
      estimatedTax: unknown;
      estimatedOpCost: unknown;
      estimatedNet: unknown;
      status: ContractStatus;
      startDate: Date | null;
      endDate: Date | null;
    }[],
    monthDate: Date,
  ) {
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    let total = 0;
    for (const c of contracts) {
      if (c.status === ContractStatus.SUSPENSO || c.status === ContractStatus.ENCERRADO) continue;
      if (c.startDate && c.startDate > monthEnd) continue;
      if (c.endDate && c.endDate < monthStart) continue;

      const net = Number(c.estimatedNet ?? 0);
      const gross = Number(c.monthlyGross ?? 0);
      const tax = Number(c.estimatedTax ?? 0);
      const op = Number(c.estimatedOpCost ?? 0);
      const effective = net !== 0 ? net : gross - tax - op;
      total += effective;
    }
    return total;
  }
}
