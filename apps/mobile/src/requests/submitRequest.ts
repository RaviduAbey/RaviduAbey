import { compareDates, type DocumentKind, type IsoDate, type RequestType } from '@tourist/core';
import { supabase } from '@/src/lib/supabase';
import { requiredFiles } from './requiredFiles';
import { uploadDocument } from './uploadDocument';

export type SubmitError = 'already_open' | 'missing_files' | 'passport_expires_before_departure' | 'upload_failed' | 'unknown';

export { requiredFiles };

export async function submitRequest(args: {
  profileId: string;
  tripId: string;
  departure: IsoDate;
  type: RequestType;
  hasIdp: boolean;
  details: Record<string, string>;
  files: { kind: DocumentKind; uri: string }[];
}): Promise<{ requestId: string } | { error: SubmitError }> {
  const have = new Set(args.files.map((f) => f.kind));
  if (!requiredFiles(args.type, args.hasIdp).every((k) => have.has(k))) return { error: 'missing_files' };

  if (args.type === 'eta_application') {
    const expiry = args.details.passportExpiry;
    if (!args.details.passportNumber?.trim() || !expiry) return { error: 'missing_files' };
    if (compareDates(expiry, args.departure) < 0) return { error: 'passport_expires_before_departure' };
  }

  const created = await supabase
    .from('service_requests')
    .insert({ profile_id: args.profileId, trip_id: args.tripId, type: args.type, details: args.details })
    .select('id')
    .single();
  if (created.error || !created.data) {
    return { error: created.error?.code === '23505' ? 'already_open' : 'unknown' };
  }
  const requestId = created.data.id;

  try {
    const paths = [];
    for (const file of args.files) {
      paths.push({ kind: file.kind, path: await uploadDocument(args.profileId, requestId, file.kind, file.uri) });
    }
    const docs = await supabase.from('request_documents').insert(
      paths.map((p) => ({ request_id: requestId, kind: p.kind, storage_path: p.path, uploaded_by: args.profileId })),
    );
    if (docs.error) throw new Error(docs.error.message);
  } catch {
    await supabase.rpc('change_request_status', {
      p_request_id: requestId, p_to_status: 'cancelled', p_note: 'Upload failed on the device',
    });
    return { error: 'upload_failed' };
  }

  return { requestId };
}
