import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInternalTransferDto } from './dto/internal-transfer.dto';

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
}
