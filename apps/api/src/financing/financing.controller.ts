import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FinancingService } from './financing.service';
import {
  CreateFinancingDto,
  PayInstallmentDto,
  RepriceFinancingDto,
  UpdateFinancingDto,
} from './dto/financing.dto';

@ApiTags('financings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('financings')
export class FinancingController {
  constructor(private readonly svc: FinancingService) {}

  @Get()
  list() {
    return this.svc.findAll();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateFinancingDto) {
    return this.svc.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateFinancingDto) {
    return this.svc.update(id, dto);
  }

  @Post(':id/reprice')
  reprice(@Param('id') id: string, @Body() dto: RepriceFinancingDto) {
    return this.svc.repriceWithNewRate(id, dto.monthlyRate);
  }

  @Post(':id/sync-expenses')
  syncExpenses(@Param('id') id: string) {
    return this.svc.syncExpensesForFinancing(id).then(() => this.svc.findOne(id));
  }

  @Post(':id/installments/:number/pay')
  pay(
    @Param('id') id: string,
    @Param('number', ParseIntPipe) number: number,
    @Body() dto: PayInstallmentDto,
  ) {
    return this.svc.payInstallment(id, number, new Date(dto.paidAt));
  }

  @Post(':id/regenerate-installments')
  regenerate(@Param('id') id: string) {
    return this.svc.regenerateFutureInstallments(id);
  }
}
