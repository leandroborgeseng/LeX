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
import { RevenueStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RevenueService } from './revenue.service';
import { CreateRevenueDto, UpdateRevenueDto } from './dto/revenue.dto';

@ApiTags('revenues')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('revenues')
export class RevenueController {
  constructor(private readonly svc: RevenueService) {}

  @Get()
  list(
    @Query('financialEntityId') entityId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: RevenueStatus,
    @Query('payerSourceId') payerSourceId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.svc.findAll({
      entityId,
      from,
      to,
      status,
      payerSourceId,
      categoryId,
      accountId,
    });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateRevenueDto) {
    return this.svc.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRevenueDto) {
    return this.svc.update(id, dto);
  }

  @Post(':id/regenerate-future')
  regenerate(@Param('id') id: string) {
    return this.svc.regenerateFuture(id);
  }
}
