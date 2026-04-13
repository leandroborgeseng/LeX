import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CategoryKind,
  ExpenseStatus,
  ExpenseType,
  PaymentMethod,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { buildSchedule } from './amortization.util';
import { CreateFinancingDto, UpdateFinancingDto } from './dto/financing.dto';

const FINANCING_EXPENSE_CATEGORY = 'Cartão / Financiamentos';

@Injectable()
export class FinancingService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.financing.findMany({
      orderBy: { createdAt: 'desc' },
      include: { installments: { orderBy: { number: 'asc' } } },
    });
  }

  async findOne(id: string) {
    const f = await this.prisma.financing.findUnique({
      where: { id },
      include: { installments: { orderBy: { number: 'asc' } } },
    });
    if (!f) throw new NotFoundException('Financiamento não encontrado');
    return f;
  }

  private async resolveFinancingExpenseCategoryId(): Promise<string> {
    const c = await this.prisma.category.upsert({
      where: {
        name_kind: { name: FINANCING_EXPENSE_CATEGORY, kind: CategoryKind.EXPENSE },
      },
      update: {},
      create: { name: FINANCING_EXPENSE_CATEGORY, kind: CategoryKind.EXPENSE },
    });
    return c.id;
  }

  /** Remove despesas PREVISTO geradas automaticamente para parcelas deste contrato (sem tocar em parcelas já PAGAS). */
  private async removePrevistoExpensesForFinancingInstallments(financingId: string) {
    await this.prisma.expense.deleteMany({
      where: {
        status: ExpenseStatus.PREVISTO,
        financingInstallment: { financingId },
      } as never,
    });
  }

  /**
   * Cria ou atualiza despesas PREVISTO ligadas às parcelas PREVISTO do contrato (competência = vencimento da parcela).
   * Exige `financialEntityId` no financiamento; sem entidade, remove apenas despesas PREVISTO vinculadas.
   */
  async syncExpensesForFinancing(financingId: string) {
    const f = await this.prisma.financing.findUnique({
      where: { id: financingId },
      include: { installments: { orderBy: { number: 'asc' } } },
    });
    if (!f) return;
    if (!f.financialEntityId) {
      await this.removePrevistoExpensesForFinancingInstallments(financingId);
      return;
    }

    const categoryId = await this.resolveFinancingExpenseCategoryId();
    const kind = (f as { kind?: string }).kind ?? 'FINANCIAMENTO';
    const kindLabel = kind === 'EMPRESTIMO' ? 'Empréstimo' : 'Financiamento';

    for (const inst of f.installments) {
      if (inst.status !== ExpenseStatus.PREVISTO) continue;
      const description = `${kindLabel}: ${f.name} · Parcela ${inst.number}/${f.installmentsCount}`;
      const existing = await this.prisma.expense.findFirst({
        where: { financingInstallmentId: inst.id } as never,
      });
      if (existing) {
        if (
          Number(existing.amount) !== Number(inst.payment) ||
          existing.dueDate.getTime() !== new Date(inst.dueDate).getTime()
        ) {
          await this.prisma.expense.update({
            where: { id: existing.id },
            data: {
              amount: inst.payment,
              competenceDate: inst.dueDate,
              dueDate: inst.dueDate,
              description,
            },
          });
        }
        continue;
      }
      await this.prisma.expense.create({
        data: {
          financialEntityId: f.financialEntityId,
          description,
          type: ExpenseType.ESPORADICA,
          categoryId,
          amount: inst.payment,
          competenceDate: inst.dueDate,
          dueDate: inst.dueDate,
          status: ExpenseStatus.PREVISTO,
          paymentMethod: PaymentMethod.TRANSFERENCIA,
          financingInstallmentId: inst.id,
          mandatory: true,
          notes: `Lançamento automático (${kindLabel.toLowerCase()}).`,
        } as never,
      });
    }
  }

  private async applyInstallmentPaid(
    financingId: string,
    inst: { id: string; payment: unknown; interest: unknown; amortization: unknown; balanceAfter: unknown },
    paidAt: Date,
  ) {
    const pay = Number(inst.payment);
    const intr = Number(inst.interest);
    const amort = Number(inst.amortization);
    const bal = Number(inst.balanceAfter);
    await this.prisma.$transaction([
      this.prisma.financingInstallment.update({
        where: { id: inst.id },
        data: { status: ExpenseStatus.PAGO, paidAt },
      }),
      this.prisma.financing.update({
        where: { id: financingId },
        data: {
          totalPaid: { increment: pay },
          interestPaid: { increment: intr },
          amortAccumulated: { increment: amort },
          currentBalance: bal,
        },
      }),
    ]);
    await this.prisma.expense.updateMany({
      where: { financingInstallmentId: inst.id } as never,
      data: { status: ExpenseStatus.PAGO, paidAt },
    });
  }

  /** Chamado quando a despesa vinculada é marcada como PAGA na UI de despesas. */
  async markInstallmentPaidFromLinkedExpense(installmentId: string, paidAt: Date) {
    const inst = await this.prisma.financingInstallment.findUnique({
      where: { id: installmentId },
    });
    if (!inst || inst.status === ExpenseStatus.PAGO) return;
    await this.applyInstallmentPaid(inst.financingId, inst, paidAt);
  }

  async create(dto: CreateFinancingDto) {
    const start = new Date(dto.startDate);
    const schedule = buildSchedule(
      dto.originalValue,
      dto.monthlyRate,
      dto.installmentsCount,
      dto.amortSystem,
      start,
    );
    const firstPay = schedule[0]?.payment ?? 0;
    const created = await this.prisma.financing.create({
      data: {
        financialEntityId: dto.financialEntityId,
        kind: dto.kind ?? 'FINANCIAMENTO',
        name: dto.name,
        creditor: dto.creditor,
        originalValue: dto.originalValue,
        monthlyRate: dto.monthlyRate,
        installmentsCount: dto.installmentsCount,
        amortSystem: dto.amortSystem,
        startDate: start,
        installmentValue: firstPay,
        currentBalance: dto.originalValue,
        insuranceTotalPremium: dto.insuranceTotalPremium ?? 0,
        installments: {
          create: schedule.map((r) => ({
            number: r.number,
            dueDate: r.dueDate,
            payment: r.payment,
            interest: r.interest,
            amortization: r.amortization,
            balanceAfter: r.balanceAfter,
            status: ExpenseStatus.PREVISTO,
          })),
        },
      } as never,
      include: { installments: true },
    });
    await this.syncExpensesForFinancing(created.id);
    return this.findOne(created.id);
  }

  async payInstallment(financingId: string, installmentNumber: number, paidAt: Date) {
    const f = await this.findOne(financingId);
    const inst = f.installments.find((i) => i.number === installmentNumber);
    if (!inst) throw new NotFoundException('Parcela não encontrada');
    if (inst.status === ExpenseStatus.PAGO) {
      throw new BadRequestException('Parcela já paga');
    }
    await this.applyInstallmentPaid(financingId, inst, paidAt);
    return this.findOne(financingId);
  }

  async regenerateFutureInstallments(financingId: string) {
    const f = await this.findOne(financingId);
    const paidCount = f.installments.filter((i) => i.status === ExpenseStatus.PAGO).length;
    const remaining = f.installmentsCount - paidCount;
    if (remaining <= 0) {
      await this.prisma.financingInstallment.deleteMany({
        where: { financingId, status: ExpenseStatus.PREVISTO },
      });
      return this.findOne(financingId);
    }
    await this.prisma.financingInstallment.deleteMany({
      where: { financingId, status: ExpenseStatus.PREVISTO },
    });
    const lastPaid = f.installments
      .filter((i) => i.status === ExpenseStatus.PAGO)
      .sort((a, b) => b.number - a.number)[0];
    const startBase = lastPaid?.dueDate ?? f.startDate;
    const start = new Date(startBase);
    start.setMonth(start.getMonth() + 1);
    const balance = Number(f.currentBalance);
    const schedule = buildSchedule(
      balance,
      Number(f.monthlyRate),
      remaining,
      f.amortSystem,
      start,
    );
    const startNum = paidCount + 1;
    await this.prisma.$transaction(
      schedule.map((r, idx) =>
        this.prisma.financingInstallment.create({
          data: {
            financingId,
            number: startNum + idx,
            dueDate: r.dueDate,
            payment: r.payment,
            interest: r.interest,
            amortization: r.amortization,
            balanceAfter: r.balanceAfter,
            status: ExpenseStatus.PREVISTO,
          },
        }),
      ),
    );
    await this.prisma.financing.update({
      where: { id: financingId },
      data: { installmentValue: schedule[0]?.payment ?? 0 },
    });
    await this.syncExpensesForFinancing(financingId);
    return this.findOne(financingId);
  }

  /**
   * Atualiza a taxa mensal (% a.m.) e regera todas as parcelas PREVISTO com o saldo atual e o novo juro.
   * Parcelas já PAGO permanecem inalteradas.
   */
  async repriceWithNewRate(financingId: string, monthlyRate: number) {
    await this.findOne(financingId);
    await this.prisma.financing.update({
      where: { id: financingId },
      data: { monthlyRate } as never,
    });
    return this.regenerateFutureInstallments(financingId);
  }

  async update(id: string, dto: UpdateFinancingDto) {
    await this.findOne(id);
    const financialEntityId =
      dto.financialEntityId === undefined
        ? undefined
        : dto.financialEntityId === ''
          ? null
          : dto.financialEntityId;
    const updated = await this.prisma.financing.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.creditor !== undefined ? { creditor: dto.creditor } : {}),
        ...(financialEntityId !== undefined ? { financialEntityId } : {}),
        ...(dto.kind !== undefined ? { kind: dto.kind } : {}),
        ...(dto.insuranceTotalPremium !== undefined
          ? { insuranceTotalPremium: dto.insuranceTotalPremium }
          : {}),
      } as never,
      include: { installments: { orderBy: { number: 'asc' } } },
    });
    if (!updated.financialEntityId) {
      await this.removePrevistoExpensesForFinancingInstallments(id);
    }
    if (typeof financialEntityId === 'string' && financialEntityId) {
      const instIds = updated.installments.map((i) => i.id);
      if (instIds.length) {
        await this.prisma.expense.updateMany({
          where: { financingInstallmentId: { in: instIds } } as never,
          data: { financialEntityId },
        });
      }
      await this.syncExpensesForFinancing(id);
    }
    return updated;
  }
}
