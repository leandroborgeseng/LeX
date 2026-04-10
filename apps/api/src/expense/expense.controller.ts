import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ExpenseStatus, PaymentMethod } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ExpenseService } from './expense.service';
import { CreateExpenseDto, UpdateExpenseDto } from './dto/expense.dto';

@ApiTags('expenses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('expenses')
export class ExpenseController {
  constructor(private readonly svc: ExpenseService) {}

  @Get()
  list(
    @Query('financialEntityId') entityId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: ExpenseStatus,
    @Query('categoryId') categoryId?: string,
    @Query('originatorId') originatorId?: string,
    @Query('accountId') accountId?: string,
    @Query('cardId') cardId?: string,
    @Query('paymentMethod') paymentMethod?: PaymentMethod,
    @Query('q') q?: string,
  ) {
    return this.svc.findAll({
      entityId,
      from,
      to,
      status,
      categoryId,
      originatorId,
      accountId,
      cardId,
      paymentMethod,
      q,
    });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateExpenseDto) {
    return this.svc.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateExpenseDto) {
    return this.svc.update(id, dto);
  }

  @Post(':id/regenerate-future')
  regenerate(@Param('id') id: string) {
    return this.svc.regenerateFuture(id);
  }
}
