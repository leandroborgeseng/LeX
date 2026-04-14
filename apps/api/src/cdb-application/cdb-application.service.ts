import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CategoryKind,
  ExpenseStatus,
  ExpenseType,
  PaymentMethod,
  RevenueStatus,
  RevenueType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCdbApplicationDto, UpdateCdbApplicationDto } from './dto/cdb-application.dto';
import { monthlyCdbAccrualSchedule, projectCdbPortfolio } from './cdb-math.util';

const CDB_REVENUE_CATEGORY = 'Rendimentos CDB';
const CDB_APORTE_CATEGORY = 'Aportes CDB';
const CDB_APORTE_NOTES = 'Lançamento automático (CDB aporte mensal).';

@Injectable()
export class CdbApplicationService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(entityId?: string) {
    return this.prisma.cdbApplication.findMany({
      where: {
        ...(entityId ? { financialEntityId: entityId } : {}),
      },
      orderBy: { applicationDate: 'desc' },
      include: { financialEntity: { select: { id: true, name: true, type: true } } },
    });
  }

  async findOne(id: string) {
    const row = await this.prisma.cdbApplication.findUnique({
      where: { id },
      include: { financialEntity: { select: { id: true, name: true, type: true } } },
    });
    if (!row) throw new NotFoundException('Aplicação não encontrada');
    return row;
  }

  private async resolveCdbRevenueCategoryId(): Promise<string> {
    const c = await this.prisma.category.upsert({
      where: {
        name_kind: { name: CDB_REVENUE_CATEGORY, kind: CategoryKind.REVENUE },
      },
      update: {},
      create: { name: CDB_REVENUE_CATEGORY, kind: CategoryKind.REVENUE },
    });
    return c.id;
  }

  private async resolveCdbAporteCategoryId(): Promise<string> {
    const c = await this.prisma.category.upsert({
      where: {
        name_kind: { name: CDB_APORTE_CATEGORY, kind: CategoryKind.EXPENSE },
      },
      update: {},
      create: { name: CDB_APORTE_CATEGORY, kind: CategoryKind.EXPENSE },
    });
    return c.id;
  }

  private async removePrevistoCdbLinkedAporteExpenses(cdbApplicationId: string) {
    await this.prisma.expense.deleteMany({
      where: {
        cdbApplicationId,
        cdbAporteYear: { not: null },
        status: ExpenseStatus.PREVISTO,
      },
    });
  }

  /**
   * Despesas PREVISTO de aporte mensal (mesmo calendário das receitas de acréscimo), quando `monthlyAporteAmount` > 0.
   */
  async syncAporteExpensesForCdbApplication(id: string) {
    const row = await this.findOne(id);
    const aporte = Number(row.monthlyAporteAmount ?? 0);
    if (!row.recurrenceEnabled || !row.active || !row.financialEntityId || aporte <= 0) {
      await this.removePrevistoCdbLinkedAporteExpenses(id);
      return this.findOne(id);
    }

    const horizon = Math.min(
      120,
      Math.max(1, Math.round(Number(row.revenueSyncHorizonMonths) || 36)),
    );
    const schedule = monthlyCdbAccrualSchedule(
      {
        principal: Number(row.principal),
        applicationDate: row.applicationDate,
        maturityDate: row.maturityDate,
        indexerPercentOfCdi: Number(row.indexerPercentOfCdi),
        assumedCdiAnnualPercent: Number(row.assumedCdiAnnualPercent),
      },
      horizon,
      row.recurrenceEndDate,
    );

    const categoryId = await this.resolveCdbAporteCategoryId();
    await this.removePrevistoCdbLinkedAporteExpenses(id);

    for (const m of schedule) {
      const existing = await this.prisma.expense.findFirst({
        where: {
          cdbApplicationId: id,
          cdbAporteYear: m.accrualYear,
          cdbAporteMonth: m.accrualMonth,
        },
      });
      if (existing?.status === ExpenseStatus.PAGO) continue;

      const label = `${m.accrualYear}-${String(m.accrualMonth).padStart(2, '0')}`;
      const description = `CDB: ${row.name} · ${label} (aporte mensal)`;

      if (existing) {
        await this.prisma.expense.update({
          where: { id: existing.id },
          data: {
            amount: aporte,
            competenceDate: m.competenceDate,
            dueDate: m.dueDate,
            description,
            categoryId,
          },
        });
        continue;
      }

      await this.prisma.expense.create({
        data: {
          financialEntityId: row.financialEntityId,
          description,
          type: ExpenseType.ESPORADICA,
          categoryId,
          amount: aporte,
          competenceDate: m.competenceDate,
          dueDate: m.dueDate,
          status: ExpenseStatus.PREVISTO,
          paymentMethod: PaymentMethod.TRANSFERENCIA,
          cdbApplicationId: id,
          cdbAporteYear: m.accrualYear,
          cdbAporteMonth: m.accrualMonth,
          notes: CDB_APORTE_NOTES,
        },
      });
    }

    return this.findOne(id);
  }

  private async removePrevistoCdbLinkedRevenues(cdbApplicationId: string) {
    await this.prisma.revenue.deleteMany({
      where: { cdbApplicationId, status: RevenueStatus.PREVISTO },
    });
  }

  /**
   * Materializa receitas PREVISTO (acréscimo mensal estimado) para a DRE.
   * Exige entidade financeira, recorrência ativa e aplicação ativa.
   */
  async syncRevenuesForCdbApplication(id: string) {
    const row = await this.findOne(id);
    if (!row.recurrenceEnabled || !row.active || !row.financialEntityId) {
      await this.removePrevistoCdbLinkedRevenues(id);
      return this.findOne(id);
    }

    const horizon = Math.min(
      120,
      Math.max(1, Math.round(Number(row.revenueSyncHorizonMonths) || 36)),
    );
    const schedule = monthlyCdbAccrualSchedule(
      {
        principal: Number(row.principal),
        applicationDate: row.applicationDate,
        maturityDate: row.maturityDate,
        indexerPercentOfCdi: Number(row.indexerPercentOfCdi),
        assumedCdiAnnualPercent: Number(row.assumedCdiAnnualPercent),
      },
      horizon,
      row.recurrenceEndDate,
    );

    const categoryId = await this.resolveCdbRevenueCategoryId();
    await this.removePrevistoCdbLinkedRevenues(id);

    for (const m of schedule) {
      const existing = await this.prisma.revenue.findUnique({
        where: {
          cdbApplicationId_cdbAccrualYear_cdbAccrualMonth: {
            cdbApplicationId: id,
            cdbAccrualYear: m.accrualYear,
            cdbAccrualMonth: m.accrualMonth,
          },
        },
      });
      if (existing?.status === RevenueStatus.RECEBIDO) continue;

      const label = `${m.accrualYear}-${String(m.accrualMonth).padStart(2, '0')}`;
      const description = `CDB: ${row.name} · ${label} (estimado)`;
      const gross = m.incrementalGross;
      const tax = m.incrementalIr;
      const net = m.incrementalNet;
      const competenceDate = m.competenceDate;
      const dueDate = m.dueDate;
      const notes = `Lançamento automático (CDB). Modelo: acréscimo patrimonial líquido no mês.`;

      await this.prisma.revenue.create({
        data: {
          financialEntityId: row.financialEntityId,
          description,
          type: RevenueType.ESPORADICA,
          categoryId,
          grossAmount: gross,
          taxDiscount: tax,
          netAmount: net,
          competenceDate,
          dueDate,
          status: RevenueStatus.PREVISTO,
          notes,
          cdbApplicationId: id,
          cdbAccrualYear: m.accrualYear,
          cdbAccrualMonth: m.accrualMonth,
        },
      });
    }

    return this.findOne(id);
  }

  private async afterWrite(id: string) {
    const row = await this.findOne(id);
    if (row.recurrenceEnabled && row.active && row.financialEntityId) {
      await this.syncRevenuesForCdbApplication(id);
    } else {
      await this.removePrevistoCdbLinkedRevenues(id);
    }
    await this.syncAporteExpensesForCdbApplication(id);
    return this.findOne(id);
  }

  create(dto: CreateCdbApplicationDto) {
    if ((dto.recurrenceEnabled ?? false) && !dto.financialEntityId?.trim()) {
      throw new BadRequestException(
        'Para lançar receitas recorrentes na DRE, informe a entidade financeira da aplicação.',
      );
    }
    const aporte = dto.monthlyAporteAmount ?? 0;
    if (aporte > 0 && !dto.financialEntityId?.trim()) {
      throw new BadRequestException(
        'Para lançar aportes mensais como despesa, informe a entidade financeira da aplicação.',
      );
    }
    return this.prisma.cdbApplication
      .create({
        data: {
          financialEntityId: dto.financialEntityId,
          name: dto.name,
          institution: dto.institution,
          principal: dto.principal,
          applicationDate: new Date(dto.applicationDate),
          maturityDate: dto.maturityDate ? new Date(dto.maturityDate) : null,
          indexerPercentOfCdi: dto.indexerPercentOfCdi,
          assumedCdiAnnualPercent: dto.assumedCdiAnnualPercent ?? 10.5,
          active: dto.active ?? true,
          notes: dto.notes,
          recurrenceEnabled: dto.recurrenceEnabled ?? false,
          recurrenceEndDate: dto.recurrenceEndDate ? new Date(dto.recurrenceEndDate) : null,
          revenueSyncHorizonMonths: dto.revenueSyncHorizonMonths ?? 36,
          monthlyAporteAmount: aporte,
        },
        include: { financialEntity: { select: { id: true, name: true, type: true } } },
      })
      .then((created) => this.afterWrite(created.id));
  }

  async update(id: string, dto: UpdateCdbApplicationDto) {
    await this.findOne(id);
    const financialEntityId =
      dto.financialEntityId === undefined
        ? undefined
        : dto.financialEntityId === ''
          ? null
          : dto.financialEntityId;

    if (dto.recurrenceEnabled === true && financialEntityId === null) {
      throw new BadRequestException(
        'Para lançar receitas recorrentes na DRE, informe a entidade financeira da aplicação.',
      );
    }
    if (dto.recurrenceEnabled === true && financialEntityId === undefined) {
      const cur = await this.prisma.cdbApplication.findUnique({ where: { id } });
      if (!cur?.financialEntityId) {
        throw new BadRequestException(
          'Para lançar receitas recorrentes na DRE, informe a entidade financeira da aplicação.',
        );
      }
    }
    if (dto.monthlyAporteAmount !== undefined && dto.monthlyAporteAmount > 0) {
      const effEntity =
        financialEntityId !== undefined ? financialEntityId : (await this.findOne(id)).financialEntityId;
      if (!effEntity) {
        throw new BadRequestException(
          'Para lançar aportes mensais como despesa, informe a entidade financeira da aplicação.',
        );
      }
    }

    await this.prisma.cdbApplication.update({
      where: { id },
      data: {
        ...(financialEntityId !== undefined ? { financialEntityId } : {}),
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.institution !== undefined ? { institution: dto.institution } : {}),
        ...(dto.principal !== undefined ? { principal: dto.principal } : {}),
        ...(dto.applicationDate !== undefined
          ? { applicationDate: new Date(dto.applicationDate) }
          : {}),
        ...(dto.maturityDate !== undefined
          ? { maturityDate: dto.maturityDate ? new Date(dto.maturityDate) : null }
          : {}),
        ...(dto.indexerPercentOfCdi !== undefined
          ? { indexerPercentOfCdi: dto.indexerPercentOfCdi }
          : {}),
        ...(dto.assumedCdiAnnualPercent !== undefined
          ? { assumedCdiAnnualPercent: dto.assumedCdiAnnualPercent }
          : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        ...(dto.recurrenceEnabled !== undefined ? { recurrenceEnabled: dto.recurrenceEnabled } : {}),
        ...(dto.recurrenceEndDate !== undefined
          ? { recurrenceEndDate: dto.recurrenceEndDate ? new Date(dto.recurrenceEndDate) : null }
          : {}),
        ...(dto.revenueSyncHorizonMonths !== undefined
          ? {
              revenueSyncHorizonMonths: Math.min(
                120,
                Math.max(1, Math.round(dto.revenueSyncHorizonMonths)),
              ),
            }
          : {}),
        ...(dto.monthlyAporteAmount !== undefined
          ? { monthlyAporteAmount: Math.max(0, dto.monthlyAporteAmount) }
          : {}),
      },
      include: { financialEntity: { select: { id: true, name: true, type: true } } },
    });
    return this.afterWrite(id);
  }

  /** Projeção mês a mês (IR regressivo + % CDI). */
  async projection(years: number, entityId?: string) {
    const monthCount = Math.min(120, Math.max(1, Math.round(years * 12)));
    const list = await this.prisma.cdbApplication.findMany({
      where: {
        active: true,
        ...(entityId ? { financialEntityId: entityId } : {}),
      },
    });

    const apps = list.map((a) => ({
      id: a.id,
      name: a.name,
      principal: Number(a.principal),
      applicationDate: a.applicationDate,
      maturityDate: a.maturityDate,
      indexerPercentOfCdi: Number(a.indexerPercentOfCdi),
      assumedCdiAnnualPercent: Number(a.assumedCdiAnnualPercent),
    }));

    const { methodology, months } = projectCdbPortfolio(apps, monthCount);
    return {
      years,
      monthCount,
      methodology,
      summary: {
        applicationCount: apps.length,
        totalPrincipalNow: apps.reduce((s, a) => s + a.principal, 0),
      },
      months,
      lastMonth: months[months.length - 1],
    };
  }
}
