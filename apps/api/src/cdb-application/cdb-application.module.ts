import { Module } from '@nestjs/common';
import { CdbApplicationController } from './cdb-application.controller';
import { CdbApplicationService } from './cdb-application.service';

@Module({
  controllers: [CdbApplicationController],
  providers: [CdbApplicationService],
  exports: [CdbApplicationService],
})
export class CdbApplicationModule {}
