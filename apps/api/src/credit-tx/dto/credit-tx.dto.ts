import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreateCreditPurchaseDto {
  @IsUUID()
  creditCardId!: string;

  @IsUUID()
  financialEntityId!: string;

  @IsString()
  @MinLength(1)
  description!: string;

  @Type(() => Number)
  @IsNumber()
  amount!: number;

  @IsDateString()
  purchaseDate!: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  originatorId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(48)
  installments?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  competenceYear?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  competenceMonth?: number;
}
