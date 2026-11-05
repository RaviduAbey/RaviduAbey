import type { IsoDate } from './types';

const DAY_MS = 86_400_000;

function toUtcMs(date: IsoDate): number {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y!, m! - 1, d!);
}

/** Calendar days from arrival to departure, inclusive. */
export function stayDays(arrival: IsoDate, departure: IsoDate): number {
  return Math.round((toUtcMs(departure) - toUtcMs(arrival)) / DAY_MS) + 1;
}

/** Compares two ISO dates. Negative when a < b. */
export function compareDates(a: IsoDate, b: IsoDate): number {
  return toUtcMs(a) - toUtcMs(b);
}
