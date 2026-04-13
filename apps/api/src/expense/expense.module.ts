import { Module } from '@nestjs/common';
import { FinancingModule } from '../financing/financing.module';
import { ExpenseService } from './expense.service';
import { ExpenseController } from './expense.controller';

@Module({
  imports: [FinancingModule],
  controllers: [ExpenseController],
  providers: [ExpenseService],
})
export class ExpenseModule {}
