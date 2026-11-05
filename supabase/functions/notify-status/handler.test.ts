import { assertEquals } from 'jsr:@std/assert@1';
import { handle, type Deps } from './handler.ts';

function deps(overrides: Partial<Deps> = {}) {
  const sent: unknown[] = [];
  const deleted: string[][] = [];
  const d: Deps = {
    secret: 's3cret',
    getRequest: async () => ({ id: 'r1', type: 'eta_application', profile_id: 'p1' }),
    getTokens: async () => ['ExponentPushToken[a]', 'ExponentPushToken[b]'],
    sendPush: async (messages) => {
      sent.push(...messages);
      return messages.map((m) => (m.to === 'ExponentPushToken[b]' ? { status: 'error', details: { error: 'DeviceNotRegistered' } } : { status: 'ok' }));
    },
    deleteTokens: async (profileId, tokens) => {
      deleted.push([profileId, ...tokens]);
    },
    ...overrides,
  };
  return { d, sent, deleted };
}

function req(body: unknown, secret = 's3cret') {
  return new Request('http://x/notify-status', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-webhook-secret': secret },
    body: JSON.stringify(body),
  });
}

const needsInfo = { record: { request_id: 'r1', from_status: 'in_review', to_status: 'needs_info', note: 'Retake photo' } };

Deno.test('rejects calls without the webhook secret', async () => {
  const { d, sent } = deps();
  assertEquals((await handle(req(needsInfo, 'wrong'), d)).status, 401);
  assertEquals(sent.length, 0);
});

Deno.test('sends one push per device and forgets devices Expo no longer knows', async () => {
  const { d, sent, deleted } = deps();
  const res = await handle(req(needsInfo), d);
  assertEquals(res.status, 200);
  assertEquals(sent, [
    { to: 'ExponentPushToken[a]', title: 'Action needed: ETA application', body: 'Retake photo', data: { requestId: 'r1' }, sound: 'default' },
    { to: 'ExponentPushToken[b]', title: 'Action needed: ETA application', body: 'Retake photo', data: { requestId: 'r1' }, sound: 'default' },
  ]);
  assertEquals(deleted, [['p1', 'ExponentPushToken[b]']]);
});

Deno.test('nothing to send for the initial event', async () => {
  const { d, sent } = deps();
  const res = await handle(req({ record: { request_id: 'r1', from_status: null, to_status: 'submitted', note: null } }), d);
  assertEquals(res.status, 204);
  assertEquals(sent.length, 0);
});

Deno.test('no devices registered is fine', async () => {
  const { d, sent } = deps({ getTokens: async () => [] });
  const res = await handle(req(needsInfo), d);
  assertEquals(res.status, 200);
  assertEquals(sent.length, 0);
});

Deno.test('reports a failed Expo call instead of crashing', async () => {
  const { d, deleted } = deps({ sendPush: async () => { throw new Error('connection refused'); } });
  const res = await handle(req(needsInfo), d);
  assertEquals(res.status, 502);
  assertEquals((await res.json()).error, 'Expo push failed: connection refused');
  assertEquals(deleted.length, 0);
});
