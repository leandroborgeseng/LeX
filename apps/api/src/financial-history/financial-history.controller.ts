import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FinancialHistoryService } from './financial-history.service';
import { CreateFinancialHistorySnapshotDto } from './dto/financial-history.dto';

@ApiTags('financial-history')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('financial-history')
export class FinancialHistoryController {
  constructor(private readonly svc: FinancialHistoryService) {}

  @Post('snapshots')
  create(@Body() dto: CreateFinancialHistorySnapshotDto) {
    return this.svc.create(dto);
  }

  @Get('snapshots')
  list(
    @Query('financialEntityId') entityId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.svc.findAll({ entityId, from, to });
  }

  @Get('snapshots/:id')
  get(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Delete('snapshots/:id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
