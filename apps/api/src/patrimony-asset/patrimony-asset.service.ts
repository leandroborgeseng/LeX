import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePatrimonyAssetDto, UpdatePatrimonyAssetDto } from './dto/patrimony-asset.dto';

@Injectable()
export class PatrimonyAssetService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(financialEntityId?: string) {
    return this.prisma.patrimonyAsset.findMany({
      where: financialEntityId ? { financialEntityId } : {},
      orderBy: [{ financialEntityId: 'asc' }, { kind: 'asc' }, { name: 'asc' }],
      include: { financialEntity: { select: { id: true, name: true, type: true } } },
    });
  }

  async findOne(id: string) {
    const row = await this.prisma.patrimonyAsset.findUnique({
      where: { id },
      include: { financialEntity: { select: { id: true, name: true, type: true } } },
    });
    if (!row) throw new NotFoundException('Bem não encontrado');
    return row;
  }

  async create(dto: CreatePatrimonyAssetDto) {
    const entity = await this.prisma.financialEntity.findUnique({
      where: { id: dto.financialEntityId },
    });
    if (!entity) throw new NotFoundException('Entidade não encontrada');
    return this.prisma.patrimonyAsset.create({
      data: {
        financialEntityId: dto.financialEntityId,
        kind: dto.kind,
        name: dto.name.trim(),
        estimatedValue: dto.estimatedValue,
        acquisitionDate: dto.acquisitionDate ? new Date(dto.acquisitionDate) : null,
        notes: dto.notes?.trim() ? dto.notes.trim() : null,
        active: dto.active ?? true,
      },
      include: { financialEntity: { select: { id: true, name: true, type: true } } },
    });
  }

  async update(id: string, dto: UpdatePatrimonyAssetDto) {
    await this.findOne(id);
    if (dto.financialEntityId) {
      const entity = await this.prisma.financialEntity.findUnique({
        where: { id: dto.financialEntityId },
      });
      if (!entity) throw new NotFoundException('Entidade não encontrada');
    }
    return this.prisma.patrimonyAsset.update({
      where: { id },
      data: {
        ...(dto.financialEntityId !== undefined ? { financialEntityId: dto.financialEntityId } : {}),
        ...(dto.kind !== undefined ? { kind: dto.kind } : {}),
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.estimatedValue !== undefined ? { estimatedValue: dto.estimatedValue } : {}),
        ...(dto.acquisitionDate !== undefined
          ? { acquisitionDate: dto.acquisitionDate ? new Date(dto.acquisitionDate) : null }
          : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes?.trim() ? dto.notes.trim() : null } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
      include: { financialEntity: { select: { id: true, name: true, type: true } } },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.patrimonyAsset.delete({ where: { id } });
  }
}
