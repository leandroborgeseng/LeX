/**
 * Roda na raiz do monorepo após `pnpm install`.
 * No Docker, antes de `COPY apps`, não existe `apps/api/prisma/schema.prisma` — sai 0 sem falhar.
 * Depois do COPY completo, o Dockerfile executa `prisma generate` explicitamente.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const schema = path.join(root, 'apps', 'api', 'prisma', 'schema.prisma');

if (!fs.existsSync(schema)) {
  console.log(
    '[lex-finance postinstall] apps/api/prisma/schema.prisma ausente — pulando prisma generate (estágio Docker inicial).',
  );
  process.exit(0);
}

execSync('pnpm --filter @lex/api exec prisma generate --schema=prisma/schema.prisma', {
  stdio: 'inherit',
  cwd: root,
});
