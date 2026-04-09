import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCdbApplicationDto, UpdateCdbApplicationDto } from './dto/cdb-application.dto';
import { projectCdbPortfolio } from './cdb-math.util';

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

  create(dto: CreateCdbApplicationDto) {
    return this.prisma.cdbApplication.create({
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
      },
      include: { financialEntity: { select: { id: true, name: true, type: true } } },
    });
  }

  async update(id: string, dto: UpdateCdbApplicationDto) {
    await this.findOne(id);
    return this.prisma.cdbApplication.update({
      where: { id },
      data: {
        financialEntityId: dto.financialEntityId === undefined ? undefined : dto.financialEntityId,
        name: dto.name,
        institution: dto.institution === undefined ? undefined : dto.institution,
        principal: dto.principal,
        applicationDate: dto.applicationDate ? new Date(dto.applicationDate) : undefined,
        maturityDate:
          dto.maturityDate === undefined ? undefined : dto.maturityDate ? new Date(dto.maturityDate) : null,
        indexerPercentOfCdi: dto.indexerPercentOfCdi,
        assumedCdiAnnualPercent: dto.assumedCdiAnnualPercent,
        active: dto.active,
        notes: dto.notes === undefined ? undefined : dto.notes,
      },
      include: { financialEntity: { select: { id: true, name: true, type: true } } },
    });
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
