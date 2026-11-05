export interface StatusEvent {
  from_status: string | null;
  to_status: string;
  note: string | null;
}

export interface PushContent {
  title: string;
  body: string;
  data: { requestId: string };
}

const TYPE_LABEL: Record<string, string> = {
  eta_application: 'ETA application',
  driving_permit: 'Driving permit',
};

/** The phone notification for a status change, or null when the tourist should not be notified. */
export function buildMessage(event: StatusEvent, request: { id: string; type: string }): PushContent | null {
  if (event.from_status === null) return null; // the tourist just sent it
  const label = TYPE_LABEL[request.type] ?? 'request';
  const note = event.note?.trim() || null;
  const data = { requestId: request.id };

  switch (event.to_status) {
    case 'in_review':
      return { title: `We're working on your ${label}`, body: note ?? "We'll let you know when it's done.", data };
    case 'needs_info':
      return { title: `Action needed: ${label}`, body: note ?? 'Open the app to see what we need.', data };
    case 'completed':
      return request.type === 'eta_application'
        ? { title: 'Your ETA is approved', body: note ?? 'Open the app to see your approval.', data }
        : { title: 'Your driving permit is ready', body: note ?? 'Open the app to see how to collect it.', data };
    case 'rejected':
      return { title: `Update on your ${label}`, body: note ?? 'Open the app for details.', data };
    default:
      return null; // cancelled is the tourist's own action
  }
}
