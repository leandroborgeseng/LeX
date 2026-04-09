import { Module } from '@nestjs/common';
import { FinancialEntityService } from './financial-entity.service';
import { FinancialEntityController } from './financial-entity.controller';

@Module({
  controllers: [FinancialEntityController],
  providers: [FinancialEntityService],
})
export class FinancialEntityModule {}
