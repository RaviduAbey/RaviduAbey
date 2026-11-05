import { render, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { SessionProvider, useSession } from './session';
import { routeFor } from './routeFor';

const mockMaybeSingle = jest.fn();
const session = { user: { id: 'user-1', email: 'anna@example.test' } };

jest.mock('@/src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: jest.fn() } } }),
    },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => mockMaybeSingle() }) }) }),
  },
}));

function Probe() {
  const { loading, session: s, profile } = useSession();
  return <Text>{loading ? 'loading' : `${s ? 'signed-in' : 'signed-out'}:${profile ? profile.full_name : 'no-profile'}`}</Text>;
}

test('profile is null when the profiles row does not exist yet', async () => {
  mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
  await render(<SessionProvider><Probe /></SessionProvider>);
  await waitFor(() => expect(screen.getByText('signed-in:no-profile')).toBeOnTheScreen());
});

test('loads the profile when it exists', async () => {
  mockMaybeSingle.mockResolvedValueOnce({ data: { id: 'user-1', full_name: 'Anna Demo' }, error: null });
  await render(<SessionProvider><Probe /></SessionProvider>);
  await waitFor(() => expect(screen.getByText('signed-in:Anna Demo')).toBeOnTheScreen());
});

test('routeFor sends people to the right place', () => {
  expect(routeFor({ loading: true, hasSession: false, hasProfile: false })).toBeNull();
  expect(routeFor({ loading: false, hasSession: false, hasProfile: false })).toBe('auth');
  expect(routeFor({ loading: false, hasSession: true, hasProfile: false })).toBe('onboarding');
  expect(routeFor({ loading: false, hasSession: true, hasProfile: true })).toBe('app');
});
