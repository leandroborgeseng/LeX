import { Module } from '@nestjs/common';
import { CreditTxService } from './credit-tx.service';
import { CreditTxController } from './credit-tx.controller';

@Module({
  controllers: [CreditTxController],
  providers: [CreditTxService],
})
export class CreditTxModule {}
