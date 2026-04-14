import { Module } from '@nestjs/common';
import { CdbApplicationModule } from '../cdb-application/cdb-application.module';
import { FinancingModule } from '../financing/financing.module';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';

@Module({
  imports: [CdbApplicationModule, FinancingModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
