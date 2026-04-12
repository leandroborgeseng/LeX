import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';
import { ChangePasswordDto, UpdateProfileDto } from './dto/profile.dto';
import { EmergencyPasswordResetDto } from './dto/emergency-reset.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('emergency-reset-password')
  @ApiOperation({
    summary: 'Reset de emergência (requer LEX_EMERGENCY_PASSWORD_RESET_TOKEN)',
    description:
      'Só responde se o token de ambiente estiver definido. Remova a variável após repor a senha. Uso: self-host / Railway.',
  })
  @ApiBody({ type: EmergencyPasswordResetDto })
  emergencyReset(@Body() dto: EmergencyPasswordResetDto) {
    return this.auth.emergencyResetPassword(dto.token, dto.email, dto.newPassword);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login com e-mail e senha' })
  @ApiBody({ type: LoginDto })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Dados do utilizador autenticado' })
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Atualizar nome/e-mail do utilizador autenticado' })
  updateProfile(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.auth.updateProfile(user.id, dto);
  }

  @Patch('me/password')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Atualizar senha do utilizador autenticado' })
  changePassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(user.id, dto.currentPassword, dto.newPassword);
  }
}
