import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EntityType, ExpenseStatus, RevenueStatus } from '@prisma/client';

function d(v: unknown): number {
  if (v === null || v === undefined) return 0;
  return Number(v);
}

@Injectable()
export class BalanceService {
  constructor(private readonly prisma: PrismaService) {}

  async accountBalance(accountId: string): Promise<number> {
    const acc = await this.prisma.bankAccount.findUnique({ where: { id: accountId } });
    if (!acc) return 0;
    let total = d(acc.initialBalance);

    const rev = await this.prisma.revenue.aggregate({
      where: {
        destinationAccountId: accountId,
        status: RevenueStatus.RECEBIDO,
      },
      _sum: { netAmount: true },
    });
    total += d(rev._sum.netAmount);

    const exp = await this.prisma.expense.aggregate({
      where: {
        bankAccountId: accountId,
        status: ExpenseStatus.PAGO,
      },
      _sum: { amount: true },
    });
    total -= d(exp._sum.amount);

    const tf = await this.prisma.internalTransfer.aggregate({
      where: { fromAccountId: accountId },
      _sum: { amount: true },
    });
    total -= d(tf._sum.amount);

    const tt = await this.prisma.internalTransfer.aggregate({
      where: { toAccountId: accountId },
      _sum: { amount: true },
    });
    total += d(tt._sum.amount);

    return Math.round(total * 100) / 100;
  }

  async entityBankTotal(entityId: string): Promise<number> {
    const accounts = await this.prisma.bankAccount.findMany({
      where: { financialEntityId: entityId, active: true },
    });
    let sum = 0;
    for (const a of accounts) {
      sum += await this.accountBalance(a.id);
    }
    return Math.round(sum * 100) / 100;
  }

  async entityTypeTotals(): Promise<{ pf: number; pj: number; consolidated: number }> {
    const entities = await this.prisma.financialEntity.findMany();
    let pf = 0;
    let pj = 0;
    for (const e of entities) {
      const t = await this.entityBankTotal(e.id);
      if (e.type === EntityType.PF) pf += t;
      else pj += t;
    }
    return {
      pf: Math.round(pf * 100) / 100,
      pj: Math.round(pj * 100) / 100,
      consolidated: Math.round((pf + pj) * 100) / 100,
    };
  }

  async financingTotalOutstanding(): Promise<number> {
    const agg = await this.prisma.financing.aggregate({ _sum: { currentBalance: true } });
    return Math.round(d(agg._sum.currentBalance) * 100) / 100;
  }
}
