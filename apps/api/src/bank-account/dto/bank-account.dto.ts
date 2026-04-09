import { AccountType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateBankAccountDto {
  @IsString()
  @MinLength(1)
  financialEntityId!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  bank?: string;

  @IsEnum(AccountType)
  type!: AccountType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  initialBalance?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateBankAccountDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  bank?: string;

  @IsOptional()
  @IsEnum(AccountType)
  type?: AccountType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  initialBalance?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
