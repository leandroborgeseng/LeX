import { Module } from '@nestjs/common';
import { FinancialHistoryController } from './financial-history.controller';
import { FinancialHistoryService } from './financial-history.service';
import { DashboardModule } from '../dashboard/dashboard.module';
import { CdbApplicationModule } from '../cdb-application/cdb-application.module';

@Module({
  imports: [DashboardModule, CdbApplicationModule],
  controllers: [FinancialHistoryController],
  providers: [FinancialHistoryService],
})
export class FinancialHistoryModule {}
