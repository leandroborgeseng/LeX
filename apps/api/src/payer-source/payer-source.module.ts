import { Module } from '@nestjs/common';
import { PayerSourceService } from './payer-source.service';
import { PayerSourceController } from './payer-source.controller';

@Module({
  controllers: [PayerSourceController],
  providers: [PayerSourceService],
})
export class PayerSourceModule {}
