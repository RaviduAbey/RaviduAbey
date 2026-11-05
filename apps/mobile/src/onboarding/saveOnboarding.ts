import { supabase } from '@/src/lib/supabase';
import type { OnboardingDraft } from './draft';

/** Saves the sign-up answers. Profile first, because trip and licence reference it. */
export async function saveOnboarding(userId: string, draft: OnboardingDraft): Promise<{ tripId: string }> {
  const profile = await supabase.from('profiles').upsert({
    id: userId,
    full_name: draft.fullName.trim(),
    phone_e164: draft.phoneE164,
    nationality_iso2: draft.nationalityIso2,
  });
  if (profile.error) throw new Error(profile.error.message);

  const trip = await supabase
    .from('trips')
    .insert({ profile_id: userId, arrival_date: draft.arrival, departure_date: draft.departure })
    .select('id')
    .single();
  if (trip.error || !trip.data) throw new Error(trip.error?.message ?? 'Could not save your trip.');

  const has = draft.hasLicence;
  const licence = await supabase.from('licences').upsert({
    profile_id: userId,
    has_licence: has,
    issuing_country_iso2: has ? draft.issuingCountryIso2 ?? null : null,
    licence_number: has ? draft.licenceNumber?.trim() || null : null,
    expiry_date: has ? draft.expiryDate ?? null : null,
    has_idp: has ? draft.hasIdp : false,
  });
  if (licence.error) throw new Error(licence.error.message);

  return { tripId: trip.data.id };
}
