import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InternalTransferService } from './internal-transfer.service';
import { CreateInternalTransferDto } from './dto/internal-transfer.dto';

@ApiTags('internal-transfers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('internal-transfers')
export class InternalTransferController {
  constructor(private readonly svc: InternalTransferService) {}

  @Get()
  list(@Query('from') from?: string, @Query('to') to?: string) {
    return this.svc.findAll(from, to);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateInternalTransferDto) {
    return this.svc.create(dto);
  }
}
