import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FinancingService } from './financing.service';
import { CreateFinancingDto, PayInstallmentDto } from './dto/financing.dto';

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
