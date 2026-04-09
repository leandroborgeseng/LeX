import { ContractStatus, RecurrenceFrequency } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateContractDto {
  @IsString()
  @MinLength(1)
  clientName!: string;

  @Type(() => Number)
  @IsNumber()
  monthlyGross!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  estimatedTax?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  estimatedOpCost?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  estimatedNet?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(RecurrenceFrequency)
  recurrence?: RecurrenceFrequency;

  @IsOptional()
  @IsEnum(ContractStatus)
  status?: ContractStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateContractDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  clientName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  monthlyGross?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  estimatedTax?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  estimatedOpCost?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  estimatedNet?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string | null;

  @IsOptional()
  @IsDateString()
  endDate?: string | null;

  @IsOptional()
  @IsEnum(RecurrenceFrequency)
  recurrence?: RecurrenceFrequency;

  @IsOptional()
  @IsEnum(ContractStatus)
  status?: ContractStatus;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
