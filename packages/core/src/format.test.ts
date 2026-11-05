import { expect, test } from 'vitest';
import { formatColomboDateTime } from './format';

test('formats a UTC timestamp in Sri Lanka time (UTC+5:30)', () => {
  expect(formatColomboDateTime('2027-01-01T08:00:00Z')).toBe('1 Jan 2027, 13:30');
  expect(formatColomboDateTime('2027-12-31T20:00:00+00:00')).toBe('1 Jan 2028, 01:30');
});
