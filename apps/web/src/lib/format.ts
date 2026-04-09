export function brl(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}

export function parseBrlInput(s: string): number {
  const t = s.replace(/\s/g, '').replace('R$', '').replace(/\./g, '').replace(',', '.');
  const v = parseFloat(t);
  return Number.isFinite(v) ? v : 0;
}

export function formatDateBr(d: string | Date) {
  const x = typeof d === 'string' ? new Date(d) : d;
  return x.toLocaleDateString('pt-BR');
}

/** Valor para `<input type="date">` no fuso local (hoje). */
export function todayDateInputValue(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Vencimento entre hoje 00:00 e hoje+`days` 23:59:59 (local). */
export function isDueWithinDaysFromToday(isoDue: string, days: number): boolean {
  const due = new Date(isoDue);
  if (Number.isNaN(due.getTime())) return false;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setDate(end.getDate() + days);
  end.setHours(23, 59, 59, 999);
  return due >= start && due <= end;
}
