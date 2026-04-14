import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
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

  @Get('dre-monthly')
  dreMonthly(
    @Query('scope') scope: EntityScope = 'CONSOLIDADO',
    @Query('year') year = `${new Date().getFullYear()}`,
  ) {
    return this.svc.dreMonthly(scope, parseInt(year, 10));
  }

  @Get('monthly-liquidity')
  monthlyLiquidity(
    @Query('scope') scope: EntityScope = 'CONSOLIDADO',
    @Query('year') year = `${new Date().getFullYear()}`,
    @Query('financialEntityId') financialEntityId?: string,
  ) {
    const y = parseInt(year, 10);
    return this.svc.monthlyLiquidityYear(
      scope,
      Number.isFinite(y) ? y : new Date().getFullYear(),
      financialEntityId,
    );
  }

  /**
   * Lançamentos do mês (receitas ou despesas) na mesma base da liquidez mensal.
   * `segment`: receitas → all | cdb ; despesas → all | financing | cdb | other
   */
  /**
   * Re-materializa receitas CDB (sync por aplicação) e despesas de parcelas de financiamento/empréstimo,
   * respeitando o mesmo filtro de entidade da liquidez mensal.
   */
  @Post('sync-liquidity-moviments')
  @HttpCode(200)
  syncLiquidityMoviments(
    @Query('scope') scope: EntityScope = 'CONSOLIDADO',
    @Query('financialEntityId') financialEntityId?: string,
  ) {
    return this.svc.syncLiquidityMoviments(scope, financialEntityId);
  }

  @Get('monthly-liquidity-lines')
  monthlyLiquidityLines(
    @Query('scope') scope: EntityScope = 'CONSOLIDADO',
    @Query('year') year = `${new Date().getFullYear()}`,
    @Query('month') month = `${new Date().getMonth() + 1}`,
    @Query('side') side: string,
    @Query('segment') segment = 'all',
    @Query('financialEntityId') financialEntityId?: string,
  ) {
    if (side !== 'revenues' && side !== 'expenses') {
      throw new BadRequestException('Parâmetro side deve ser revenues ou expenses');
    }
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    const yOk = Number.isFinite(y) ? y : new Date().getFullYear();
    const mOk = Number.isFinite(m) && m >= 1 && m <= 12 ? m : new Date().getMonth() + 1;
    if (side === 'revenues') {
      if (segment !== 'all' && segment !== 'cdb') {
        throw new BadRequestException('Para receitas, segment deve ser all ou cdb');
      }
    } else {
      if (!['all', 'financing', 'cdb', 'other'].includes(segment)) {
        throw new BadRequestException('Para despesas, segment deve ser all, financing, cdb ou other');
      }
    }
    return this.svc.monthlyLiquidityLines(
      scope,
      yOk,
      mOk,
      financialEntityId,
      side as 'revenues' | 'expenses',
      segment as 'all' | 'cdb' | 'financing' | 'other',
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
  debt(
    @Query('scope') scope: EntityScope = 'CONSOLIDADO',
    @Query('months') months = '12',
  ) {
    const m = parseInt(months, 10);
    return this.svc.debtEvolution(scope, Number.isFinite(m) ? m : 12);
  }

  @Get('contracts-margin')
  contracts() {
    return this.svc.contractsMargin();
  }
}
