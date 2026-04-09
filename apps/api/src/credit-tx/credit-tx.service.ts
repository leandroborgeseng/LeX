import { Injectable, NotFoundException } from '@nestjs/common';
import { InvoiceStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { addMonths } from '../common/utils/date.util';
import { CreateCreditPurchaseDto } from './dto/credit-tx.dto';

@Injectable()
export class CreditTxService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureInvoice(creditCardId: string, year: number, month: number) {
    const card = await this.prisma.creditCard.findUnique({ where: { id: creditCardId } });
    if (!card) throw new NotFoundException('Cartão não encontrado');
    const closingDay = card.closingDay ?? 10;
    const dueDay = card.dueDay ?? 15;
    const closingDate = new Date(year, month - 1, closingDay);
    let dueDate = new Date(year, month - 1, dueDay);
    if (dueDate <= closingDate) {
      dueDate = addMonths(dueDate, 1);
    }
    return this.prisma.creditCardInvoice.upsert({
      where: {
        creditCardId_year_month: { creditCardId, year, month },
      },
      create: {
        creditCardId,
        year,
        month,
        closingDate,
        dueDate,
        status: InvoiceStatus.ABERTA,
      },
      update: {},
    });
  }

  async refreshInvoiceTotal(invoiceId: string) {
    const agg = await this.prisma.creditCardTransaction.aggregate({
      where: { invoiceId },
      _sum: { amount: true },
    });
    const total = Number(agg._sum.amount ?? 0);
    await this.prisma.creditCardInvoice.update({
      where: { id: invoiceId },
      data: { total },
    });
  }

  async createPurchase(dto: CreateCreditPurchaseDto) {
    const card = await this.prisma.creditCard.findUnique({ where: { id: dto.creditCardId } });
    if (!card) throw new NotFoundException('Cartão não encontrado');

    const installments = dto.installments ?? 1;
    const group = installments > 1 ? randomUUID() : null;
    const base = dto.competenceYear && dto.competenceMonth
      ? new Date(dto.competenceYear, dto.competenceMonth - 1, 1)
      : new Date(dto.purchaseDate);
    const per = Math.round((dto.amount / installments) * 100) / 100;
    const created: string[] = [];

    for (let i = 0; i < installments; i++) {
      const comp = addMonths(base, i);
      const y = comp.getFullYear();
      const m = comp.getMonth() + 1;
      const inv = await this.ensureInvoice(dto.creditCardId, y, m);
      const row = await this.prisma.creditCardTransaction.create({
        data: {
          creditCardId: dto.creditCardId,
          financialEntityId: dto.financialEntityId,
          invoiceId: inv.id,
          description: dto.description,
          amount: per,
          purchaseDate: new Date(dto.purchaseDate),
          categoryId: dto.categoryId,
          originatorId: dto.originatorId,
          installmentGroup: group,
          installmentNumber: i + 1,
          installmentTotal: installments,
          competenceYear: y,
          competenceMonth: m,
        },
      });
      created.push(row.id);
      await this.refreshInvoiceTotal(inv.id);
    }

    return this.prisma.creditCardTransaction.findMany({
      where: { id: { in: created } },
      include: { invoice: true, category: true, originator: true },
    });
  }

  listInvoices(cardId: string) {
    return this.prisma.creditCardInvoice.findMany({
      where: { creditCardId: cardId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      include: {
        transactions: { include: { category: true, originator: true } },
      },
    });
  }

  invoiceById(invoiceId: string) {
    return this.prisma.creditCardInvoice.findUnique({
      where: { id: invoiceId },
      include: {
        creditCard: true,
        transactions: { include: { category: true, originator: true } },
      },
    });
  }

  async totalsByCategory(cardId: string, year: number, month: number) {
    const txs = await this.prisma.creditCardTransaction.findMany({
      where: { creditCardId: cardId, competenceYear: year, competenceMonth: month },
      include: { category: true },
    });
    const map = new Map<string, number>();
    for (const t of txs) {
      const k = t.category?.name ?? 'Sem categoria';
      map.set(k, (map.get(k) ?? 0) + Number(t.amount));
    }
    return Array.from(map.entries()).map(([category, total]) => ({ category, total }));
  }

  async totalsByOriginator(cardId: string, year: number, month: number) {
    const txs = await this.prisma.creditCardTransaction.findMany({
      where: { creditCardId: cardId, competenceYear: year, competenceMonth: month },
      include: { originator: true },
    });
    const map = new Map<string, number>();
    for (const t of txs) {
      const k = t.originator?.name ?? '—';
      map.set(k, (map.get(k) ?? 0) + Number(t.amount));
    }
    return Array.from(map.entries()).map(([originator, total]) => ({ originator, total }));
  }
}
