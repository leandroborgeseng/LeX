# =============================================================================
# LeX — container único (produção)
#   1) Build do Vite (apps/web) → dist
#   2) Build do Nest (apps/api) + copy-frontend → public/
#   3) Runtime: um processo Node em PORT (API /api + SPA na raiz), SQLite em /data
# =============================================================================
FROM node:20-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.14.2 --activate

COPY docker/entrypoint.sh /usr/local/bin/lex-entrypoint.sh
RUN chmod +x /usr/local/bin/lex-entrypoint.sh

# Manifestos do workspace
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# apps/ ANTES do install: Prisma schema precisa existir no postinstall/generate
COPY apps ./apps

RUN pnpm install --frozen-lockfile

RUN pnpm --filter @lex/api exec prisma generate --schema=prisma/schema.prisma

RUN pnpm run build

ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL=file:/data/app.db
ENV JWT_SECRET=change-me-in-production

WORKDIR /app/apps/api

EXPOSE 3000

ENTRYPOINT ["/usr/local/bin/lex-entrypoint.sh"]
