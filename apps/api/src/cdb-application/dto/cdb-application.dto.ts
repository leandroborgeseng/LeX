import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreateCdbApplicationDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  financialEntityId?: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  institution?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  principal!: number;

  @IsDateString()
  applicationDate!: string;

  @IsOptional()
  @IsDateString()
  maturityDate?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(300)
  indexerPercentOfCdi!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(50)
  assumedCdiAnnualPercent?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  recurrenceEnabled?: boolean;

  @IsOptional()
  @IsDateString()
  recurrenceEndDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(120)
  revenueSyncHorizonMonths?: number;

  /** Valor mensal de aporte (despesa PREVISTO); 0 = não gera despesas automáticas. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monthlyAporteAmount?: number;
}

export class UpdateCdbApplicationDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  financialEntityId?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  institution?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  principal?: number;

  @IsOptional()
  @IsDateString()
  applicationDate?: string;

  @IsOptional()
  @IsDateString()
  maturityDate?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(300)
  indexerPercentOfCdi?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(50)
  assumedCdiAnnualPercent?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsBoolean()
  recurrenceEnabled?: boolean;

  @IsOptional()
  @IsDateString()
  recurrenceEndDate?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(120)
  revenueSyncHorizonMonths?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monthlyAporteAmount?: number;
}
