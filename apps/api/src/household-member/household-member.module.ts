import { Module } from '@nestjs/common';
import { HouseholdMemberService } from './household-member.service';
import { HouseholdMemberController } from './household-member.controller';

@Module({
  controllers: [HouseholdMemberController],
  providers: [HouseholdMemberService],
})
export class HouseholdMemberModule {}
