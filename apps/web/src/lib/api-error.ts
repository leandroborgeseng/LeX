/** Extrai mensagem legível de respostas Nest (validation pipe devolve `message` string ou array). */
export function apiErrorMessage(data: unknown): string {
  if (!data || typeof data !== 'object') return 'Não foi possível salvar.';
  const m = (data as { message?: unknown }).message;
  if (typeof m === 'string') return m;
  if (Array.isArray(m)) return m.filter(Boolean).join(' ');
  return 'Não foi possível salvar.';
}
