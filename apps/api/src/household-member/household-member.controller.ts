import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { HouseholdMemberService } from './household-member.service';
import { CreateHouseholdMemberDto, UpdateHouseholdMemberDto } from './dto/member.dto';

@ApiTags('household-members')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('household-members')
export class HouseholdMemberController {
  constructor(private readonly svc: HouseholdMemberService) {}

  @Get()
  list() {
    return this.svc.findAll();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateHouseholdMemberDto) {
    return this.svc.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateHouseholdMemberDto) {
    return this.svc.update(id, dto);
  }
}
