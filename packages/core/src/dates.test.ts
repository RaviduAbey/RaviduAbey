import { describe, expect, test } from 'vitest';
import { stayDays } from './dates';

describe('stayDays', () => {
  test('counts arrival and departure days inclusive', () => {
    expect(stayDays('2027-01-01', '2027-01-30')).toBe(30);
  });
  test('same-day trip is one day', () => {
    expect(stayDays('2027-01-01', '2027-01-01')).toBe(1);
  });
  test('crosses month end', () => {
    expect(stayDays('2027-02-27', '2027-03-01')).toBe(3);
  });
});
