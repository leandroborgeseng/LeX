import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

/** Igual ao prisma/seed.ts — log ao subir (Railway / Docker). */
function seedUserEmail(): string {
  return (process.env.LEX_SEED_EMAIL ?? 'leandro.borges@me.com').trim().toLowerCase();
}

@Injectable()
export class LexBootstrapDiagnosticsService implements OnModuleInit {
  private readonly logger = new Logger('LeX');

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      const total = await this.prisma.user.count();
      const email = seedUserEmail();
      const seedRow = await this.prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });
      this.logger.log(
        `Subiu: ${total} usuário(s); conta seed (${email}): ${seedRow ? 'ok' : 'falta'}.`,
      );
    } catch (e) {
      this.logger.warn(`Subiu: erro ao ler usuários — ${String(e)}`);
    }
  }
}
