/** ISO date string `YYYY-MM-DD` (Sri Lanka time). */
export type IsoDate = string;
/** ISO 3166-1 alpha-2 country code, uppercase. */
export type CountryCode = string;

export interface VisaRule {
  countryIso2: CountryCode;
  /** 0 means the ETA is free. */
  feeUsd: number;
  maxStayDays: number;
}
