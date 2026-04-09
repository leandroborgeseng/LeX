import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCreditCardDto, UpdateCreditCardDto } from './dto/credit-card.dto';

@Injectable()
export class CreditCardService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(entityId?: string) {
    return this.prisma.creditCard.findMany({
      where: entityId ? { financialEntityId: entityId } : undefined,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const c = await this.prisma.creditCard.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Cartão não encontrado');
    return c;
  }

  async currentInvoiceSummary(cardId: string) {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const inv = await this.prisma.creditCardInvoice.findUnique({
      where: { creditCardId_year_month: { creditCardId: cardId, year: y, month: m } },
      include: { transactions: true },
    });
    const total = inv?.transactions.reduce((s, t) => s + Number(t.amount), 0) ?? 0;
    return { year: y, month: m, invoice: inv, total };
  }

  create(dto: CreateCreditCardDto) {
    return this.prisma.creditCard.create({
      data: {
        financialEntityId: dto.financialEntityId,
        name: dto.name,
        bank: dto.bank,
        limitAmount: dto.limitAmount,
        closingDay: dto.closingDay,
        dueDay: dto.dueDay,
        active: dto.active ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateCreditCardDto) {
    await this.findOne(id);
    return this.prisma.creditCard.update({ where: { id }, data: dto });
  }
}
