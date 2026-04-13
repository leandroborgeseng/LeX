import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateFinancialHistorySnapshotDto {
  @IsOptional()
  @IsString()
  financialEntityId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsDateString()
  referenceDate?: string;
}
