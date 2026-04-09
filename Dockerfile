# Monorepo: API + frontend. SQLite em /data/app.db
# Copia `apps/` ANTES do `pnpm install` para existir `apps/api/prisma/schema.prisma` durante os postinstalls (Prisma/esbuild).
FROM node:20-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.14.2 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps ./apps
RUN chmod +x /app/apps/api/scripts/docker-entrypoint.sh

RUN pnpm install --frozen-lockfile

RUN pnpm --filter @lex/api exec prisma generate --schema=prisma/schema.prisma

RUN pnpm run build

ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL=file:/data/app.db
ENV JWT_SECRET=change-me-in-production

WORKDIR /app/apps/api

EXPOSE 3000

ENTRYPOINT ["/app/apps/api/scripts/docker-entrypoint.sh"]
