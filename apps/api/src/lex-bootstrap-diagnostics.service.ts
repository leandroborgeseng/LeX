import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CdbApplicationService } from './cdb-application/cdb-application.service';
import { FinancingService } from './financing/financing.service';
import { PrismaService } from './prisma/prisma.service';

/** Igual ao prisma/seed.ts — log ao subir (Railway / Docker). */
function seedUserEmail(): string {
  return (process.env.LEX_SEED_EMAIL ?? 'leandro.borges@me.com').trim().toLowerCase();
}

@Injectable()
export class LexBootstrapDiagnosticsService implements OnModuleInit {
  private readonly logger = new Logger('LeX');

  constructor(
    private readonly prisma: PrismaService,
    private readonly financing: FinancingService,
    private readonly cdbApplications: CdbApplicationService,
  ) {}

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

    try {
      const pendingInstallments = await this.prisma.financingInstallment.count({
        where: {
          financing: { financialEntityId: { not: null } },
          expense: null,
        },
      });
      if (pendingInstallments > 0) {
        this.logger.log(
          `Liquidez / financiamento: ${pendingInstallments} parcela(s) sem despesa vinculada — a sincronizar contratos com entidade.`,
        );
        const n = await this.financing.syncAllWithFinancialEntity();
        this.logger.log(`Contratos sincronizados (despesas de parcelas): ${n}.`);
      }
    } catch (e) {
      this.logger.warn(`Backfill despesas de financiamento: ${String(e)}`);
    }

    try {
      const cdbNeedingSync = await this.prisma.cdbApplication.count({
        where: {
          financialEntityId: { not: null },
          OR: [{ monthlyAporteAmount: { gt: 0 } }, { recurrenceEnabled: true }],
        },
      });
      if (cdbNeedingSync > 0) {
        this.logger.log(
          `CDB: a sincronizar receitas e aportes para ${cdbNeedingSync} aplicação(ões) (entidade e recorrência ou aporte > 0).`,
        );
        const n = await this.cdbApplications.syncAllWithFinancialEntity();
        this.logger.log(`CDB materializados: ${n}.`);
      }
    } catch (e) {
      this.logger.warn(`Backfill CDB (receitas/aportes): ${String(e)}`);
    }
  }
}
