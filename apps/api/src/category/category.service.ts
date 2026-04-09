import { Injectable, NotFoundException } from '@nestjs/common';
import { CategoryKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(kind?: CategoryKind) {
    return this.prisma.category.findMany({
      where: kind ? { kind } : undefined,
      orderBy: { name: 'asc' },
      include: { parent: true },
    });
  }

  async findOne(id: string) {
    const c = await this.prisma.category.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Categoria não encontrada');
    return c;
  }

  create(dto: CreateCategoryDto) {
    return this.prisma.category.create({ data: dto });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.findOne(id);
    return this.prisma.category.update({ where: { id }, data: dto });
  }
}
