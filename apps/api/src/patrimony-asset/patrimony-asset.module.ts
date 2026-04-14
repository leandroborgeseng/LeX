import { Module } from '@nestjs/common';
import { PatrimonyAssetController } from './patrimony-asset.controller';
import { PatrimonyAssetService } from './patrimony-asset.service';

@Module({
  controllers: [PatrimonyAssetController],
  providers: [PatrimonyAssetService],
})
export class PatrimonyAssetModule {}
