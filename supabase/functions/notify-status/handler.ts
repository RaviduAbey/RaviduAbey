import { buildMessage, type StatusEvent } from './message.ts';

export interface ExpoMessage {
  to: string;
  title: string;
  body: string;
  data: { requestId: string };
  sound: 'default';
}

export interface ExpoTicket {
  status: 'ok' | 'error';
  details?: { error?: string };
}

export interface Deps {
  secret: string | undefined;
  getRequest(id: string): Promise<{ id: string; type: string; profile_id: string } | null>;
  getTokens(profileId: string): Promise<string[]>;
  sendPush(messages: ExpoMessage[]): Promise<ExpoTicket[]>;
  deleteTokens(profileId: string, tokens: string[]): Promise<void>;
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

/** Called by the database for every new request_events row. */
export async function handle(req: Request, deps: Deps): Promise<Response> {
  if (!deps.secret || req.headers.get('x-webhook-secret') !== deps.secret) return json(401, { error: 'unauthorized' });

  const payload = (await req.json()) as { record?: StatusEvent & { request_id: string } };
  const event = payload.record;
  if (!event?.request_id) return json(400, { error: 'missing record' });

  const request = await deps.getRequest(event.request_id);
  if (!request) return json(404, { error: 'request not found' });

  const content = buildMessage(event, request);
  if (!content) return new Response(null, { status: 204 });

  const tokens = await deps.getTokens(request.profile_id);
  if (tokens.length === 0) return json(200, { sent: 0 });

  const messages: ExpoMessage[] = tokens.map((to) => ({ to, ...content, sound: 'default' }));
  let tickets: ExpoTicket[];
  try {
    tickets = await deps.sendPush(messages);
  } catch (e) {
    return json(502, { error: `Expo push failed: ${e instanceof Error ? e.message : String(e)}` });
  }

  const gone = tickets.flatMap((t, i) => (t.status === 'error' && t.details?.error === 'DeviceNotRegistered' ? [tokens[i]!] : []));
  if (gone.length) await deps.deleteTokens(request.profile_id, gone);

  return json(200, { sent: messages.length, removed: gone.length });
}
