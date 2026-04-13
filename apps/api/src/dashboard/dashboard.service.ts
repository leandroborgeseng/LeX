import { BadRequestException, Injectable } from '@nestjs/common';
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

  async summary(financialEntityId?: string) {
    const scoped = financialEntityId
      ? await this.prisma.financialEntity.findUnique({ where: { id: financialEntityId } })
      : null;
    if (financialEntityId && !scoped) {
      throw new BadRequestException('Entidade não encontrada');
    }

    const ew = scoped ? { financialEntityId: scoped.id } : {};

    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const start = startOfMonth(now);
    const end = endOfMonth(now);

    const balances = scoped
      ? await (async () => {
          const t = await this.balance.entityBankTotal(scoped.id);
          return scoped.type === EntityType.PF
            ? { pf: t, pj: 0, consolidated: t }
            : { pf: 0, pj: t, consolidated: t };
        })()
      : await this.balance.entityTypeTotals();

    const revWhere = {
      competenceDate: { gte: start, lte: end },
      status: { in: [RevenueStatus.PREVISTO, RevenueStatus.RECEBIDO, RevenueStatus.ATRASADO] },
    };
    const expWhere = {
      competenceDate: { gte: start, lte: end },
      status: { in: [ExpenseStatus.PREVISTO, ExpenseStatus.PAGO, ExpenseStatus.ATRASADO] },
    };

    let rPf = 0;
    let rPj = 0;
    let ePf = 0;
    let ePj = 0;

    if (scoped) {
      const [rev, exp] = await Promise.all([
        this.prisma.revenue.aggregate({
          where: { ...revWhere, ...ew },
          _sum: { netAmount: true },
        }),
        this.prisma.expense.aggregate({
          where: { ...expWhere, ...ew },
          _sum: { amount: true },
        }),
      ]);
      const r = Number(rev._sum.netAmount ?? 0);
      const ex = Number(exp._sum.amount ?? 0);
      if (scoped.type === EntityType.PF) {
        rPf = r;
        ePf = ex;
      } else {
        rPj = r;
        ePj = ex;
      }
    } else {
      const entities = await this.prisma.financialEntity.findMany();
      const pfIds = entities.filter((e) => e.type === EntityType.PF).map((e) => e.id);
      const pjIds = entities.filter((e) => e.type === EntityType.PJ).map((e) => e.id);

      const [revPf, revPj, expPfAgg, expPjAgg] = await Promise.all([
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
      rPf = Number(revPf._sum.netAmount ?? 0);
      rPj = Number(revPj._sum.netAmount ?? 0);
      ePf = Number(expPfAgg._sum.amount ?? 0);
      ePj = Number(expPjAgg._sum.amount ?? 0);
    }

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

    let ryPf = 0;
    let ryPj = 0;
    let eyPf = 0;
    let eyPj = 0;

    if (scoped) {
      const [rev, exp] = await Promise.all([
        this.prisma.revenue.aggregate({
          where: { ...revYearWhere, ...ew },
          _sum: { netAmount: true },
        }),
        this.prisma.expense.aggregate({
          where: { ...expYearWhere, ...ew },
          _sum: { amount: true },
        }),
      ]);
      const r = Number(rev._sum.netAmount ?? 0);
      const ex = Number(exp._sum.amount ?? 0);
      if (scoped.type === EntityType.PF) {
        ryPf = r;
        eyPf = ex;
      } else {
        ryPj = r;
        eyPj = ex;
      }
    } else {
      const entities = await this.prisma.financialEntity.findMany();
      const pfIds = entities.filter((e) => e.type === EntityType.PF).map((e) => e.id);
      const pjIds = entities.filter((e) => e.type === EntityType.PJ).map((e) => e.id);

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
      ryPf = Number(revYrPf._sum.netAmount ?? 0);
      ryPj = Number(revYrPj._sum.netAmount ?? 0);
      eyPf = Number(expYrPf._sum.amount ?? 0);
      eyPj = Number(expYrPj._sum.amount ?? 0);
    }

    const horizon = new Date();
    horizon.setDate(horizon.getDate() + 30);
    const [upcomingRev, upcomingExp, contracts, financingsAgg, financingsList, cards] = await Promise.all([
      this.prisma.revenue.findMany({
        where: {
          dueDate: { gte: now, lte: horizon },
          status: { in: [RevenueStatus.PREVISTO, RevenueStatus.ATRASADO] },
          ...ew,
        },
        orderBy: { dueDate: 'asc' },
        take: 15,
        include: { financialEntity: true },
      }),
      this.prisma.expense.findMany({
        where: {
          dueDate: { gte: now, lte: horizon },
          status: { in: [ExpenseStatus.PREVISTO, ExpenseStatus.ATRASADO] },
          ...ew,
        },
        orderBy: { dueDate: 'asc' },
        take: 15,
        include: { financialEntity: true, originator: true },
      }),
      this.prisma.contract.findMany({
        where: { status: ContractStatus.ATIVO },
        orderBy: { clientName: 'asc' },
      }),
      this.prisma.financing.aggregate({
        where: scoped ? { financialEntityId: scoped.id } : {},
        _sum: { currentBalance: true },
      }),
      this.prisma.financing.findMany({
        where: scoped ? { financialEntityId: scoped.id } : {},
        orderBy: { name: 'asc' },
        include: {
          installments: { orderBy: { number: 'asc' } },
          financialEntity: true,
        },
      }),
      this.prisma.creditCard.findMany({ where: { active: true, ...ew } }),
    ]);

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

    const creditCardsDebtTotal = cardSummaries.reduce((s, c) => s + c.monthTotal, 0);

    const debtsFinancing = financingsList.map((f) => {
      const prev = f.installments.filter((i) => i.status === ExpenseStatus.PREVISTO);
      const sumPrevisto = prev.reduce((s, i) => s + Number(i.payment), 0);
      const fk = (f as { kind?: string }).kind ?? 'FINANCIAMENTO';
      return {
        id: f.id,
        name: f.name,
        creditor: f.creditor,
        kind: fk,
        currentBalance: Number(f.currentBalance),
        installmentsPrevisto: prev.length,
        sumPrevistoPayments: Math.round(sumPrevisto * 100) / 100,
        financialEntityName: f.financialEntity?.name ?? null,
      };
    });

    const startY = now.getFullYear();
    const debtProjectionYears = [] as {
      year: number;
      financingOutstanding: number;
      creditCardsSnapshot: number;
      totalDebt: number;
    }[];
    for (let yi = 0; yi <= 5; yi++) {
      const y = startY + yi;
      const yearEnd = new Date(y, 11, 31, 23, 59, 59, 999);
      let finOut = 0;
      for (const f of financingsList) {
        finOut += this.projectedFinancingBalanceAt(f, yearEnd);
      }
      finOut = Math.round(finOut * 100) / 100;
      debtProjectionYears.push({
        year: y,
        financingOutstanding: finOut,
        creditCardsSnapshot: Math.round(creditCardsDebtTotal * 100) / 100,
        totalDebt: Math.round((finOut + creditCardsDebtTotal) * 100) / 100,
      });
    }

    const entityIdForCharts = scoped?.id;
    const cashflow = await this.projectCashflowMonths(12, entityIdForCharts);
    const expByCat = await this.expensesByCategoryMonth(start, end, entityIdForCharts);
    const expByOrig = await this.expensesByOriginatorMonth(start, end, entityIdForCharts);
    const revBySource = await this.revenuesByPayerMonth(start, end, entityIdForCharts);

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
      creditCardsDebtTotal: Math.round(creditCardsDebtTotal * 100) / 100,
      financingOutstanding: Number(financingsAgg._sum.currentBalance ?? 0),
      debtsFinancing,
      debtProjectionYears,
      charts: {
        cashflow12m: cashflow,
        expensesByCategory: expByCat,
        expensesByOriginator: expByOrig,
        revenuesByPayer: revBySource,
      },
      filterEntity: scoped
        ? { id: scoped.id, name: scoped.name, type: scoped.type as string }
        : null,
    };
  }

  /**
   * Saldo principal de financiamento após todas as parcelas PREVISTO com vencimento até `at` (simulação com base na
   * tabela cadastrada).
   */
  private projectedFinancingBalanceAt(
    fin: {
      currentBalance: unknown;
      installments: { status: string; dueDate: Date; number: number; balanceAfter: unknown }[];
    },
    at: Date,
  ): number {
    const prev = fin.installments
      .filter((i) => i.status === ExpenseStatus.PREVISTO && new Date(i.dueDate) <= at)
      .sort((a, b) => a.number - b.number);
    if (prev.length === 0) return Number(fin.currentBalance ?? 0);
    return Number(prev[prev.length - 1].balanceAfter ?? 0);
  }

  private async projectCashflowMonths(count: number, entityId?: string) {
    const ew = entityId ? { financialEntityId: entityId } : {};
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
            ...ew,
          },
          _sum: { netAmount: true },
        }),
        this.prisma.expense.aggregate({
          where: {
            competenceDate: { gte: s, lte: e },
            status: {
              in: [ExpenseStatus.PREVISTO, ExpenseStatus.PAGO, ExpenseStatus.ATRASADO],
            },
            ...ew,
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

  private async expensesByCategoryMonth(start: Date, end: Date, entityId?: string) {
    const ew = entityId ? { financialEntityId: entityId } : {};
    const list = await this.prisma.expense.findMany({
      where: { competenceDate: { gte: start, lte: end }, ...ew },
      include: { category: true },
    });
    const map = new Map<string, number>();
    for (const x of list) {
      const k = x.category?.name ?? 'Sem categoria';
      map.set(k, (map.get(k) ?? 0) + Number(x.amount));
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }

  private async expensesByOriginatorMonth(start: Date, end: Date, entityId?: string) {
    const ew = entityId ? { financialEntityId: entityId } : {};
    const list = await this.prisma.expense.findMany({
      where: { competenceDate: { gte: start, lte: end }, ...ew },
      include: { originator: true },
    });
    const map = new Map<string, number>();
    for (const x of list) {
      const k = x.originator?.name ?? '—';
      map.set(k, (map.get(k) ?? 0) + Number(x.amount));
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }

  private async revenuesByPayerMonth(start: Date, end: Date, entityId?: string) {
    const ew = entityId ? { financialEntityId: entityId } : {};
    const list = await this.prisma.revenue.findMany({
      where: { competenceDate: { gte: start, lte: end }, ...ew },
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
