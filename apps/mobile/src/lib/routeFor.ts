export type RouteTarget = 'auth' | 'onboarding' | 'app';

/** Where a person belongs, given their sign-in state. null while still loading. */
export function routeFor(state: { loading: boolean; hasSession: boolean; hasProfile: boolean }): RouteTarget | null {
  if (state.loading) return null;
  if (!state.hasSession) return 'auth';
  if (!state.hasProfile) return 'onboarding';
  return 'app';
}
