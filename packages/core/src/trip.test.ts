import { expect, test } from 'vitest';
import { validateTrip } from './trip';

test('departure before arrival', () =>
  expect(validateTrip('2027-01-10', '2027-01-05', '2026-12-01')).toEqual({ ok: false, error: 'departure_before_arrival' }));

test('arrival in the past', () =>
  expect(validateTrip('2026-11-01', '2026-11-10', '2026-11-05')).toEqual({ ok: false, error: 'arrival_in_past' }));

test('arriving today is fine', () =>
  expect(validateTrip('2026-11-05', '2026-11-05', '2026-11-05')).toEqual({ ok: true }));
