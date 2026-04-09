import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BalanceService } from '../ledger/balance.service';
import { CreateBankAccountDto, UpdateBankAccountDto } from './dto/bank-account.dto';

@Injectable()
export class BankAccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly balance: BalanceService,
  ) {}

  findAll(entityId?: string) {
    return this.prisma.bankAccount.findMany({
      where: entityId ? { financialEntityId: entityId } : undefined,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const a = await this.prisma.bankAccount.findUnique({ where: { id } });
    if (!a) throw new NotFoundException('Conta não encontrada');
    return a;
  }

  async findOneWithBalance(id: string) {
    const a = await this.findOne(id);
    const computed = await this.balance.accountBalance(id);
    return { ...a, computedBalance: computed };
  }

  create(dto: CreateBankAccountDto) {
    return this.prisma.bankAccount.create({
      data: {
        financialEntityId: dto.financialEntityId,
        name: dto.name,
        bank: dto.bank,
        type: dto.type,
        initialBalance: dto.initialBalance ?? 0,
        active: dto.active ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateBankAccountDto) {
    await this.findOne(id);
    return this.prisma.bankAccount.update({ where: { id }, data: dto });
  }
}
