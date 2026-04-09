import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProjectionsService } from './projections.service';

@ApiTags('projections')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projections')
export class ProjectionsController {
  constructor(private readonly svc: ProjectionsService) {}

  @Get('base')
  base(@Query('months') months = '12') {
    return this.svc.monthlyBase(parseInt(months, 10));
  }

  @Get('conservative')
  conservative(@Query('months') months = '12') {
    return this.svc.conservative(parseInt(months, 10));
  }

  @Get('contract-impact')
  contract(@Query('monthlyNetDelta') delta: string, @Query('months') months = '12') {
    return this.svc.contractImpact(parseFloat(delta), parseInt(months, 10));
  }

  @Get('expense-shock')
  shock(@Query('extraMonthly') extra: string, @Query('months') months = '12') {
    return this.svc.expenseShock(parseFloat(extra), parseInt(months, 10));
  }

  @Get('early-payoff')
  payoff(
    @Query('financingId') financingId: string,
    @Query('payoffAmount') payoffAmount: string,
  ) {
    return this.svc.earlyPayoff(financingId, parseFloat(payoffAmount));
  }
}
