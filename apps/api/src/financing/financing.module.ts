import { Module } from '@nestjs/common';
import { FinancingService } from './financing.service';
import { FinancingController } from './financing.controller';

@Module({
  controllers: [FinancingController],
  providers: [FinancingService],
})
export class FinancingModule {}
