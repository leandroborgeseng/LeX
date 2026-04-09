/**
 * Evita falha no `pnpm install` quando o schema ainda não existe (ex.: Docker antes de COPY apps).
 * Após o código completo, o Dockerfile roda `prisma generate` de novo.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const schema = path.join(root, 'prisma', 'schema.prisma');

if (!fs.existsSync(schema)) {
  console.log(
    '[@lex/api postinstall] prisma/schema.prisma ausente — pulando prisma generate (normal em estágio Docker inicial).',
  );
  process.exit(0);
}

execSync('prisma generate', { stdio: 'inherit', cwd: root });
