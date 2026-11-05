// Sends a phone notification to the tourist whenever staff change a request's status.
// Called by the request_events insert trigger (see migration *_notify_status.sql).
// Talks to the database through its REST API with the service key, so the function has no dependencies.
import { handle, type ExpoMessage, type ExpoTicket } from './handler.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const rest = (path: string, init: RequestInit = {}) =>
  fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, ...(init.headers ?? {}) },
  });

Deno.serve((req) =>
  handle(req, {
    secret: Deno.env.get('NOTIFY_WEBHOOK_SECRET'),
    async getRequest(id) {
      const res = await rest(`service_requests?id=eq.${encodeURIComponent(id)}&select=id,type,profile_id`);
      const rows = (await res.json()) as { id: string; type: string; profile_id: string }[];
      return rows[0] ?? null;
    },
    async getTokens(profileId) {
      const res = await rest(`push_tokens?profile_id=eq.${encodeURIComponent(profileId)}&select=expo_token`);
      const rows = (await res.json()) as { expo_token: string }[];
      return rows.map((r) => r.expo_token);
    },
    async sendPush(messages: ExpoMessage[]): Promise<ExpoTicket[]> {
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(messages),
      });
      const body = (await res.json()) as { data?: ExpoTicket[] };
      return body.data ?? messages.map(() => ({ status: 'error' as const }));
    },
    async deleteTokens(profileId, tokens) {
      const list = tokens.map((t) => `"${t.replace(/"/g, '')}"`).join(',');
      await rest(`push_tokens?profile_id=eq.${encodeURIComponent(profileId)}&expo_token=in.(${encodeURIComponent(list)})`, {
        method: 'DELETE',
      });
    },
  }),
);
