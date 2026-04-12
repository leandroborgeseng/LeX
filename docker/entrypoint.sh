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

# Railway / painéis enviam por vezes "true" em vez de "1" — normalizar.
_lex_truthy() {
  _v=$(printf '%s' "${1:-0}" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | tr '[:upper:]' '[:lower:]')
  case "$_v" in 1|true|yes|on) return 0 ;; *) return 1 ;; esac
}

echo "LeX: DATABASE_URL=${DATABASE_URL}"
echo "LeX: migrando…"
npx prisma migrate deploy --schema=prisma/schema.prisma

# Seed: (A) base vazia — automático; (B) LEX_RUN_SEED_ON_BOOT truthy — força seed (repõe hash).
# Remova LEX_RUN_SEED_ON_BOOT após entrar. LEX_ALLOW_SEED_IN_PROD só nestes ramos.
# LEX_SKIP_AUTO_SEED truthy desativa qualquer seed.
if _lex_truthy "${LEX_SKIP_AUTO_SEED:-0}"; then
  echo "LeX: LEX_SKIP_AUTO_SEED ativo — seed ignorado."
elif _lex_truthy "${LEX_RUN_SEED_ON_BOOT:-0}"; then
    echo "LeX: LEX_RUN_SEED_ON_BOOT ativo — a executar prisma db seed (sincroniza utilizador/senha)." >&2
    echo "LeX: Remova LEX_RUN_SEED_ON_BOOT no painel após confirmar o login." >&2
    export LEX_ALLOW_SEED_IN_PROD=1
    npx prisma db seed --schema=prisma/schema.prisma
  else
    set +e
    node scripts/auto-seed-if-empty.cjs
    seed_check=$?
    set -e
    if [ "$seed_check" -eq 0 ]; then
      echo "LeX: base sem utilizadores — a executar seed (defina LEX_SEED_PASSWORD; ver README)…"
      export LEX_ALLOW_SEED_IN_PROD=1
      npx prisma db seed --schema=prisma/schema.prisma
    elif [ "$seed_check" -ne 2 ]; then
      echo "LeX: aviso — não foi possível verificar utilizadores (código $seed_check)." >&2
    fi
fi

chmod -R a+rwX "$DATA_DIR" 2>/dev/null || true

echo "LeX: iniciando API na porta ${PORT:-3000}…"
exec node dist/main.js
