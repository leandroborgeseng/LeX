import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto/employee.dto';

@Injectable()
export class EmployeeService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.employee.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string) {
    const e = await this.prisma.employee.findUnique({ where: { id } });
    if (!e) throw new NotFoundException('Funcionário não encontrado');
    return e;
  }

  create(dto: CreateEmployeeDto) {
    return this.prisma.employee.create({
      data: {
        name: dto.name,
        role: dto.role,
        salary: dto.salary,
        charges: dto.charges ?? 0,
        benefits: dto.benefits ?? 0,
        totalMonthly: dto.totalMonthly,
        active: dto.active ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateEmployeeDto) {
    await this.findOne(id);
    return this.prisma.employee.update({ where: { id }, data: dto });
  }
}
