import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PayerSourceService } from './payer-source.service';
import { CreatePayerSourceDto, UpdatePayerSourceDto } from './dto/payer.dto';

@ApiTags('payer-sources')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payer-sources')
export class PayerSourceController {
  constructor(private readonly svc: PayerSourceService) {}

  @Get()
  list() {
    return this.svc.findAll();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  create(@Body() dto: CreatePayerSourceDto) {
    return this.svc.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePayerSourceDto) {
    return this.svc.update(id, dto);
  }
}
