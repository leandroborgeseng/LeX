import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ExpenseStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { buildSchedule } from './amortization.util';
import { CreateFinancingDto, UpdateFinancingDto } from './dto/financing.dto';

@Injectable()
export class FinancingService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.financing.findMany({
      orderBy: { createdAt: 'desc' },
      include: { installments: { orderBy: { number: 'asc' } } },
    });
  }

  async findOne(id: string) {
    const f = await this.prisma.financing.findUnique({
      where: { id },
      include: { installments: { orderBy: { number: 'asc' } } },
    });
    if (!f) throw new NotFoundException('Financiamento não encontrado');
    return f;
  }

  async create(dto: CreateFinancingDto) {
    const start = new Date(dto.startDate);
    const schedule = buildSchedule(
      dto.originalValue,
      dto.monthlyRate,
      dto.installmentsCount,
      dto.amortSystem,
      start,
    );
    const firstPay = schedule[0]?.payment ?? 0;
    return this.prisma.financing.create({
      data: {
        financialEntityId: dto.financialEntityId,
        name: dto.name,
        creditor: dto.creditor,
        originalValue: dto.originalValue,
        monthlyRate: dto.monthlyRate,
        installmentsCount: dto.installmentsCount,
        amortSystem: dto.amortSystem,
        startDate: start,
        installmentValue: firstPay,
        currentBalance: dto.originalValue,
        installments: {
          create: schedule.map((r) => ({
            number: r.number,
            dueDate: r.dueDate,
            payment: r.payment,
            interest: r.interest,
            amortization: r.amortization,
            balanceAfter: r.balanceAfter,
            status: ExpenseStatus.PREVISTO,
          })),
        },
      },
      include: { installments: true },
    });
  }

  async payInstallment(financingId: string, installmentNumber: number, paidAt: Date) {
    const f = await this.findOne(financingId);
    const inst = f.installments.find((i) => i.number === installmentNumber);
    if (!inst) throw new NotFoundException('Parcela não encontrada');
    if (inst.status === ExpenseStatus.PAGO) {
      throw new BadRequestException('Parcela já paga');
    }
    await this.prisma.financingInstallment.update({
      where: { id: inst.id },
      data: { status: ExpenseStatus.PAGO, paidAt },
    });
    const pay = Number(inst.payment);
    const intr = Number(inst.interest);
    const amort = Number(inst.amortization);
    const bal = Number(inst.balanceAfter);
    await this.prisma.financing.update({
      where: { id: financingId },
      data: {
        totalPaid: { increment: pay },
        interestPaid: { increment: intr },
        amortAccumulated: { increment: amort },
        currentBalance: bal,
      },
    });
    return this.findOne(financingId);
  }

  async regenerateFutureInstallments(financingId: string) {
    const f = await this.findOne(financingId);
    const paidCount = f.installments.filter((i) => i.status === ExpenseStatus.PAGO).length;
    const remaining = f.installmentsCount - paidCount;
    if (remaining <= 0) {
      await this.prisma.financingInstallment.deleteMany({
        where: { financingId, status: ExpenseStatus.PREVISTO },
      });
      return this.findOne(financingId);
    }
    await this.prisma.financingInstallment.deleteMany({
      where: { financingId, status: ExpenseStatus.PREVISTO },
    });
    const lastPaid = f.installments
      .filter((i) => i.status === ExpenseStatus.PAGO)
      .sort((a, b) => b.number - a.number)[0];
    const startBase = lastPaid?.dueDate ?? f.startDate;
    const start = new Date(startBase);
    start.setMonth(start.getMonth() + 1);
    const balance = Number(f.currentBalance);
    const schedule = buildSchedule(
      balance,
      Number(f.monthlyRate),
      remaining,
      f.amortSystem,
      start,
    );
    const startNum = paidCount + 1;
    await this.prisma.$transaction(
      schedule.map((r, idx) =>
        this.prisma.financingInstallment.create({
          data: {
            financingId,
            number: startNum + idx,
            dueDate: r.dueDate,
            payment: r.payment,
            interest: r.interest,
            amortization: r.amortization,
            balanceAfter: r.balanceAfter,
            status: ExpenseStatus.PREVISTO,
          },
        }),
      ),
    );
    await this.prisma.financing.update({
      where: { id: financingId },
      data: { installmentValue: schedule[0]?.payment ?? 0 },
    });
    return this.findOne(financingId);
  }

  async update(id: string, dto: UpdateFinancingDto) {
    await this.findOne(id);
    return this.prisma.financing.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.creditor !== undefined ? { creditor: dto.creditor } : {}),
        ...(dto.financialEntityId !== undefined ? { financialEntityId: dto.financialEntityId } : {}),
      },
      include: { installments: { orderBy: { number: 'asc' } } },
    });
  }
}
