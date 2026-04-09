import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFinancialEntityDto, UpdateFinancialEntityDto } from './dto/create-financial-entity.dto';

@Injectable()
export class FinancialEntityService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.financialEntity.findMany({ orderBy: { type: 'asc' } });
  }

  async findOne(id: string) {
    const e = await this.prisma.financialEntity.findUnique({ where: { id } });
    if (!e) throw new NotFoundException('Entidade não encontrada');
    return e;
  }

  create(dto: CreateFinancialEntityDto) {
    return this.prisma.financialEntity.create({ data: dto });
  }

  async update(id: string, dto: UpdateFinancialEntityDto) {
    await this.findOne(id);
    return this.prisma.financialEntity.update({ where: { id }, data: dto });
  }
}
