import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HouseholdMemberService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.householdMember.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string) {
    const m = await this.prisma.householdMember.findUnique({ where: { id } });
    if (!m) throw new NotFoundException('Membro não encontrado');
    return m;
  }

  create(data: { name: string; active?: boolean }) {
    return this.prisma.householdMember.create({ data });
  }

  async update(id: string, data: { name?: string; active?: boolean }) {
    await this.findOne(id);
    return this.prisma.householdMember.update({ where: { id }, data });
  }
}
