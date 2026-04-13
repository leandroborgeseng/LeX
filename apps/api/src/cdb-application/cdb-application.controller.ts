import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CdbApplicationService } from './cdb-application.service';
import { CreateCdbApplicationDto, UpdateCdbApplicationDto } from './dto/cdb-application.dto';

@ApiTags('cdb-applications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cdb-applications')
export class CdbApplicationController {
  constructor(private readonly svc: CdbApplicationService) {}

  @Get()
  list(@Query('financialEntityId') entityId?: string) {
    return this.svc.findAll(entityId);
  }

  @Get('projection/summary')
  projection(@Query('years') years = '5', @Query('financialEntityId') entityId?: string) {
    return this.svc.projection(parseFloat(years) || 5, entityId);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateCdbApplicationDto) {
    return this.svc.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCdbApplicationDto) {
    return this.svc.update(id, dto);
  }

  @Post(':id/sync-revenues')
  syncRevenues(@Param('id') id: string) {
    return this.svc.syncRevenuesForCdbApplication(id);
  }
}
