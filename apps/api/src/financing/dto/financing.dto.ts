import { AmortizationSystem } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export const FINANCING_KIND_VALUES = ['FINANCIAMENTO', 'EMPRESTIMO'] as const;
export type FinancingKindDto = (typeof FINANCING_KIND_VALUES)[number];

export class CreateFinancingDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  financialEntityId?: string;

  @IsOptional()
  @IsIn(FINANCING_KIND_VALUES)
  kind?: FinancingKindDto;

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

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  insuranceTotalPremium?: number;
}

export class PayInstallmentDto {
  @IsDateString()
  paidAt!: string;
}

/** Metadados editáveis sem recalcular parcelas; taxa de juros altera-se só via POST /financings/:id/reprice. */
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

  @IsOptional()
  @IsIn(FINANCING_KIND_VALUES)
  kind?: FinancingKindDto;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  insuranceTotalPremium?: number;
}

export class RepriceFinancingDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monthlyRate!: number;
}
