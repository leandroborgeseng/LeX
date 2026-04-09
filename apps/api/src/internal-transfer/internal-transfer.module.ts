import { Module } from '@nestjs/common';
import { InternalTransferService } from './internal-transfer.service';
import { InternalTransferController } from './internal-transfer.controller';

@Module({
  controllers: [InternalTransferController],
  providers: [InternalTransferService],
})
export class InternalTransferModule {}
