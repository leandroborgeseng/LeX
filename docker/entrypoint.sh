#!/bin/sh
set -e

# Imagem única: SQLite em volume (ex.: /data). Railway: monte persistência em /data.
DATA_DIR="${LEX_DATA_DIR:-/data}"
mkdir -p "$DATA_DIR"

if ! touch "$DATA_DIR/.lex-write-test" 2>/dev/null; then
  echo "LeX: ERRO — '$DATA_DIR' não é gravável. Monte um volume em /data (ou defina LEX_DATA_DIR)." >&2
  exit 1
fi
rm -f "$DATA_DIR/.lex-write-test"

if [ -z "$DATABASE_URL" ]; then
  export DATABASE_URL="file://${DATA_DIR}/app.db"
fi

# file:/absoluto → file:///absoluto (SQLite no Linux)
if [ "${DATABASE_URL#file:/}" != "$DATABASE_URL" ] && [ "${DATABASE_URL#file://}" = "$DATABASE_URL" ]; then
  path="${DATABASE_URL#file:}"
  export DATABASE_URL="file://${path}"
fi

cd /app/apps/api

# Railway às vezes manda "true" em vez de "1"
_lex_truthy() {
  _v=$(printf '%s' "${1:-0}" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | tr '[:upper:]' '[:lower:]')
  case "$_v" in 1|true|yes|on) return 0 ;; *) return 1 ;; esac
}

echo "LeX: DATABASE_URL=${DATABASE_URL}"
echo "LeX: migrando…"
npx prisma migrate deploy --schema=prisma/schema.prisma

# Sempre roda o seed após migrate (idempotente: atualiza senha do usuário seed, upserts).
# Desligue só com LEX_SKIP_AUTO_SEED=true (ex.: job só de migração).
if _lex_truthy "${LEX_SKIP_AUTO_SEED:-0}"; then
  echo "LeX: LEX_SKIP_AUTO_SEED ativo — seed ignorado."
else
  echo "LeX: executando prisma db seed…"
  export LEX_ALLOW_SEED_IN_PROD=1
  npx prisma db seed --schema=prisma/schema.prisma
fi

chmod -R a+rwX "$DATA_DIR" 2>/dev/null || true

echo "LeX: iniciando API na porta ${PORT:-3000}…"
exec node dist/main.js
