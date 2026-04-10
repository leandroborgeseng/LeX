import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreateCreditCardDto {
  @IsString()
  @MinLength(1)
  financialEntityId!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  bank?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limitAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  closingDay?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  dueDay?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateCreditCardDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  financialEntityId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  bank?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limitAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  closingDay?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  dueDay?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
