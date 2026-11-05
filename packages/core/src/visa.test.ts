import { expect, test } from 'vitest';
import { assessVisa } from './visa';
import type { VisaRule } from './types';

// Fixture rules, not real data.
const rules: VisaRule[] = [
  { countryIso2: 'IN', feeUsd: 0, maxStayDays: 30 },
  { countryIso2: 'DE', feeUsd: 50, maxStayDays: 30 },
];

test('free ETA within 30 days', () =>
  expect(assessVisa({ nationalityIso2: 'IN', arrival: '2027-01-01', departure: '2027-01-30' }, rules))
    .toEqual({ kind: 'eta_free', stayDays: 30, maxStayDays: 30 }));

test('paid ETA', () =>
  expect(assessVisa({ nationalityIso2: 'DE', arrival: '2027-01-01', departure: '2027-01-10' }, rules))
    .toEqual({ kind: 'eta_paid', feeUsd: 50, stayDays: 10, maxStayDays: 30 }));

test('stay over limit', () =>
  expect(assessVisa({ nationalityIso2: 'IN', arrival: '2027-01-01', departure: '2027-01-31' }, rules).kind)
    .toBe('stay_exceeds_eta'));

test('unknown country is never free', () =>
  expect(assessVisa({ nationalityIso2: 'ZZ', arrival: '2027-01-01', departure: '2027-01-05' }, rules))
    .toEqual({ kind: 'unknown_country' }));

test('lowercase nationality is normalised', () =>
  expect(assessVisa({ nationalityIso2: 'in', arrival: '2027-01-01', departure: '2027-01-05' }, rules).kind)
    .toBe('eta_free'));
