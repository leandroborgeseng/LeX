import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ExpenseStatus,
  ExpenseType,
  PaymentMethod,
  RecurrenceFrequency,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FinancingService } from '../financing/financing.service';
import {
  DEFAULT_FUTURE_OCCURRENCES,
  nextCompetence,
} from '../common/utils/recurrence.util';
import { CreateExpenseDto, UpdateExpenseDto } from './dto/expense.dto';

@Injectable()
export class ExpenseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly financing: FinancingService,
  ) {}

  async findAll(filters: {
    entityId?: string;
    from?: string;
    to?: string;
    status?: ExpenseStatus;
    categoryId?: string;
    originatorId?: string;
    accountId?: string;
    cardId?: string;
    paymentMethod?: PaymentMethod;
    q?: string;
  }) {
    const q = filters.q?.trim();
    return this.prisma.expense.findMany({
      where: {
        financialEntityId: filters.entityId,
        status: filters.status,
        categoryId: filters.categoryId,
        originatorId: filters.originatorId,
        bankAccountId: filters.accountId,
        creditCardId: filters.cardId,
        paymentMethod: filters.paymentMethod,
        ...(q ? { description: { contains: q } } : {}),
        competenceDate: {
          gte: filters.from ? new Date(filters.from) : undefined,
          lte: filters.to ? new Date(filters.to) : undefined,
        },
      },
      orderBy: { competenceDate: 'desc' },
      include: {
        category: true,
        originator: true,
        financialEntity: true,
        bankAccount: true,
        creditCard: true,
      },
    });
  }

  async findOne(id: string) {
    const e = await this.prisma.expense.findUnique({
      where: { id },
      include: {
        category: true,
        originator: true,
        financialEntity: true,
        bankAccount: true,
        creditCard: true,
      },
    });
    if (!e) throw new NotFoundException('Despesa não encontrada');
    return e;
  }

  private baseData(dto: CreateExpenseDto, overrides?: Partial<CreateExpenseDto>) {
    const d = { ...dto, ...overrides };
    return {
      financialEntityId: d.financialEntityId,
      description: d.description,
      type: d.type,
      categoryId: d.categoryId,
      subcategoryLabel: d.subcategoryLabel,
      originatorId: d.originatorId,
      amount: d.amount,
      competenceDate: new Date(d.competenceDate),
      dueDate: new Date(d.dueDate),
      paidAt: d.paidAt ? new Date(d.paidAt) : null,
      status: d.status ?? ExpenseStatus.PREVISTO,
      paymentMethod: d.paymentMethod,
      bankAccountId: d.bankAccountId,
      creditCardId: d.creditCardId,
      mandatory: d.mandatory ?? true,
      notes: d.notes,
      isRecurringTemplate: d.isRecurringTemplate ?? false,
      recurrenceFrequency: d.recurrenceFrequency,
      recurrenceEndDate: d.recurrenceEndDate ? new Date(d.recurrenceEndDate) : null,
    };
  }

  async create(dto: CreateExpenseDto) {
    const shouldGenerate =
      dto.type === ExpenseType.RECORRENTE &&
      !!dto.recurrenceFrequency &&
      (dto.futureOccurrences ?? DEFAULT_FUTURE_OCCURRENCES) > 0;

    const parent = await this.prisma.expense.create({
      data: {
        ...this.baseData(dto),
        isRecurringTemplate: shouldGenerate || !!dto.isRecurringTemplate,
        recurringParentId: null,
      },
    });

    if (shouldGenerate) {
      const n = dto.futureOccurrences ?? DEFAULT_FUTURE_OCCURRENCES;
      const freq = dto.recurrenceFrequency as RecurrenceFrequency;
      const baseComp = new Date(dto.competenceDate);
      const baseDue = new Date(dto.dueDate);
      const end = dto.recurrenceEndDate ? new Date(dto.recurrenceEndDate) : null;
      const amt = Number(dto.amount);

      for (let i = 1; i <= n; i++) {
        const comp = nextCompetence(baseComp, i, freq);
        const due = nextCompetence(baseDue, i, freq);
        if (end && comp > end) break;
        await this.prisma.expense.create({
          data: {
            ...this.baseData(dto, {
              competenceDate: comp.toISOString(),
              dueDate: due.toISOString(),
              paidAt: undefined,
              status: ExpenseStatus.PREVISTO,
              amount: amt,
            }),
            isRecurringTemplate: false,
            recurrenceFrequency: null,
            recurrenceEndDate: null,
            recurringParentId: parent.id,
          },
        });
      }
    }

    return this.findOne(parent.id);
  }

  async update(id: string, dto: UpdateExpenseDto) {
    const current = await this.findOne(id);
    const linkedInstId = (current as { financingInstallmentId?: string | null }).financingInstallmentId;
    if (
      linkedInstId &&
      dto.status === ExpenseStatus.PREVISTO &&
      current.status === ExpenseStatus.PAGO
    ) {
      throw new BadRequestException(
        'Esta despesa está ligada a uma parcela de financiamento já quitada; não volte o status para PREVISTO.',
      );
    }

    let paidAt: Date | null | undefined = undefined;
    if (dto.paidAt !== undefined) {
      paidAt = dto.paidAt ? new Date(dto.paidAt) : null;
    } else if (dto.status !== undefined) {
      if (dto.status === ExpenseStatus.PAGO && current.status !== ExpenseStatus.PAGO) {
        paidAt = new Date();
      } else if (current.status === ExpenseStatus.PAGO && dto.status !== ExpenseStatus.PAGO) {
        paidAt = null;
      }
    }

    const { competenceDate, dueDate, paidAt: _ignoredPaid, ...rest } = dto;

    const updated = await this.prisma.expense.update({
      where: { id },
      data: {
        ...rest,
        competenceDate: competenceDate ? new Date(competenceDate) : undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        ...(paidAt !== undefined ? { paidAt } : {}),
      },
    });

    const linkId = (updated as { financingInstallmentId?: string | null }).financingInstallmentId;
    if (
      linkId &&
      updated.status === ExpenseStatus.PAGO &&
      current.status !== ExpenseStatus.PAGO
    ) {
      await this.financing.markInstallmentPaidFromLinkedExpense(
        linkId,
        updated.paidAt ?? new Date(),
      );
    }

    return this.findOne(id);
  }

  async regenerateFuture(templateId: string) {
    const template = await this.findOne(templateId);
    if (!template.isRecurringTemplate) {
      throw new NotFoundException('Registro não é template de recorrência');
    }
    const freq = template.recurrenceFrequency;
    if (!freq) return template;

    await this.prisma.expense.deleteMany({
      where: {
        recurringParentId: templateId,
        status: ExpenseStatus.PREVISTO,
      },
    });

    const n = DEFAULT_FUTURE_OCCURRENCES;
    const baseComp = new Date(template.competenceDate);
    const baseDue = new Date(template.dueDate);
    const end = template.recurrenceEndDate;
    const amt = Number(template.amount);

    for (let i = 1; i <= n; i++) {
      const comp = nextCompetence(baseComp, i, freq);
      const due = nextCompetence(baseDue, i, freq);
      if (end && comp > end) break;
      await this.prisma.expense.create({
        data: {
          financialEntityId: template.financialEntityId,
          description: template.description,
          type: template.type,
          categoryId: template.categoryId,
          subcategoryLabel: template.subcategoryLabel,
          originatorId: template.originatorId,
          amount: amt,
          competenceDate: comp,
          dueDate: due,
          status: ExpenseStatus.PREVISTO,
          paymentMethod: template.paymentMethod,
          bankAccountId: template.bankAccountId,
          creditCardId: template.creditCardId,
          mandatory: template.mandatory,
          notes: template.notes,
          isRecurringTemplate: false,
          recurringParentId: templateId,
        },
      });
    }

    return this.findOne(templateId);
  }
}
