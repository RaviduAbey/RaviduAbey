import {
  assessLicence, assessVisa, isTerminal,
  type LicenceAssessment, type RequestStatus, type RequestType, type Tables, type VisaAssessment, type VisaRule,
} from '@tourist/core';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import { useSession } from '@/src/lib/session';

export type TripRow = Tables<'trips'>;
export type LicenceRow = Tables<'licences'>;
export type ServiceRequestRow = Tables<'service_requests'>;

export interface Checklist {
  visa: VisaAssessment;
  licence: LicenceAssessment;
  trip: TripRow;
  licenceRow: LicenceRow | null;
  openRequests: Partial<Record<RequestType, ServiceRequestRow>>;
}

let rulesCache: VisaRule[] | null = null;

async function loadVisaRules(): Promise<VisaRule[]> {
  if (rulesCache) return rulesCache;
  const { data, error } = await supabase.from('country_visa_rules').select('country_iso2, fee_usd, max_stay_days');
  if (error) throw new Error(error.message);
  rulesCache = (data ?? []).map((r) => ({ countryIso2: r.country_iso2, feeUsd: Number(r.fee_usd), maxStayDays: r.max_stay_days }));
  return rulesCache;
}

export function useChecklist(): { data: Checklist | null; error: string | null; reload: () => Promise<void> } {
  const { session, profile } = useSession();
  const [data, setData] = useState<Checklist | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!session || !profile) return;
    try {
      setError(null);
      const [rules, tripRes, licenceRes] = await Promise.all([
        loadVisaRules(),
        supabase.from('trips').select('*').eq('profile_id', session.user.id).order('created_at', { ascending: false }).limit(1).single(),
        supabase.from('licences').select('*').eq('profile_id', session.user.id).maybeSingle(),
      ]);
      if (tripRes.error || !tripRes.data) throw new Error(tripRes.error?.message ?? 'No trip');
      const trip = tripRes.data;
      const lic = licenceRes.data ?? null;

      const reqRes = await supabase.from('service_requests').select('*').eq('trip_id', trip.id);
      const openRequests: Checklist['openRequests'] = {};
      for (const r of reqRes.data ?? []) {
        if (!isTerminal(r.status as RequestStatus)) openRequests[r.type as RequestType] = r;
      }

      setData({
        trip,
        licenceRow: lic,
        visa: assessVisa({ nationalityIso2: profile.nationality_iso2, arrival: trip.arrival_date, departure: trip.departure_date }, rules),
        licence: assessLicence({
          hasLicence: lic?.has_licence ?? false,
          expiryDate: lic?.expiry_date ?? undefined,
          hasIdp: lic?.has_idp ?? false,
          departure: trip.departure_date,
        }),
        openRequests,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [session, profile]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  return { data, error, reload };
}
