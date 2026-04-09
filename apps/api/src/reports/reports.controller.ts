import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReportsService, EntityScope } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly svc: ReportsService) {}

  @Get('cashflow-monthly')
  cashflow(
    @Query('scope') scope: EntityScope = 'CONSOLIDADO',
    @Query('year') year = `${new Date().getFullYear()}`,
    @Query('month') month = `${new Date().getMonth() + 1}`,
  ) {
    return this.svc.cashflowMonthly(scope, parseInt(year, 10), parseInt(month, 10));
  }

  @Get('dre')
  dre(
    @Query('scope') scope: EntityScope = 'CONSOLIDADO',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return this.svc.dreSimplified(
      scope,
      from ?? start.toISOString(),
      to ?? end.toISOString(),
    );
  }

  @Get('expenses-by-category')
  expCat(
    @Query('scope') scope: EntityScope = 'CONSOLIDADO',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const { f, t } = this.defaultRange(from, to);
    return this.svc.expensesByCategory(scope, f, t);
  }

  @Get('expenses-by-originator')
  expOrig(
    @Query('scope') scope: EntityScope = 'CONSOLIDADO',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const { f, t } = this.defaultRange(from, to);
    return this.svc.expensesByOriginator(scope, f, t);
  }

  @Get('revenues-by-source')
  revSrc(
    @Query('scope') scope: EntityScope = 'CONSOLIDADO',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const { f, t } = this.defaultRange(from, to);
    return this.svc.revenuesBySource(scope, f, t);
  }

  private defaultRange(from?: string, to?: string) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return {
      f: from ?? start.toISOString(),
      t: to ?? end.toISOString(),
    };
  }

  @Get('debt-evolution')
  debt(@Query('months') months = '12') {
    return this.svc.debtEvolution(parseInt(months, 10));
  }

  @Get('contracts-margin')
  contracts() {
    return this.svc.contractsMargin();
  }
}
