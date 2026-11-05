import type { Session } from '@supabase/supabase-js';
import type { Tables } from '@tourist/core';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/src/lib/supabase';

export type ProfileRow = Tables<'profiles'>;

interface SessionState {
  session: Session | null;
  profile: ProfileRow | null;
  /** True once sign-up finished: a profile and at least one trip exist. */
  onboarded: boolean;
  loading: boolean;
  refreshProfile(): Promise<void>;
}

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [onboarded, setOnboarded] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (s: Session | null) => {
    if (!s) {
      setProfile(null);
      setOnboarded(false);
      return;
    }
    const [{ data }, trips] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', s.user.id).maybeSingle(),
      supabase.from('trips').select('id').eq('profile_id', s.user.id).limit(1),
    ]);
    setProfile(data ?? null);
    setOnboarded(!!data && (trips.data?.length ?? 0) > 0);
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      await loadProfile(data.session);
      if (active) setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      void loadProfile(s);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const refreshProfile = useCallback(() => loadProfile(session), [loadProfile, session]);

  return (
    <SessionContext.Provider value={{ session, profile, onboarded, loading, refreshProfile }}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>');
  return ctx;
}
