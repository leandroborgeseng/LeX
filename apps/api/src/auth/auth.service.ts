import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, timingSafeEqual } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

function loginVerboseErrors(): boolean {
  const v = process.env.LEX_VERBOSE_LOGIN_ERRORS?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

function sha256(buf: string): Buffer {
  return createHash('sha256').update(buf, 'utf8').digest();
}

function tokensEqual(a: string, b: string): boolean {
  const x = sha256(a);
  const y = sha256(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    const normalized = email.trim().toLowerCase();
    const pass = typeof password === 'string' ? password.trim() : password;
    const user = await this.prisma.user.findUnique({ where: { email: normalized } });
    if (!user) {
      throw new UnauthorizedException(
        loginVerboseErrors()
          ? 'Não existe utilizador com este e-mail.'
          : 'Credenciais inválidas',
      );
    }
    const ok = await bcrypt.compare(pass, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException(
        loginVerboseErrors() ? 'Senha incorreta.' : 'Credenciais inválidas',
      );
    }
    return user;
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);
    const payload = { sub: user.id, email: user.email };
    return {
      access_token: await this.jwt.signAsync(payload),
      user: { id: user.id, email: user.email, name: user.name },
    };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Utilizador não encontrado');
    return { id: user.id, email: user.email, name: user.name };
  }

  async updateProfile(userId: string, input: { email?: string; name?: string | null }) {
    const data: { email?: string; name?: string | null } = {};
    if (input.email !== undefined) {
      data.email = input.email.trim().toLowerCase();
    }
    if (input.name !== undefined) {
      const nameTrimmed = input.name?.trim() ?? '';
      data.name = nameTrimmed.length > 0 ? nameTrimmed : null;
    }

    try {
      const updated = await this.prisma.user.update({
        where: { id: userId },
        data,
      });
      return { id: updated.id, email: updated.email, name: updated.name };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '';
      if (msg.includes('Unique constraint failed') && msg.includes('email')) {
        throw new BadRequestException('Este e-mail já está em uso');
      }
      throw error;
    }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Utilizador não encontrado');

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) throw new BadRequestException('Senha atual incorreta');
    if (currentPassword === newPassword) {
      throw new BadRequestException('A nova senha deve ser diferente da atual');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    return { ok: true };
  }

  /**
   * Repõe a senha sem login. Só existe enquanto LEX_EMERGENCY_PASSWORD_RESET_TOKEN estiver definido.
   * Remova a variável do ambiente após usar.
   */
  async emergencyResetPassword(token: string, email: string, newPassword: string) {
    const secret = process.env.LEX_EMERGENCY_PASSWORD_RESET_TOKEN?.trim();
    if (!secret) {
      throw new NotFoundException();
    }
    if (!tokensEqual(token, secret)) {
      throw new ForbiddenException('Token inválido');
    }

    const normalized = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email: normalized } });
    if (!user) {
      throw new NotFoundException('Não existe utilizador com este e-mail');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    this.logger.warn(`Reset de emergência da senha aplicado para ${normalized}`);
    return { ok: true };
  }
}
