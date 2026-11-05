export const REQUEST_TYPES = ['eta_application', 'driving_permit'] as const;
export type RequestType = (typeof REQUEST_TYPES)[number];

export const REQUEST_STATUSES = ['submitted', 'in_review', 'needs_info', 'completed', 'rejected', 'cancelled'] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export type ActorRole = 'tourist' | 'staff';

export const DOCUMENT_KINDS = [
  'passport', 'licence_front', 'licence_back', 'idp', 'photo', 'eta_approval', 'permit',
] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

/** Must stay identical to the matrix in supabase/migrations/*_change_status.sql. */
export const TRANSITIONS: Record<RequestStatus, Record<ActorRole, RequestStatus[]>> = {
  submitted: { staff: ['in_review'], tourist: ['cancelled'] },
  in_review: { staff: ['needs_info', 'completed', 'rejected'], tourist: [] },
  needs_info: { staff: ['in_review'], tourist: ['in_review', 'cancelled'] },
  completed: { staff: [], tourist: [] },
  rejected: { staff: [], tourist: [] },
  cancelled: { staff: [], tourist: [] },
};

export function nextStatuses(from: RequestStatus, role: ActorRole): RequestStatus[] {
  return [...TRANSITIONS[from][role]];
}

export function isTerminal(status: RequestStatus): boolean {
  return status === 'completed' || status === 'rejected' || status === 'cancelled';
}
