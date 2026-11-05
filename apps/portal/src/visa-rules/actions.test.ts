import { beforeEach, expect, test, vi } from 'vitest';

const state = { role: 'admin' as 'admin' | 'agent', upserts: [] as unknown[] };

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/requireStaff', () => ({ requireStaff: async () => ({ userId: 'u1', role: state.role }) }));
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: () => ({
      upsert: async (row: unknown) => {
        state.upserts.push(row);
        return { error: null };
      },
    }),
  }),
}));

import { upsertVisaRule } from './actions';

function form(fields: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
}

const good = { countryIso2: 'DE', feeUsd: '50', maxStayDays: '30', sourceUrl: 'https://www.eta.gov.lk/slvisa/' };

beforeEach(() => {
  state.role = 'admin';
  state.upserts = [];
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-05T20:00:00Z')); // 6 Nov in Colombo
});

test('admin saves a rule; verified today in Sri Lanka time', async () => {
  await expect(upsertVisaRule({ error: null, ok: false }, form({ ...good, countryIso2: ' de ' }))).resolves.toEqual({ error: null, ok: true });
  expect(state.upserts).toEqual([
    { country_iso2: 'DE', fee_usd: 50, max_stay_days: 30, source_url: 'https://www.eta.gov.lk/slvisa/', verified_on: '2026-11-06' },
  ]);
});

test('agents cannot edit', async () => {
  state.role = 'agent';
  const r = await upsertVisaRule({ error: null, ok: false }, form(good));
  expect(r.error).toBe('Only admins can change visa rules.');
  expect(state.upserts).toEqual([]);
});

test.each([
  [{ countryIso2: 'DEU' }, 'Country must be a 2-letter code, like DE.'],
  [{ countryIso2: 'D1' }, 'Country must be a 2-letter code, like DE.'],
  [{ feeUsd: '-5' }, 'Fee must be 0 or more (0 means free).'],
  [{ feeUsd: 'abc' }, 'Fee must be 0 or more (0 means free).'],
  [{ maxStayDays: '0' }, 'Maximum stay must be at least 1 day.'],
  [{ maxStayDays: '2.5' }, 'Maximum stay must be at least 1 day.'],
  [{ sourceUrl: 'http://eta.gov.lk' }, 'Source must be an https:// link.'],
  [{ sourceUrl: 'eta.gov.lk' }, 'Source must be an https:// link.'],
])('rejects %o', async (override, message) => {
  const r = await upsertVisaRule({ error: null, ok: false }, form({ ...good, ...override }));
  expect(r).toEqual({ error: message, ok: false });
  expect(state.upserts).toEqual([]);
});
