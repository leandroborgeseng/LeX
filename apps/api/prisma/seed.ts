import {
  PrismaClient,
  EntityType,
  ContractStatus,
  RecurrenceFrequency,
  CategoryKind,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Se em produção não existir LEX_SEED_PASSWORD, o seed usa esta senha para conseguir entrar
 * e trocar no perfil. Não deixe assim em produção pública sem redeploy com LEX_SEED_PASSWORD.
 */
const LEX_SEED_FALLBACK_PASSWORD = 'lex-bootstrap-temp';

/** Utilizador inicial (bootstrap local / Docker / primeiro deploy). */
const SEED_USER_EMAIL = (process.env.LEX_SEED_EMAIL ?? 'leandro.borges@me.com').trim().toLowerCase();

function resolveSeedPassword(): string {
  const fromEnv = process.env.LEX_SEED_PASSWORD?.trim();
  if (fromEnv && fromEnv.length > 0) return fromEnv;
  if (process.env.NODE_ENV === 'production' && process.env.LEX_ALLOW_SEED_IN_PROD === '1') {
    console.warn(
      'LeX seed: LEX_SEED_PASSWORD vazio — a usar senha temporária "' +
        LEX_SEED_FALLBACK_PASSWORD +
        '". Entre, altere no perfil e defina LEX_SEED_PASSWORD no ambiente.',
    );
    return LEX_SEED_FALLBACK_PASSWORD;
  }
  // Desenvolvimento local: previsível; em produção sem LEX_ALLOW_SEED_IN_PROD o seed nem corre.
  return 'lex-local-dev';
}

async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.LEX_ALLOW_SEED_IN_PROD !== '1') {
    throw new Error(
      'Seed bloqueado em produção. Defina LEX_ALLOW_SEED_IN_PROD=1 apenas para bootstrap inicial.',
    );
  }

  await prisma.user.deleteMany({
    where: { email: 'admin@lex.local' },
  });

  const passwordHash = await bcrypt.hash(resolveSeedPassword(), 10);
  await prisma.user.upsert({
    where: { email: SEED_USER_EMAIL },
    update: { passwordHash },
    create: {
      email: SEED_USER_EMAIL,
      passwordHash,
      name: 'Leandro Borges',
    },
  });

  const pf = await prisma.financialEntity.upsert({
    where: { id: 'seed-pf' },
    update: {},
    create: {
      id: 'seed-pf',
      type: EntityType.PF,
      name: 'Pessoa Física',
    },
  });

  const pj = await prisma.financialEntity.upsert({
    where: { id: 'seed-pj' },
    update: {},
    create: {
      id: 'seed-pj',
      type: EntityType.PJ,
      name: 'Empresa',
    },
  });

  const members = [
    'Leandro',
    'Esposa',
    'Filha',
    'Casa',
    'Empresa',
  ];
  for (const name of members) {
    await prisma.householdMember.upsert({
      where: { name },
      update: { active: true },
      create: { name },
    });
  }

  const revenueCategories = [
    'Salário CLT',
    'Férias',
    '13º salário',
    'Orientações TCC',
    'Lançamentos avulsos',
    'Contratos recorrentes',
    'Clientes avulsos',
    'Aluguel recebido',
    'Outras receitas',
  ];
  for (const name of revenueCategories) {
    await prisma.category.upsert({
      where: { name_kind: { name, kind: CategoryKind.REVENUE } },
      update: {},
      create: { name, kind: CategoryKind.REVENUE },
    });
  }

  const expenseCategories = [
    'Moradia',
    'Alimentação',
    'Transporte',
    'Saúde',
    'Educação',
    'Lazer',
    'Impostos',
    'Serviços',
    'Folha / Pessoal',
    'Operacional empresa',
    'Cartão / Financiamentos',
    'Outras despesas',
  ];
  for (const name of expenseCategories) {
    await prisma.category.upsert({
      where: { name_kind: { name, kind: CategoryKind.EXPENSE } },
      update: {},
      create: { name, kind: CategoryKind.EXPENSE },
    });
  }

  const payers = [
    'Uni-FACEF',
    'Empresa - Microblau',
    'Empresa - Unimed',
    'Empresa - FIPEC',
    'Aluguel',
    'Clientes avulsos',
  ];
  for (const name of payers) {
    await prisma.payerSource.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  await prisma.contract.upsert({
    where: { id: 'seed-contract-microblau' },
    update: {},
    create: {
      id: 'seed-contract-microblau',
      clientName: 'Microblau',
      monthlyGross: 0,
      estimatedTax: 0,
      estimatedOpCost: 0,
      estimatedNet: 0,
      recurrence: RecurrenceFrequency.MONTHLY,
      status: ContractStatus.ATIVO,
      notes: 'Contrato pronto para edição',
    },
  });

  await prisma.contract.upsert({
    where: { id: 'seed-contract-unimed' },
    update: {},
    create: {
      id: 'seed-contract-unimed',
      clientName: 'Unimed',
      monthlyGross: 0,
      estimatedTax: 0,
      estimatedOpCost: 0,
      estimatedNet: 0,
      recurrence: RecurrenceFrequency.MONTHLY,
      status: ContractStatus.ATIVO,
      notes: 'Contrato pronto para edição',
    },
  });

  await prisma.contract.upsert({
    where: { id: 'seed-contract-fipec' },
    update: {},
    create: {
      id: 'seed-contract-fipec',
      clientName: 'FIPEC',
      monthlyGross: 0,
      estimatedTax: 0,
      estimatedOpCost: 0,
      estimatedNet: 0,
      recurrence: RecurrenceFrequency.MONTHLY,
      status: ContractStatus.ATIVO,
      notes: 'Contrato pronto para edição',
    },
  });

  console.log('Seed OK:', { pf: pf.id, pj: pj.id });
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
