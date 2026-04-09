# Monorepo: build frontend + NestJS; API serve estáticos e SQLite em /data/app.db
FROM node:20-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.14.2 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/
# Necessário antes de `pnpm install`: o postinstall do @lex/api roda `prisma generate`
COPY apps/api/prisma/schema.prisma apps/api/prisma/schema.prisma
COPY apps/web/package.json apps/web/

RUN pnpm install --frozen-lockfile

COPY apps ./apps

# Garante client alinhado ao schema final (migrations/seed no repositório completo)
RUN pnpm --filter @lex/api exec prisma generate --schema=prisma/schema.prisma

RUN pnpm run build

ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL=file:/data/app.db
ENV JWT_SECRET=change-me-in-production

WORKDIR /app/apps/api

EXPOSE 3000

CMD ["sh", "-c", "mkdir -p /data && npx prisma migrate deploy --schema=prisma/schema.prisma && node dist/main.js"]
