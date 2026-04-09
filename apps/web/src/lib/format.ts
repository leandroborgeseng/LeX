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
