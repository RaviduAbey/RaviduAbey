import { expect, test } from 'vitest';
import { listRequests } from './queries';

/** Records every builder call and resolves to `rows`. */
function fakeClient(rows: unknown[]) {
  const calls: [string, ...unknown[]][] = [];
  const builder: Record<string, unknown> = {};
  for (const m of ['select', 'in', 'eq', 'order']) {
    builder[m] = (...args: unknown[]) => {
      calls.push([m, ...args]);
      return builder;
    };
  }
  builder.then = (resolve: (v: unknown) => void) => resolve({ data: rows, error: null });
  const client = { from: (t: string) => { calls.push(['from', t]); return builder; } };
  return { client, calls };
}

const row = {
  id: 'r1', type: 'eta_application', status: 'submitted', created_at: '2027-01-01T08:00:00Z',
  profiles: { full_name: 'Anna Demo', nationality_iso2: 'AU' },
  trips: { arrival_date: '2027-01-12' },
};

test('defaults to open requests, oldest first', async () => {
  const { client, calls } = fakeClient([row]);
  const rows = await listRequests(client as never, {});
  expect(calls).toContainEqual(['from', 'service_requests']);
  expect(calls).toContainEqual(['in', 'status', ['submitted', 'in_review', 'needs_info']]);
  expect(calls).toContainEqual(['order', 'created_at', { ascending: true }]);
  expect(calls.find((c) => c[0] === 'eq')).toBeUndefined();
  expect(rows).toEqual([
    { id: 'r1', type: 'eta_application', status: 'submitted', touristName: 'Anna Demo', nationalityIso2: 'AU', arrivalDate: '2027-01-12', createdAt: '2027-01-01T08:00:00Z' },
  ]);
});

test('filters by type and explicit statuses', async () => {
  const { client, calls } = fakeClient([]);
  await listRequests(client as never, { type: 'driving_permit', status: ['completed'] });
  expect(calls).toContainEqual(['eq', 'type', 'driving_permit']);
  expect(calls).toContainEqual(['in', 'status', ['completed']]);
});
