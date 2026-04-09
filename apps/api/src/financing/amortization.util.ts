import { addMonths } from '../common/utils/date.util';
import { AmortizationSystem } from '@prisma/client';

export type ScheduleRow = {
  number: number;
  dueDate: Date;
  payment: number;
  interest: number;
  amortization: number;
  balanceAfter: number;
};

export function buildSchedule(
  principal: number,
  monthlyRatePercent: number,
  installments: number,
  system: AmortizationSystem,
  startDate: Date,
): ScheduleRow[] {
  const i = monthlyRatePercent / 100;
  const rows: ScheduleRow[] = [];
  let balance = principal;

  if (system === AmortizationSystem.PRICE) {
    let pmt: number;
    if (i === 0) pmt = principal / installments;
    else
      pmt =
        (principal * i * Math.pow(1 + i, installments)) /
        (Math.pow(1 + i, installments) - 1);
    for (let k = 1; k <= installments; k++) {
      const interest = balance * i;
      const amort = Math.min(pmt - interest, balance);
      const payment = interest + amort;
      balance = Math.max(0, balance - amort);
      rows.push({
        number: k,
        dueDate: addMonths(startDate, k),
        payment: round2(payment),
        interest: round2(interest),
        amortization: round2(amort),
        balanceAfter: round2(balance),
      });
    }
    return rows;
  }

  const amortConst = principal / installments;
  for (let k = 1; k <= installments; k++) {
    const interest = balance * i;
    const amort = Math.min(amortConst, balance);
    const payment = interest + amort;
    balance = Math.max(0, balance - amort);
    rows.push({
      number: k,
      dueDate: addMonths(startDate, k),
      payment: round2(payment),
      interest: round2(interest),
      amortization: round2(amort),
      balanceAfter: round2(balance),
    });
  }
  return rows;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
