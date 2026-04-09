import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContractDto, UpdateContractDto } from './dto/contract.dto';

@Injectable()
export class ContractService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.contract.findMany({ orderBy: { clientName: 'asc' } });
  }

  async findOne(id: string) {
    const c = await this.prisma.contract.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Contrato não encontrado');
    return c;
  }

  create(dto: CreateContractDto) {
    return this.prisma.contract.create({
      data: {
        clientName: dto.clientName,
        monthlyGross: dto.monthlyGross,
        estimatedTax: dto.estimatedTax ?? 0,
        estimatedOpCost: dto.estimatedOpCost ?? 0,
        estimatedNet: dto.estimatedNet ?? 0,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        recurrence: dto.recurrence,
        status: dto.status,
        notes: dto.notes,
      },
    });
  }

  async update(id: string, dto: UpdateContractDto) {
    await this.findOne(id);
    return this.prisma.contract.update({
      where: { id },
      data: {
        ...dto,
        startDate:
          dto.startDate === undefined
            ? undefined
            : dto.startDate
              ? new Date(dto.startDate)
              : null,
        endDate:
          dto.endDate === undefined ? undefined : dto.endDate ? new Date(dto.endDate) : null,
      },
    });
  }
}
