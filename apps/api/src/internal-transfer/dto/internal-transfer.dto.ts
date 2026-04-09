import { TransferType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
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
  @IsUUID()
  fromEntityId?: string;

  @IsOptional()
  @IsUUID()
  toEntityId?: string;

  @IsOptional()
  @IsUUID()
  fromAccountId?: string;

  @IsOptional()
  @IsUUID()
  toAccountId?: string;
}
