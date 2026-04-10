import { AmortizationSystem } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateFinancingDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  financialEntityId?: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  creditor?: string;

  @Type(() => Number)
  @IsNumber()
  originalValue!: number;

  @Type(() => Number)
  @IsNumber()
  monthlyRate!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  installmentsCount!: number;

  @IsEnum(AmortizationSystem)
  amortSystem!: AmortizationSystem;

  @IsDateString()
  startDate!: string;
}

export class PayInstallmentDto {
  @IsDateString()
  paidAt!: string;
}

/** Metadados editáveis sem recalcular parcelas (valor, taxa e tabela continuam nos registos existentes). */
export class UpdateFinancingDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  creditor?: string | null;

  @IsOptional()
  @IsString()
  financialEntityId?: string | null;
}
