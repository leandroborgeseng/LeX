import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreatePayerSourceDto {
  @IsString()
  @MinLength(1)
  name!: string;
}

export class UpdatePayerSourceDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;
}
