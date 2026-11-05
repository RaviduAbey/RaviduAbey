import { saveOnboarding } from './saveOnboarding';
import type { OnboardingDraft } from './draft';

const calls: { table: string; op: string; payload: unknown }[] = [];

jest.mock('@/src/lib/supabase', () => ({
  supabase: {
    from: (table: string) => ({
      upsert: (payload: unknown) => {
        calls.push({ table, op: 'upsert', payload });
        return Promise.resolve({ error: null });
      },
      insert: (payload: unknown) => {
        calls.push({ table, op: 'insert', payload });
        return { select: () => ({ single: () => Promise.resolve({ data: { id: 'trip-1' }, error: null }) }) };
      },
    }),
  },
}));

const draft: OnboardingDraft = {
  fullName: 'Anna Demo',
  phoneE164: '+61400000001',
  nationalityIso2: 'AU',
  arrival: '2027-01-12',
  departure: '2027-02-02',
  hasLicence: true,
  issuingCountryIso2: 'AU',
  licenceNumber: 'X123',
  expiryDate: '2030-06-30',
  hasIdp: true,
};

beforeEach(() => { calls.length = 0; });

test('saves profile, trip and licence with database column names', async () => {
  await expect(saveOnboarding('user-1', draft)).resolves.toEqual({ tripId: 'trip-1' });
  expect(calls).toEqual([
    { table: 'profiles', op: 'upsert', payload: { id: 'user-1', full_name: 'Anna Demo', phone_e164: '+61400000001', nationality_iso2: 'AU' } },
    { table: 'trips', op: 'insert', payload: { profile_id: 'user-1', arrival_date: '2027-01-12', departure_date: '2027-02-02' } },
    {
      table: 'licences', op: 'upsert',
      payload: { profile_id: 'user-1', has_licence: true, issuing_country_iso2: 'AU', licence_number: 'X123', expiry_date: '2030-06-30', has_idp: true },
    },
  ]);
});

test('without a licence the licence details are saved as null', async () => {
  await saveOnboarding('user-1', { ...draft, hasLicence: false });
  expect(calls[2]!.payload).toEqual({
    profile_id: 'user-1', has_licence: false, issuing_country_iso2: null, licence_number: null, expiry_date: null, has_idp: false,
  });
});
