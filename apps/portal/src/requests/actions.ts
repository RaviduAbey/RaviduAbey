'use server';
import { REQUEST_STATUSES, type RequestStatus } from '@tourist/core';
import { revalidatePath } from 'next/cache';
import { requireStaff } from '@/lib/requireStaff';
import { createClient } from '@/lib/supabase/server';

const NOTE_REQUIRED: RequestStatus[] = ['needs_info', 'rejected'];

export async function changeStatus(_prev: { error: string | null }, formData: FormData): Promise<{ error: string | null }> {
  const staff = await requireStaff();
  const supabase = await createClient();

  const requestId = String(formData.get('requestId') ?? '');
  const toStatus = String(formData.get('toStatus') ?? '') as RequestStatus;
  const note = String(formData.get('note') ?? '').trim();
  const file = formData.get('attachment');

  if (!REQUEST_STATUSES.includes(toStatus)) return { error: 'Unknown status.' };
  if (NOTE_REQUIRED.includes(toStatus) && !note) return { error: 'Add a note so the tourist knows what to do.' };

  if (toStatus === 'completed' && file instanceof File && file.size > 0) {
    const { data: request } = await supabase.from('service_requests').select('profile_id, type').eq('id', requestId).single();
    if (!request) return { error: 'Request not found.' };
    const kind = request.type === 'eta_application' ? 'eta_approval' : 'permit';
    const ext = (file.name.split('.').pop() || 'pdf').toLowerCase().replace(/[^a-z0-9]/g, '');
    const path = `${request.profile_id}/${requestId}/${kind}-${crypto.randomUUID()}.${ext}`;
    const upload = await supabase.storage.from('documents').upload(path, file, { contentType: file.type || undefined });
    if (upload.error) return { error: `Upload failed: ${upload.error.message}` };
    const doc = await supabase.from('request_documents').insert({ request_id: requestId, kind, storage_path: path, uploaded_by: staff.userId });
    if (doc.error) return { error: doc.error.message };
  }

  const { error } = await supabase.rpc('change_request_status', {
    p_request_id: requestId,
    p_to_status: toStatus,
    p_note: note || undefined,
  });
  if (error) return { error: error.message === 'illegal_transition' ? 'Someone else changed this request. Reload and try again.' : error.message };

  revalidatePath(`/requests/${requestId}`);
  revalidatePath('/inbox');
  return { error: null };
}
