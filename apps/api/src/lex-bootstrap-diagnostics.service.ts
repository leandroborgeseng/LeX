import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

/** Alinhado com prisma/seed.ts — só para log de arranque (Railway / Docker). */
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
        `Arranque: ${total} utilizador(es); conta seed (${email}): ${seedRow ? 'presente' : 'ausente'}.`,
      );
    } catch (e) {
      this.logger.warn(`Arranque: falha ao consultar utilizadores — ${String(e)}`);
    }
  }
}
