import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'gestor@empresa.com' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({ require_tld: false })
  email?: string;

  @ApiPropertyOptional({ example: 'Leandro Borges' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  name?: string;
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(4)
  currentPassword!: string;

  @IsString()
  @MinLength(6)
  newPassword!: string;
}
