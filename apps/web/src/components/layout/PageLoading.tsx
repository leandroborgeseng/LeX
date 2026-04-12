/** Fallback do Suspense para rotas carregadas sob demanda. */
export function PageLoading() {
  return (
    <div
      className="flex min-h-[min(50dvh,320px)] flex-col items-center justify-center gap-2 px-4 text-center text-sm text-foreground/70"
      role="status"
      aria-live="polite"
    >
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden />
      <span>Carregando…</span>
    </div>
  );
}
