import { ApiProperty } from '@nestjs/swagger';
import { EntityType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateFinancialEntityDto {
  @ApiProperty({ enum: EntityType })
  @IsEnum(EntityType)
  type!: EntityType;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  name!: string;
}

export class UpdateFinancialEntityDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiProperty({ enum: EntityType, required: false })
  @IsOptional()
  @IsEnum(EntityType)
  type?: EntityType;
}
