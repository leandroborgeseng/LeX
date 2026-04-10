import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdatePayerSourceDto } from './dto/payer.dto';

@Injectable()
export class PayerSourceService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.payerSource.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string) {
    const p = await this.prisma.payerSource.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Fonte pagadora não encontrada');
    return p;
  }

  create(data: { name: string }) {
    return this.prisma.payerSource.create({ data });
  }

  async update(id: string, dto: UpdatePayerSourceDto) {
    await this.findOne(id);
    return this.prisma.payerSource.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
      },
    });
  }
}
