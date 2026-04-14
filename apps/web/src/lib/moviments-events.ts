/** Evento global: receitas/despesas alteradas (qualquer ecrã). Ouvir para refrescar liquidez, dashboard, etc. */
export const LEX_MOVIMENTS_CHANGED = 'lex:moviments-changed';

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

/** Dispara um único evento após pequeno atraso (útil após várias mutações seguidas). */
export function notifyMovimentsChanged(): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    window.dispatchEvent(new CustomEvent(LEX_MOVIMENTS_CHANGED));
  }, 120);
}

function normalizePath(url: string): string {
  const raw = (url.split('?')[0] ?? '').trim();
  const withSlash = raw.startsWith('/') ? raw : `/${raw}`;
  return withSlash.replace(/\/+$/, '') || '/';
}

/** Mutações que alteram receitas/despesas na base usada pela liquidez mensal (competência). */
export function liquidityRelatedMutationUrl(url: string): boolean {
  const path = normalizePath(url);
  if (path === '/revenues' || path.startsWith('/revenues/')) return true;
  if (path === '/expenses' || path.startsWith('/expenses/')) return true;
  if (path === '/cdb-applications' || path.startsWith('/cdb-applications/')) return true;
  if (/\/financings\/[^/]+\/sync-expenses$/.test(path)) return true;
  if (path.includes('/reports/sync-liquidity-moviments')) return true;
  return false;
}
