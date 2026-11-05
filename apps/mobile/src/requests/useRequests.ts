import type { Tables } from '@tourist/core';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import { useSession } from '@/src/lib/session';
import type { DocumentRow } from './RequestDetailView';
import type { TimelineEvent } from './Timeline';

export type ServiceRequestRow = Tables<'service_requests'>;

export function useRequestList() {
  const { session } = useSession();
  const [rows, setRows] = useState<ServiceRequestRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!session) return;
    const { data, error: err } = await supabase
      .from('service_requests')
      .select('*')
      .eq('profile_id', session.user.id)
      .order('created_at', { ascending: false });
    setError(err?.message ?? null);
    setRows(data ?? []);
  }, [session]);

  useFocusEffect(useCallback(() => { void reload(); }, [reload]));
  return { rows, error, reload };
}

export function useRequestDetail(id: string) {
  const [request, setRequest] = useState<ServiceRequestRow | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [r, e, d] = await Promise.all([
      supabase.from('service_requests').select('*').eq('id', id).single(),
      supabase.from('request_events').select('id, from_status, to_status, note, created_at').eq('request_id', id),
      supabase.from('request_documents').select('id, kind, storage_path, created_at').eq('request_id', id).order('created_at'),
    ]);
    setError(r.error?.message ?? null);
    if (r.data) setRequest(r.data);
    setEvents(e.data ?? []);
    setDocuments(d.data ?? []);
  }, [id]);

  useEffect(() => {
    void reload();
    // Live updates when staff change the status.
    const channel = supabase
      .channel(`request-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'request_events', filter: `request_id=eq.${id}` }, () => {
        void reload();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [id, reload]);

  return { request, events, documents, error, reload };
}
