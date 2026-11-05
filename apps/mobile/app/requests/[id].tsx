import type { RequestStatus, RequestType } from '@tourist/core';
import { useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { supabase } from '@/src/lib/supabase';
import { useSession } from '@/src/lib/session';
import { RequestDetailView, type Reply } from '@/src/requests/RequestDetailView';
import { uploadDocument } from '@/src/requests/uploadDocument';
import { useRequestDetail } from '@/src/requests/useRequests';
import { strings } from '@/src/strings';
import { ErrorText, Screen } from '@/src/ui/components';
import { colors } from '@/src/ui/theme';

export default function RequestDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const { request, events, documents, error, reload } = useRequestDetail(id);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function cancel() {
    setBusy(true);
    await supabase.rpc('change_request_status', { p_request_id: id, p_to_status: 'cancelled' });
    await reload();
    setBusy(false);
  }

  async function reply({ note, file }: Reply) {
    if (!session) return;
    setBusy(true);
    setActionError(null);
    try {
      if (file) {
        const path = await uploadDocument(session.user.id, id, file.kind, file.uri);
        const doc = await supabase
          .from('request_documents')
          .insert({ request_id: id, kind: file.kind, storage_path: path, uploaded_by: session.user.id });
        if (doc.error) throw new Error(doc.error.message);
      }
      const res = await supabase.rpc('change_request_status', { p_request_id: id, p_to_status: 'in_review', p_note: note || undefined });
      if (res.error) throw new Error(res.error.message);
      await reload();
    } catch {
      setActionError(strings.requests.replyError);
    } finally {
      setBusy(false);
    }
  }

  async function openDocument(path: string) {
    const { data } = await supabase.storage.from('documents').createSignedUrl(path, 600);
    if (data?.signedUrl) await WebBrowser.openBrowserAsync(data.signedUrl);
  }

  if (error) return <Screen><ErrorText>{strings.requests.loadError}</ErrorText></Screen>;
  if (!request) return <Screen><ActivityIndicator color={colors.accent} /></Screen>;

  return (
    <Screen>
      <RequestDetailView
        id={request.id}
        type={request.type as RequestType}
        status={request.status as RequestStatus}
        created_at={request.created_at}
        events={events}
        documents={documents}
        onCancel={cancel}
        onReply={reply}
        onOpenDocument={openDocument}
        busy={busy}
        error={actionError}
      />
    </Screen>
  );
}
