import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BankAccountService } from './bank-account.service';
import { CreateBankAccountDto, UpdateBankAccountDto } from './dto/bank-account.dto';

@ApiTags('bank-accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bank-accounts')
export class BankAccountController {
  constructor(private readonly svc: BankAccountService) {}

  @Get()
  list(@Query('financialEntityId') entityId?: string) {
    return this.svc.findAll(entityId);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.findOneWithBalance(id);
  }

  @Post()
  create(@Body() dto: CreateBankAccountDto) {
    return this.svc.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBankAccountDto) {
    return this.svc.update(id, dto);
  }
}
