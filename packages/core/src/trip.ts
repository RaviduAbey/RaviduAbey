import { compareDates } from './dates';
import type { IsoDate } from './types';

export type TripError = 'departure_before_arrival' | 'arrival_in_past';

export function validateTrip(
  arrival: IsoDate,
  departure: IsoDate,
  today: IsoDate,
): { ok: true } | { ok: false; error: TripError } {
  if (compareDates(departure, arrival) < 0) return { ok: false, error: 'departure_before_arrival' };
  if (compareDates(arrival, today) < 0) return { ok: false, error: 'arrival_in_past' };
  return { ok: true };
}

/** Today's date in Sri Lanka as `YYYY-MM-DD`. */
export function todayInColombo(now: Date = new Date()): IsoDate {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo' }).format(now);
}
