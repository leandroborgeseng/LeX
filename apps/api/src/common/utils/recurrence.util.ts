import { RecurrenceFrequency } from '@prisma/client';
import { addMonths } from './date.util';

export const DEFAULT_FUTURE_OCCURRENCES = 24;

export function nextCompetence(
  base: Date,
  stepIndex: number,
  frequency: RecurrenceFrequency,
): Date {
  if (frequency === RecurrenceFrequency.YEARLY) {
    return addMonths(base, stepIndex * 12);
  }
  return addMonths(base, stepIndex);
}
