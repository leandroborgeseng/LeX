/**
 * IR sobre ganho de renda fixa (CDB etc.) — dias corridos na aplicação.
 * Lei 11.033/2004 (valores usuais até 720 dias).
 */
export function irRateOnFixedIncomeGain(calendarDaysHeld: number): number {
  if (calendarDaysHeld <= 0) return 0;
  if (calendarDaysHeld <= 180) return 0.225;
  if (calendarDaysHeld <= 360) return 0.2;
  if (calendarDaysHeld <= 720) return 0.175;
  return 0.15;
}

export function calendarDaysBetweenUtc(start: Date, end: Date): number {
  const a = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const b = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.max(0, Math.floor((b - a) / 86400000));
}

/** Último dia do mês: offset 0 = mês corrente, 1 = próximo, … */
export function monthEndUtc(base: Date, monthOffset: number): Date {
  return new Date(base.getFullYear(), base.getMonth() + monthOffset + 1, 0);
}

/**
 * Rendimento bruto acumulado: CDI anual assumido × (% do CDI), capitalização equivalente 365 dias corridos.
 * (Aproximação; CDI real usa 252 dias úteis — ajuste `assumedCdiAnnualPercent` se quiser calibrar.)
 */
export function grossBalanceAtDays(
  principal: number,
  cdiAnnualPercent: number,
  percentOfCdi: number,
  calendarDays: number,
): number {
  if (calendarDays <= 0 || principal <= 0) return principal;
  const cdi = cdiAnnualPercent / 100;
  const idx = percentOfCdi / 100;
  const annualEff = cdi * idx;
  return principal * Math.pow(1 + annualEff, calendarDays / 365);
}

export type CdbProjectionRow = {
  month: string;
  monthEnd: string;
  totalPrincipal: number;
  totalGross: number;
  totalGain: number;
  totalIr: number;
  totalNet: number;
  applications: {
    id: string;
    name: string;
    principal: number;
    gross: number;
    gain: number;
    ir: number;
    net: number;
    daysHeld: number;
    irRateApplied: number;
    effectiveAnnualYieldPercent: number;
  }[];
};

export function projectCdbPortfolio(
  apps: {
    id: string;
    name: string;
    principal: number;
    applicationDate: Date;
    maturityDate: Date | null;
    indexerPercentOfCdi: number;
    assumedCdiAnnualPercent: number;
  }[],
  monthCount: number,
  baseDate = new Date(),
): { methodology: string; months: CdbProjectionRow[] } {
  const methodology =
    'Bruto: (1 + CDI_a.a. × %CDI)^(dias/365). IR: sobre o ganho acumulado, alíquota única conforme dias corridos desde a aplicação (22,5% até 180d; 20% até 360d; 17,5% até 720d; 15% acima). Aproximação; não substitui extrato do banco.';

  const months: CdbProjectionRow[] = [];

  for (let m = 0; m < monthCount; m++) {
    const monthEnd = monthEndUtc(baseDate, m);
    const monthLabel = `${monthEnd.getFullYear()}-${String(monthEnd.getMonth() + 1).padStart(2, '0')}`;

    let totalPrincipal = 0;
    let totalGross = 0;
    let totalGain = 0;
    let totalIr = 0;
    const applicationRows: CdbProjectionRow['applications'] = [];

    for (const app of apps) {
      const principal = app.principal;
      totalPrincipal += principal;

      const mat = app.maturityDate;
      const evalDate =
        mat && monthEnd.getTime() > mat.getTime()
          ? new Date(mat.getFullYear(), mat.getMonth(), mat.getDate())
          : monthEnd;

      const daysHeld = calendarDaysBetweenUtc(app.applicationDate, evalDate);
      const gross = grossBalanceAtDays(
        principal,
        app.assumedCdiAnnualPercent,
        app.indexerPercentOfCdi,
        daysHeld,
      );
      const gain = Math.max(0, gross - principal);
      const irRate = irRateOnFixedIncomeGain(daysHeld);
      const ir = gain * irRate;
      const net = gross - ir;

      totalGross += gross;
      totalGain += gain;
      totalIr += ir;

      const years = daysHeld / 365;
      const effectiveAnnualYieldPercent =
        years > 0 && principal > 0 ? (Math.pow(gross / principal, 1 / years) - 1) * 100 : 0;

      applicationRows.push({
        id: app.id,
        name: app.name,
        principal,
        gross,
        gain,
        ir,
        net,
        daysHeld,
        irRateApplied: irRate,
        effectiveAnnualYieldPercent: Math.round(effectiveAnnualYieldPercent * 100) / 100,
      });
    }

    months.push({
      month: monthLabel,
      monthEnd: monthEnd.toISOString().slice(0, 10),
      totalPrincipal: round2(totalPrincipal),
      totalGross: round2(totalGross),
      totalGain: round2(totalGain),
      totalIr: round2(totalIr),
      totalNet: round2(totalGross - totalIr),
      applications: applicationRows.map((r) => ({
        ...r,
        principal: round2(r.principal),
        gross: round2(r.gross),
        gain: round2(r.gain),
        ir: round2(r.ir),
        net: round2(r.net),
        irRateApplied: r.irRateApplied,
        effectiveAnnualYieldPercent: r.effectiveAnnualYieldPercent,
      })),
    });
  }

  return { methodology, months };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
