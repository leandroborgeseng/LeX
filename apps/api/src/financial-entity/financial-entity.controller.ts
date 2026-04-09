import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FinancialEntityService } from './financial-entity.service';
import { CreateFinancialEntityDto, UpdateFinancialEntityDto } from './dto/create-financial-entity.dto';

@ApiTags('financial-entities')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('financial-entities')
export class FinancialEntityController {
  constructor(private readonly svc: FinancialEntityService) {}

  @Get()
  list() {
    return this.svc.findAll();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateFinancialEntityDto) {
    return this.svc.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateFinancialEntityDto) {
    return this.svc.update(id, dto);
  }
}
