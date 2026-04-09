import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateEmployeeDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  role?: string;

  @Type(() => Number)
  @IsNumber()
  salary!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  charges?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  benefits?: number;

  @Type(() => Number)
  @IsNumber()
  totalMonthly!: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateEmployeeDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  salary?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  charges?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  benefits?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  totalMonthly?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
