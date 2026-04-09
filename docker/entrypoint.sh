#!/bin/sh
set -e

# Imagem única: SQLite em volume (ex.: /data). Railway/local: monte persistência aqui.
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

echo "LeX: DATABASE_URL=${DATABASE_URL}"
echo "LeX: migrando…"
npx prisma migrate deploy --schema=prisma/schema.prisma

if [ "${LEX_SKIP_AUTO_SEED:-0}" != "1" ]; then
  set +e
  node scripts/auto-seed-if-empty.cjs
  seed_check=$?
  set -e
  if [ "$seed_check" -eq 0 ]; then
    echo "LeX: base sem utilizadores — a executar seed (admin@lex.local / admin123)…"
    npx prisma db seed --schema=prisma/schema.prisma
  elif [ "$seed_check" -ne 2 ]; then
    echo "LeX: aviso — não foi possível verificar utilizadores (código $seed_check)." >&2
  fi
fi

chmod -R a+rwX "$DATA_DIR" 2>/dev/null || true

echo "LeX: iniciando API na porta ${PORT:-3000}…"
exec node dist/main.js
