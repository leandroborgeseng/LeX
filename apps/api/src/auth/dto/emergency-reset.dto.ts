import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, MinLength } from 'class-validator';

/** Reset de emergência (só ativo com LEX_EMERGENCY_PASSWORD_RESET_TOKEN no ambiente). */
export class EmergencyPasswordResetDto {
  @ApiProperty({ description: 'Deve coincidir com LEX_EMERGENCY_PASSWORD_RESET_TOKEN' })
  @IsString()
  @MinLength(16, { message: 'Token demasiado curto' })
  token!: string;

  @ApiProperty({ example: 'leandro.borges@me.com' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({ require_tld: false })
  email!: string;

  @ApiProperty({ minLength: 6 })
  @IsString()
  @MinLength(6, { message: 'A nova senha deve ter pelo menos 6 caracteres' })
  newPassword!: string;
}
