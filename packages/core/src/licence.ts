import { compareDates } from './dates';
import type { IsoDate } from './types';

export type PermitRoute = 'aa_ceylon_recognition' | 'dmt_temporary_permit';

export type LicenceAssessment =
  | { kind: 'no_licence' }
  | { kind: 'licence_expires_during_trip'; expiryDate: IsoDate }
  | { kind: 'eligible_for_permit'; route: PermitRoute };

export function assessLicence(input: {
  hasLicence: boolean;
  expiryDate?: IsoDate;
  hasIdp: boolean;
  departure: IsoDate;
}): LicenceAssessment {
  if (!input.hasLicence) return { kind: 'no_licence' };
  if (input.expiryDate && compareDates(input.expiryDate, input.departure) < 0) {
    return { kind: 'licence_expires_during_trip', expiryDate: input.expiryDate };
  }
  return { kind: 'eligible_for_permit', route: input.hasIdp ? 'aa_ceylon_recognition' : 'dmt_temporary_permit' };
}
