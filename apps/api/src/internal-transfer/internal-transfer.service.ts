import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInternalTransferDto, UpdateInternalTransferDto } from './dto/internal-transfer.dto';

@Injectable()
export class InternalTransferService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(from?: string, to?: string) {
    return this.prisma.internalTransfer.findMany({
      where:
        from || to
          ? {
              date: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : undefined,
      orderBy: { date: 'desc' },
      include: { fromEntity: true, toEntity: true, fromAccount: true, toAccount: true },
    });
  }

  async findOne(id: string) {
    const t = await this.prisma.internalTransfer.findUnique({
      where: { id },
      include: { fromEntity: true, toEntity: true, fromAccount: true, toAccount: true },
    });
    if (!t) throw new NotFoundException('Transferência não encontrada');
    return t;
  }

  create(dto: CreateInternalTransferDto) {
    return this.prisma.internalTransfer.create({
      data: {
        type: dto.type,
        amount: dto.amount,
        date: new Date(dto.date),
        description: dto.description,
        fromEntityId: dto.fromEntityId,
        toEntityId: dto.toEntityId,
        fromAccountId: dto.fromAccountId,
        toAccountId: dto.toAccountId,
      },
    });
  }

  async update(id: string, dto: UpdateInternalTransferDto) {
    await this.findOne(id);
    return this.prisma.internalTransfer.update({
      where: { id },
      data: {
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
        ...(dto.date !== undefined ? { date: new Date(dto.date) } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.fromEntityId !== undefined ? { fromEntityId: dto.fromEntityId } : {}),
        ...(dto.toEntityId !== undefined ? { toEntityId: dto.toEntityId } : {}),
        ...(dto.fromAccountId !== undefined ? { fromAccountId: dto.fromAccountId } : {}),
        ...(dto.toAccountId !== undefined ? { toAccountId: dto.toAccountId } : {}),
      },
      include: { fromEntity: true, toEntity: true, fromAccount: true, toAccount: true },
    });
  }
}
