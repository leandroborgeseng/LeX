import { ApiPropertyOptional } from '@nestjs/swagger';
import { CategoryKind } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsEnum(CategoryKind)
  kind!: CategoryKind;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  parentId?: string;
}

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  parentId?: string | null;
}
