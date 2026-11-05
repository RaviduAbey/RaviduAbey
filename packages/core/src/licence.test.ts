import { expect, test } from 'vitest';
import { assessLicence } from './licence';

test('no licence', () =>
  expect(assessLicence({ hasLicence: false, hasIdp: false, departure: '2027-01-10' })).toEqual({ kind: 'no_licence' }));

test('licence expires before departure', () =>
  expect(assessLicence({ hasLicence: true, expiryDate: '2027-01-05', hasIdp: true, departure: '2027-01-10' }))
    .toEqual({ kind: 'licence_expires_during_trip', expiryDate: '2027-01-05' }));

test('with IDP -> AA Ceylon recognition permit', () =>
  expect(assessLicence({ hasLicence: true, expiryDate: '2030-01-01', hasIdp: true, departure: '2027-01-10' }))
    .toEqual({ kind: 'eligible_for_permit', route: 'aa_ceylon_recognition' }));

test('without IDP -> DMT temporary permit', () =>
  expect(assessLicence({ hasLicence: true, expiryDate: '2030-01-01', hasIdp: false, departure: '2027-01-10' }))
    .toEqual({ kind: 'eligible_for_permit', route: 'dmt_temporary_permit' }));

test('licence valid through departure day', () =>
  expect(assessLicence({ hasLicence: true, expiryDate: '2027-01-10', hasIdp: false, departure: '2027-01-10' }).kind)
    .toBe('eligible_for_permit'));
