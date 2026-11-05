import { stayDays } from './dates';
import type { CountryCode, IsoDate, VisaRule } from './types';

export type VisaAssessment =
  | { kind: 'eta_free'; stayDays: number; maxStayDays: number }
  | { kind: 'eta_paid'; feeUsd: number; stayDays: number; maxStayDays: number }
  | { kind: 'stay_exceeds_eta'; feeUsd: number; stayDays: number; maxStayDays: number }
  | { kind: 'unknown_country' };

export function assessVisa(
  input: { nationalityIso2: CountryCode; arrival: IsoDate; departure: IsoDate },
  rules: VisaRule[],
): VisaAssessment {
  const code = input.nationalityIso2.toUpperCase();
  const rule = rules.find((r) => r.countryIso2.toUpperCase() === code);
  if (!rule) return { kind: 'unknown_country' };

  const days = stayDays(input.arrival, input.departure);
  if (days > rule.maxStayDays) {
    return { kind: 'stay_exceeds_eta', feeUsd: rule.feeUsd, stayDays: days, maxStayDays: rule.maxStayDays };
  }
  if (rule.feeUsd === 0) return { kind: 'eta_free', stayDays: days, maxStayDays: rule.maxStayDays };
  return { kind: 'eta_paid', feeUsd: rule.feeUsd, stayDays: days, maxStayDays: rule.maxStayDays };
}
