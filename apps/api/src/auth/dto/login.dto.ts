import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'leandro.borges@me.com' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  /** `require_tld: false` — e-mails tipo domínio interno passam na validação padrão do validator.js */
  @IsEmail({ require_tld: false })
  email!: string;

  @ApiProperty({ example: '********' })
  @IsString()
  @MinLength(4)
  password!: string;
}
