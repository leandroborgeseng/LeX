import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardService } from '../dashboard/dashboard.service';
import { CdbApplicationService } from '../cdb-application/cdb-application.service';
import { CreateFinancialHistorySnapshotDto } from './dto/financial-history.dto';

@Injectable()
export class FinancialHistoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dashboard: DashboardService,
    private readonly cdb: CdbApplicationService,
  ) {}

  async create(dto: CreateFinancialHistorySnapshotDto) {
    const entityIdRaw =
      dto.financialEntityId === undefined || dto.financialEntityId === ''
        ? undefined
        : dto.financialEntityId;
    const entityId = entityIdRaw ?? undefined;
    const referenceDate = dto.referenceDate ? new Date(dto.referenceDate) : new Date();

    const summary = await this.dashboard.summary(entityId);
    const payload = JSON.parse(JSON.stringify(summary)) as Record<string, unknown>;
    const cdbProj = await this.cdb.projection(5, entityId);
    const months = cdbProj.months ?? [];
    const last = months.length ? months[months.length - 1] : null;
    payload._cdbProjectionMeta = {
      methodology: cdbProj.methodology,
      applicationCount: cdbProj.summary.applicationCount,
      totalPrincipalNow: cdbProj.summary.totalPrincipalNow,
      lastMonthLabel: last?.month,
      lastMonthTotalNet: last != null ? Number((last as { totalNet?: unknown }).totalNet) : null,
    };

    const consolidated = summary.patrimonyTotal.consolidated;
    const resYr = summary.resultYear.consolidated;
    const finOut = summary.financingOutstanding;
    const cdbPri = cdbProj.summary.totalPrincipalNow;
    const cdbNet = last != null ? Number((last as { totalNet?: unknown }).totalNet) : null;

    return this.prisma.financialHistorySnapshot.create({
      data: {
        referenceDate,
        financialEntityId: entityId ?? null,
        note: dto.note?.trim() ? dto.note.trim() : null,
        consolidatedBalance: consolidated,
        resultYearConsolidated: resYr,
        financingOutstanding: finOut,
        cdbPrincipalSum: cdbPri,
        cdbProjectedNet5y: cdbNet ?? undefined,
        payload: payload as Prisma.InputJsonValue,
      },
      include: { financialEntity: { select: { id: true, name: true, type: true } } },
    });
  }

  findAll(filters: { entityId?: string; from?: string; to?: string }) {
    return this.prisma.financialHistorySnapshot.findMany({
      where: {
        financialEntityId: filters.entityId || undefined,
        referenceDate: {
          gte: filters.from ? new Date(filters.from) : undefined,
          lte: filters.to ? new Date(filters.to) : undefined,
        },
      },
      orderBy: [{ referenceDate: 'desc' }, { createdAt: 'desc' }],
      include: { financialEntity: { select: { id: true, name: true, type: true } } },
    });
  }

  async findOne(id: string) {
    const row = await this.prisma.financialHistorySnapshot.findUnique({
      where: { id },
      include: { financialEntity: { select: { id: true, name: true, type: true } } },
    });
    if (!row) throw new NotFoundException('Instantâneo não encontrado');
    return row;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.financialHistorySnapshot.delete({ where: { id } });
  }
}
