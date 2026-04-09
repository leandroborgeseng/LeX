import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreditTxService } from './credit-tx.service';
import { CreateCreditPurchaseDto } from './dto/credit-tx.dto';

@ApiTags('credit-card-transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('credit-transactions')
export class CreditTxController {
  constructor(private readonly svc: CreditTxService) {}

  @Post('purchases')
  createPurchase(@Body() dto: CreateCreditPurchaseDto) {
    return this.svc.createPurchase(dto);
  }

  @Get('cards/:cardId/invoices')
  listInvoices(@Param('cardId') cardId: string) {
    return this.svc.listInvoices(cardId);
  }

  @Get('invoices/:id')
  invoice(@Param('id') id: string) {
    return this.svc.invoiceById(id);
  }

  @Get('cards/:cardId/totals-by-category')
  byCategory(
    @Param('cardId') cardId: string,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.svc.totalsByCategory(cardId, parseInt(year, 10), parseInt(month, 10));
  }

  @Get('cards/:cardId/totals-by-originator')
  byOriginator(
    @Param('cardId') cardId: string,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.svc.totalsByOriginator(cardId, parseInt(year, 10), parseInt(month, 10));
  }
}
