import { beforeEach, expect, test, vi } from 'vitest';

const state: { user: { id: string } | null; staffRole: string | null } = { user: null, staffRole: null };

vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user }, error: null }) },
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: state.staffRole ? { role: state.staffRole } : null, error: null }) }),
      }),
    }),
  }),
}));

import { requireStaff } from './requireStaff';

beforeEach(() => {
  state.user = null;
  state.staffRole = null;
});

test('no session goes to sign-in', async () => {
  await expect(requireStaff()).rejects.toThrow('REDIRECT:/sign-in');
});

test('signed in but not staff is turned away', async () => {
  state.user = { id: 'tourist-1' };
  await expect(requireStaff()).rejects.toThrow('REDIRECT:/sign-in?error=not_staff');
});

test('agent', async () => {
  state.user = { id: 'agent-1' };
  state.staffRole = 'agent';
  await expect(requireStaff()).resolves.toEqual({ userId: 'agent-1', role: 'agent' });
});

test('admin', async () => {
  state.user = { id: 'admin-1' };
  state.staffRole = 'admin';
  await expect(requireStaff()).resolves.toEqual({ userId: 'admin-1', role: 'admin' });
});
