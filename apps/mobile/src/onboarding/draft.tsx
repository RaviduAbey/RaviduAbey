import type { CountryCode, IsoDate } from '@tourist/core';
import { createContext, useContext, useState, type ReactNode } from 'react';

export interface OnboardingDraft {
  fullName: string;
  phoneE164: string;
  nationalityIso2: CountryCode;
  arrival: IsoDate;
  departure: IsoDate;
  hasLicence: boolean;
  issuingCountryIso2?: CountryCode;
  licenceNumber?: string;
  expiryDate?: IsoDate;
  hasIdp: boolean;
}

const EMPTY: OnboardingDraft = {
  fullName: '',
  phoneE164: '',
  nationalityIso2: '',
  arrival: '',
  departure: '',
  hasLicence: false,
  hasIdp: false,
};

/** Strips spaces, dashes and brackets: " +44 7700-900 123 " -> "+447700900123". */
export function normalisePhone(raw: string): string {
  return raw.replace(/[\s\-()]/g, '');
}

export function isValidPhone(phone: string): boolean {
  return /^\+[1-9][0-9]{6,14}$/.test(phone);
}

interface DraftState {
  draft: OnboardingDraft;
  update(patch: Partial<OnboardingDraft>): void;
}

const DraftContext = createContext<DraftState | null>(null);

export function DraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<OnboardingDraft>(EMPTY);
  return (
    <DraftContext.Provider value={{ draft, update: (patch) => setDraft((d) => ({ ...d, ...patch })) }}>
      {children}
    </DraftContext.Provider>
  );
}

export function useOnboardingDraft(): DraftState {
  const ctx = useContext(DraftContext);
  if (!ctx) throw new Error('useOnboardingDraft must be used inside <DraftProvider>');
  return ctx;
}
