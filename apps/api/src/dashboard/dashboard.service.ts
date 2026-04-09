import { Injectable } from '@nestjs/common';
import {
  ContractStatus,
  EntityType,
  ExpenseStatus,
  RevenueStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BalanceService } from '../ledger/balance.service';
import { endOfMonth, startOfMonth } from '../common/utils/date.util';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly balance: BalanceService,
  ) {}

  async summary() {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    const balances = await this.balance.entityTypeTotals();
    const entities = await this.prisma.financialEntity.findMany();

    const pfIds = entities.filter((e) => e.type === EntityType.PF).map((e) => e.id);
    const pjIds = entities.filter((e) => e.type === EntityType.PJ).map((e) => e.id);

    const revWhere = {
      competenceDate: { gte: start, lte: end },
      status: { in: [RevenueStatus.PREVISTO, RevenueStatus.RECEBIDO, RevenueStatus.ATRASADO] },
    };
    const expWhere = {
      competenceDate: { gte: start, lte: end },
      status: { in: [ExpenseStatus.PREVISTO, ExpenseStatus.PAGO, ExpenseStatus.ATRASADO] },
    };

    const [revPf, revPj, expPf, expPj] = await Promise.all([
      this.prisma.revenue.aggregate({
        where: { ...revWhere, financialEntityId: { in: pfIds } },
        _sum: { netAmount: true },
      }),
      this.prisma.revenue.aggregate({
        where: { ...revWhere, financialEntityId: { in: pjIds } },
        _sum: { netAmount: true },
      }),
      this.prisma.expense.aggregate({
        where: { ...expWhere, financialEntityId: { in: pfIds } },
        _sum: { amount: true },
      }),
      this.prisma.expense.aggregate({
        where: { ...expWhere, financialEntityId: { in: pjIds } },
        _sum: { amount: true },
      }),
    ]);

    const rPf = Number(revPf._sum.netAmount ?? 0);
    const rPj = Number(revPj._sum.netAmount ?? 0);
    const ePf = Number(expPf._sum.amount ?? 0);
    const ePj = Number(expPj._sum.amount ?? 0);

    const yearStart = new Date(y, 0, 1);
    const yearEnd = new Date(y, 11, 31, 23, 59, 59, 999);
    const revYearWhere = {
      competenceDate: { gte: yearStart, lte: yearEnd },
      status: { in: [RevenueStatus.PREVISTO, RevenueStatus.RECEBIDO, RevenueStatus.ATRASADO] },
    };
    const expYearWhere = {
      competenceDate: { gte: yearStart, lte: yearEnd },
      status: { in: [ExpenseStatus.PREVISTO, ExpenseStatus.PAGO, ExpenseStatus.ATRASADO] },
    };
    const [revYrPf, revYrPj, expYrPf, expYrPj] = await Promise.all([
      this.prisma.revenue.aggregate({
        where: { ...revYearWhere, financialEntityId: { in: pfIds } },
        _sum: { netAmount: true },
      }),
      this.prisma.revenue.aggregate({
        where: { ...revYearWhere, financialEntityId: { in: pjIds } },
        _sum: { netAmount: true },
      }),
      this.prisma.expense.aggregate({
        where: { ...expYearWhere, financialEntityId: { in: pfIds } },
        _sum: { amount: true },
      }),
      this.prisma.expense.aggregate({
        where: { ...expYearWhere, financialEntityId: { in: pjIds } },
        _sum: { amount: true },
      }),
    ]);
    const ryPf = Number(revYrPf._sum.netAmount ?? 0);
    const ryPj = Number(revYrPj._sum.netAmount ?? 0);
    const eyPf = Number(expYrPf._sum.amount ?? 0);
    const eyPj = Number(expYrPj._sum.amount ?? 0);

    const horizon = new Date();
    horizon.setDate(horizon.getDate() + 30);
    const [upcomingRev, upcomingExp, contracts, financingsAgg, cards] = await Promise.all([
      this.prisma.revenue.findMany({
        where: {
          dueDate: { gte: now, lte: horizon },
          status: { in: [RevenueStatus.PREVISTO, RevenueStatus.ATRASADO] },
        },
        orderBy: { dueDate: 'asc' },
        take: 15,
        include: { financialEntity: true },
      }),
      this.prisma.expense.findMany({
        where: {
          dueDate: { gte: now, lte: horizon },
          status: { in: [ExpenseStatus.PREVISTO, ExpenseStatus.ATRASADO] },
        },
        orderBy: { dueDate: 'asc' },
        take: 15,
        include: { financialEntity: true, originator: true },
      }),
      this.prisma.contract.findMany({
        where: { status: ContractStatus.ATIVO },
        orderBy: { clientName: 'asc' },
      }),
      this.prisma.financing.aggregate({ _sum: { currentBalance: true } }),
      this.prisma.creditCard.findMany({ where: { active: true } }),
    ]);

    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const cardSummaries = await Promise.all(
      cards.map(async (c) => {
        const inv = await this.prisma.creditCardInvoice.findUnique({
          where: { creditCardId_year_month: { creditCardId: c.id, year: y, month: m } },
        });
        return {
          cardId: c.id,
          name: c.name,
          monthTotal: inv ? Number(inv.total) : 0,
          limit: c.limitAmount ? Number(c.limitAmount) : null,
        };
      }),
    );

    const cashflow = await this.projectCashflowMonths(12);
    const expByCat = await this.expensesByCategoryMonth(start, end);
    const expByOrig = await this.expensesByOriginatorMonth(start, end);
    const revBySource = await this.revenuesByPayerMonth(start, end);

    return {
      balances,
      month: { year: y, month: m },
      revenuesMonth: { pf: rPf, pj: rPj, consolidated: rPf + rPj },
      expensesMonth: { pf: ePf, pj: ePj, consolidated: ePf + ePj },
      resultForecast: {
        pf: rPf - ePf,
        pj: rPj - ePj,
        consolidated: rPf + rPj - ePf - ePj,
      },
      annualYear: y,
      revenuesYear: { pf: ryPf, pj: ryPj, consolidated: ryPf + ryPj },
      expensesYear: { pf: eyPf, pj: eyPj, consolidated: eyPf + eyPj },
      resultYear: {
        pf: ryPf - eyPf,
        pj: ryPj - eyPj,
        consolidated: ryPf + ryPj - eyPf - eyPj,
      },
      upcoming: { revenues: upcomingRev, expenses: upcomingExp },
      activeContracts: contracts,
      creditCards: cardSummaries,
      financingOutstanding: Number(financingsAgg._sum.currentBalance ?? 0),
      charts: {
        cashflow12m: cashflow,
        expensesByCategory: expByCat,
        expensesByOriginator: expByOrig,
        revenuesByPayer: revBySource,
      },
    };
  }

  private async projectCashflowMonths(count: number) {
    const now = new Date();
    const rows: { year: number; month: number; inflow: number; outflow: number; net: number }[] =
      [];
    for (let i = 0; i < count; i++) {
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
      rows.push({
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        inflow,
        outflow,
        net: inflow - outflow,
      });
    }
    return rows;
  }

  private async expensesByCategoryMonth(start: Date, end: Date) {
    const list = await this.prisma.expense.findMany({
      where: { competenceDate: { gte: start, lte: end } },
      include: { category: true },
    });
    const map = new Map<string, number>();
    for (const x of list) {
      const k = x.category?.name ?? 'Sem categoria';
      map.set(k, (map.get(k) ?? 0) + Number(x.amount));
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }

  private async expensesByOriginatorMonth(start: Date, end: Date) {
    const list = await this.prisma.expense.findMany({
      where: { competenceDate: { gte: start, lte: end } },
      include: { originator: true },
    });
    const map = new Map<string, number>();
    for (const x of list) {
      const k = x.originator?.name ?? '—';
      map.set(k, (map.get(k) ?? 0) + Number(x.amount));
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }

  private async revenuesByPayerMonth(start: Date, end: Date) {
    const list = await this.prisma.revenue.findMany({
      where: { competenceDate: { gte: start, lte: end } },
      include: { payerSource: true },
    });
    const map = new Map<string, number>();
    for (const x of list) {
      const k = x.payerSource?.name ?? '—';
      map.set(k, (map.get(k) ?? 0) + Number(x.netAmount));
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }
}
