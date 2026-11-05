import { expect, test } from 'vitest';
import { isTerminal, nextStatuses } from './requests';

// The matrix the SQL function change_request_status must mirror.
test('submitted', () => {
  expect(nextStatuses('submitted', 'staff')).toEqual(['in_review']);
  expect(nextStatuses('submitted', 'tourist')).toEqual(['cancelled']);
});

test('in_review', () => {
  expect(nextStatuses('in_review', 'staff')).toEqual(['needs_info', 'completed', 'rejected']);
  expect(nextStatuses('in_review', 'tourist')).toEqual([]);
});

test('needs_info', () => {
  expect(nextStatuses('needs_info', 'tourist')).toEqual(['in_review', 'cancelled']);
  expect(nextStatuses('needs_info', 'staff')).toEqual(['in_review']);
});

test('terminal statuses', () => {
  for (const s of ['completed', 'rejected', 'cancelled'] as const) {
    expect(isTerminal(s)).toBe(true);
    expect(nextStatuses(s, 'staff')).toEqual([]);
    expect(nextStatuses(s, 'tourist')).toEqual([]);
  }
  expect(isTerminal('submitted')).toBe(false);
});
