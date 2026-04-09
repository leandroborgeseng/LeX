# Monorepo: build frontend + NestJS; API serve estáticos e SQLite em /data/app.db
FROM node:20-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.14.2 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY scripts/docker-postinstall.cjs scripts/docker-postinstall.cjs
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/

# postinstall na raiz só gera Prisma se apps/api/prisma/schema.prisma já existir (no estágio inicial, não existe)
RUN pnpm install --frozen-lockfile

COPY apps ./apps

RUN pnpm --filter @lex/api exec prisma generate --schema=prisma/schema.prisma

RUN pnpm run build

ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL=file:/data/app.db
ENV JWT_SECRET=change-me-in-production

WORKDIR /app/apps/api

EXPOSE 3000

CMD ["sh", "-c", "mkdir -p /data && npx prisma migrate deploy --schema=prisma/schema.prisma && node dist/main.js"]
