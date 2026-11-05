import {
  assessLicence, assessVisa, isTerminal, REQUEST_STATUSES,
  type Database, type IsoDate, type LicenceAssessment, type RequestStatus, type RequestType, type Tables, type VisaAssessment,
} from '@tourist/core';
import type { SupabaseClient } from '@supabase/supabase-js';

type Client = SupabaseClient<Database>;

export const OPEN_STATUSES: RequestStatus[] = REQUEST_STATUSES.filter((s) => !isTerminal(s));

export interface InboxRow {
  id: string;
  type: RequestType;
  status: RequestStatus;
  touristName: string;
  nationalityIso2: string;
  arrivalDate: IsoDate;
  createdAt: string;
}

export async function listRequests(
  supabase: Client,
  filter: { type?: RequestType; status?: RequestStatus[] },
): Promise<InboxRow[]> {
  let query = supabase
    .from('service_requests')
    .select('id, type, status, created_at, profiles(full_name, nationality_iso2), trips(arrival_date)')
    .in('status', filter.status?.length ? filter.status : OPEN_STATUSES);
  if (filter.type) query = query.eq('type', filter.type);
  const { data, error } = await query.order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id,
    type: r.type as RequestType,
    status: r.status as RequestStatus,
    touristName: r.profiles?.full_name ?? '—',
    nationalityIso2: r.profiles?.nationality_iso2 ?? '',
    arrivalDate: r.trips?.arrival_date ?? '',
    createdAt: r.created_at,
  }));
}

export interface RequestDetail {
  request: Tables<'service_requests'>;
  profile: Tables<'profiles'>;
  trip: Tables<'trips'>;
  licence: Tables<'licences'> | null;
  documents: { id: string; kind: string; createdAt: string; signedUrl: string | null; isImage: boolean }[];
  events: Tables<'request_events'>[];
  visa: VisaAssessment;
  driving: LicenceAssessment;
}

const SIGNED_URL_SECONDS = 600;

export async function getRequestDetail(supabase: Client, id: string): Promise<RequestDetail | null> {
  const { data: request } = await supabase.from('service_requests').select('*').eq('id', id).maybeSingle();
  if (!request) return null;

  const [profile, trip, licence, docs, events, rules] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', request.profile_id).single(),
    supabase.from('trips').select('*').eq('id', request.trip_id).single(),
    supabase.from('licences').select('*').eq('profile_id', request.profile_id).maybeSingle(),
    supabase.from('request_documents').select('*').eq('request_id', id).order('created_at'),
    supabase.from('request_events').select('*').eq('request_id', id).order('created_at'),
    supabase.from('country_visa_rules').select('country_iso2, fee_usd, max_stay_days'),
  ]);
  if (!profile.data || !trip.data) return null;

  const paths = (docs.data ?? []).map((d) => d.storage_path);
  const signed = paths.length
    ? (await supabase.storage.from('documents').createSignedUrls(paths, SIGNED_URL_SECONDS)).data ?? []
    : [];
  const urlFor = new Map(signed.map((s) => [s.path, s.error ? null : s.signedUrl]));

  return {
    request,
    profile: profile.data,
    trip: trip.data,
    licence: licence.data ?? null,
    documents: (docs.data ?? []).map((d) => ({
      id: d.id,
      kind: d.kind,
      createdAt: d.created_at,
      signedUrl: urlFor.get(d.storage_path) ?? null,
      isImage: /\.(png|jpe?g|webp|gif|heic)$/i.test(d.storage_path),
    })),
    events: events.data ?? [],
    visa: assessVisa(
      { nationalityIso2: profile.data.nationality_iso2, arrival: trip.data.arrival_date, departure: trip.data.departure_date },
      (rules.data ?? []).map((r) => ({ countryIso2: r.country_iso2, feeUsd: Number(r.fee_usd), maxStayDays: r.max_stay_days })),
    ),
    driving: assessLicence({
      hasLicence: licence.data?.has_licence ?? false,
      expiryDate: licence.data?.expiry_date ?? undefined,
      hasIdp: licence.data?.has_idp ?? false,
      departure: trip.data.departure_date,
    }),
  };
}
