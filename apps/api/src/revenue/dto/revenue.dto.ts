import { RecurrenceFrequency, RevenueStatus, RevenueType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreateRevenueDto {
  @IsString()
  @MinLength(1)
  financialEntityId!: string;

  @IsString()
  @MinLength(1)
  description!: string;

  @IsEnum(RevenueType)
  type!: RevenueType;

  @IsOptional()
  @IsString()
  @MinLength(1)
  categoryId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  payerSourceId?: string;

  @Type(() => Number)
  @IsNumber()
  grossAmount!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  taxDiscount?: number;

  @Type(() => Number)
  @IsNumber()
  netAmount!: number;

  @IsDateString()
  competenceDate!: string;

  @IsDateString()
  dueDate!: string;

  @IsOptional()
  @IsDateString()
  receivedAt?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  destinationAccountId?: string;

  @IsOptional()
  @IsEnum(RevenueStatus)
  status?: RevenueStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isRecurringTemplate?: boolean;

  @IsOptional()
  @IsEnum(RecurrenceFrequency)
  recurrenceFrequency?: RecurrenceFrequency;

  @IsOptional()
  @IsDateString()
  recurrenceEndDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(120)
  futureOccurrences?: number;
}

export class UpdateRevenueDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  description?: string;

  @IsOptional()
  @IsEnum(RevenueType)
  type?: RevenueType;

  @IsOptional()
  @IsString()
  @MinLength(1)
  categoryId?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(1)
  payerSourceId?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  grossAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  taxDiscount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  netAmount?: number;

  @IsOptional()
  @IsDateString()
  competenceDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsDateString()
  receivedAt?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(1)
  destinationAccountId?: string | null;

  @IsOptional()
  @IsEnum(RevenueStatus)
  status?: RevenueStatus;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
