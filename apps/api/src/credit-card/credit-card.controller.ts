import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreditCardService } from './credit-card.service';
import { CreateCreditCardDto, UpdateCreditCardDto } from './dto/credit-card.dto';

@ApiTags('credit-cards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('credit-cards')
export class CreditCardController {
  constructor(private readonly svc: CreditCardService) {}

  @Get()
  list(@Query('financialEntityId') entityId?: string) {
    return this.svc.findAll(entityId);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Get(':id/current-invoice')
  currentInvoice(@Param('id') id: string) {
    return this.svc.currentInvoiceSummary(id);
  }

  @Post()
  create(@Body() dto: CreateCreditCardDto) {
    return this.svc.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCreditCardDto) {
    return this.svc.update(id, dto);
  }
}
