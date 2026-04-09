import { TransferType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateInternalTransferDto {
  @IsEnum(TransferType)
  type!: TransferType;

  @Type(() => Number)
  @IsNumber()
  amount!: number;

  @IsDateString()
  date!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  fromEntityId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  toEntityId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  fromAccountId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  toAccountId?: string;
}
