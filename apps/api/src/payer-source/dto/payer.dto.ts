import { IsString, MinLength } from 'class-validator';

export class CreatePayerSourceDto {
  @IsString()
  @MinLength(1)
  name!: string;
}

export class UpdatePayerSourceDto {
  @IsString()
  @MinLength(1)
  name!: string;
}
