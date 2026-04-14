import { PatrimonyAssetKind } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreatePatrimonyAssetDto {
  @IsString()
  @MinLength(1)
  financialEntityId!: string;

  @IsEnum(PatrimonyAssetKind)
  kind!: PatrimonyAssetKind;

  @IsString()
  @MinLength(1)
  name!: string;

  @Type(() => Number)
  @IsNumber()
  estimatedValue!: number;

  @IsOptional()
  @ValidateIf((_, v) => v != null && v !== '')
  @IsDateString()
  acquisitionDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdatePatrimonyAssetDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  financialEntityId?: string;

  @IsOptional()
  @IsEnum(PatrimonyAssetKind)
  kind?: PatrimonyAssetKind;

  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  estimatedValue?: number;

  @IsOptional()
  @ValidateIf((_, v) => v != null && v !== '')
  @IsDateString()
  acquisitionDate?: string | null;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
