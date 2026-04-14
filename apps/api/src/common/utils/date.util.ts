export function addMonths(d: Date, months: number): Date {
  const x = new Date(d.getTime());
  const day = x.getDate();
  x.setMonth(x.getMonth() + months);
  if (x.getDate() < day) x.setDate(0);
  return x;
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function parseYearMonth(y: number, m: number): { start: Date; end: Date } {
  const start = new Date(y, m - 1, 1);
  const end = endOfMonth(start);
  return { start, end };
}

/**
 * Ano e mês (1–12) civis da data de competência, usando o calendário UTC (YYYY-MM-DD em ISO).
 * Evita deslocar o mês só por fuso ao usar `getMonth()`/`getFullYear()` locais em valores guardados em UTC.
 */
export function competenceUtcYearMonth1(d: Date | string): { year: number; month1: number } | null {
  const dt = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(dt.getTime())) return null;
  const day = dt.toISOString().slice(0, 10);
  const year = parseInt(day.slice(0, 4), 10);
  const month1 = parseInt(day.slice(5, 7), 10);
  if (!Number.isFinite(year) || !Number.isFinite(month1) || month1 < 1 || month1 > 12) return null;
  return { year, month1 };
}
