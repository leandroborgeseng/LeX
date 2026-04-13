import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  RecurrenceFrequency,
  RevenueStatus,
  RevenueType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  DEFAULT_FUTURE_OCCURRENCES,
  nextCompetence,
} from '../common/utils/recurrence.util';
import { CreateRevenueDto, UpdateRevenueDto } from './dto/revenue.dto';

@Injectable()
export class RevenueService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: {
    entityId?: string;
    from?: string;
    to?: string;
    status?: RevenueStatus;
    payerSourceId?: string;
    categoryId?: string;
    accountId?: string;
    q?: string;
  }) {
    const q = filters.q?.trim();
    return this.prisma.revenue.findMany({
      where: {
        financialEntityId: filters.entityId,
        status: filters.status,
        payerSourceId: filters.payerSourceId,
        categoryId: filters.categoryId,
        destinationAccountId: filters.accountId,
        ...(q ? { description: { contains: q } } : {}),
        competenceDate: {
          gte: filters.from ? new Date(filters.from) : undefined,
          lte: filters.to ? new Date(filters.to) : undefined,
        },
      },
      orderBy: { competenceDate: 'desc' },
      include: {
        category: true,
        payerSource: true,
        financialEntity: true,
        destinationAccount: true,
      },
    });
  }

  async findOne(id: string) {
    const r = await this.prisma.revenue.findUnique({
      where: { id },
      include: {
        category: true,
        payerSource: true,
        financialEntity: true,
        destinationAccount: true,
      },
    });
    if (!r) throw new NotFoundException('Receita não encontrada');
    return r;
  }

  private baseData(dto: CreateRevenueDto, overrides?: Partial<CreateRevenueDto>) {
    const d = { ...dto, ...overrides };
    return {
      financialEntityId: d.financialEntityId,
      description: d.description,
      type: d.type,
      categoryId: d.categoryId,
      payerSourceId: d.payerSourceId,
      grossAmount: d.grossAmount,
      taxDiscount: d.taxDiscount ?? 0,
      netAmount: d.netAmount,
      competenceDate: new Date(d.competenceDate),
      dueDate: new Date(d.dueDate),
      receivedAt: d.receivedAt ? new Date(d.receivedAt) : null,
      destinationAccountId: d.destinationAccountId,
      status: d.status ?? RevenueStatus.PREVISTO,
      notes: d.notes,
      isRecurringTemplate: d.isRecurringTemplate ?? false,
      recurrenceFrequency: d.recurrenceFrequency,
      recurrenceEndDate: d.recurrenceEndDate ? new Date(d.recurrenceEndDate) : null,
    };
  }

  async create(dto: CreateRevenueDto) {
    const shouldGenerate =
      dto.type === RevenueType.RECORRENTE &&
      !!dto.recurrenceFrequency &&
      (dto.futureOccurrences ?? DEFAULT_FUTURE_OCCURRENCES) > 0;

    const parent = await this.prisma.revenue.create({
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

      for (let i = 1; i <= n; i++) {
        const comp = nextCompetence(baseComp, i, freq);
        const due = nextCompetence(baseDue, i, freq);
        if (end && comp > end) break;
        await this.prisma.revenue.create({
          data: {
            ...this.baseData(dto, {
              competenceDate: comp.toISOString(),
              dueDate: due.toISOString(),
              receivedAt: undefined,
              status: RevenueStatus.PREVISTO,
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

  async update(id: string, dto: UpdateRevenueDto) {
    const current = await this.findOne(id);
    const linkedCdbId = (current as { cdbApplicationId?: string | null }).cdbApplicationId;
    if (
      linkedCdbId &&
      dto.status === RevenueStatus.PREVISTO &&
      current.status === RevenueStatus.RECEBIDO
    ) {
      throw new BadRequestException(
        'Esta receita está ligada a um CDB com projeção recorrente já marcada como recebida; não volte o status para PREVISTO.',
      );
    }

    let receivedAt: Date | null | undefined = undefined;
    if (dto.receivedAt !== undefined) {
      receivedAt = dto.receivedAt ? new Date(dto.receivedAt) : null;
    } else if (dto.status !== undefined) {
      if (dto.status === RevenueStatus.RECEBIDO && current.status !== RevenueStatus.RECEBIDO) {
        receivedAt = new Date();
      } else if (current.status === RevenueStatus.RECEBIDO && dto.status !== RevenueStatus.RECEBIDO) {
        receivedAt = null;
      }
    }

    const { competenceDate, dueDate, receivedAt: _ignoredReceived, ...rest } = dto;

    return this.prisma.revenue.update({
      where: { id },
      data: {
        ...rest,
        competenceDate: competenceDate ? new Date(competenceDate) : undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        ...(receivedAt !== undefined ? { receivedAt } : {}),
      },
    });
  }

  async regenerateFuture(templateId: string) {
    const template = await this.findOne(templateId);
    if (!template.isRecurringTemplate) {
      throw new NotFoundException('Registro não é template de recorrência');
    }
    const freq = template.recurrenceFrequency;
    if (!freq) return template;

    await this.prisma.revenue.deleteMany({
      where: {
        recurringParentId: templateId,
        status: RevenueStatus.PREVISTO,
      },
    });

    const n = DEFAULT_FUTURE_OCCURRENCES;
    const baseComp = new Date(template.competenceDate);
    const baseDue = new Date(template.dueDate);
    const end = template.recurrenceEndDate;

    const gross = Number(template.grossAmount);
    const tax = Number(template.taxDiscount);
    const net = Number(template.netAmount);

    for (let i = 1; i <= n; i++) {
      const comp = nextCompetence(baseComp, i, freq);
      const due = nextCompetence(baseDue, i, freq);
      if (end && comp > end) break;
      await this.prisma.revenue.create({
        data: {
          financialEntityId: template.financialEntityId,
          description: template.description,
          type: template.type,
          categoryId: template.categoryId,
          payerSourceId: template.payerSourceId,
          grossAmount: gross,
          taxDiscount: tax,
          netAmount: net,
          competenceDate: comp,
          dueDate: due,
          destinationAccountId: template.destinationAccountId,
          status: RevenueStatus.PREVISTO,
          notes: template.notes,
          isRecurringTemplate: false,
          recurringParentId: templateId,
        },
      });
    }

    return this.findOne(templateId);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.revenue.delete({ where: { id } });
  }
}
