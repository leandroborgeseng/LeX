import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreatePatrimonyAssetDto, UpdatePatrimonyAssetDto } from './dto/patrimony-asset.dto';
import { PatrimonyAssetService } from './patrimony-asset.service';

@ApiTags('patrimony-assets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('patrimony-assets')
export class PatrimonyAssetController {
  constructor(private readonly svc: PatrimonyAssetService) {}

  @Get()
  list(@Query('financialEntityId') financialEntityId?: string) {
    return this.svc.findAll(financialEntityId);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  create(@Body() dto: CreatePatrimonyAssetDto) {
    return this.svc.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePatrimonyAssetDto) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id).then(() => ({ ok: true }));
  }
}
