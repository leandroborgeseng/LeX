import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@lex.local' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  /** `require_tld: false` — domínios .local (seed) passam na validação padrão do validator.js */
  @IsEmail({ require_tld: false })
  email!: string;

  @ApiProperty({ example: 'admin123' })
  @IsString()
  @MinLength(4)
  password!: string;
}
