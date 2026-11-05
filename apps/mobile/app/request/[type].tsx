import { REQUEST_TYPES, type DocumentKind, type RequestType } from '@tourist/core';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { DateField } from '@/src/components/DateField';
import { PhotoSlot } from '@/src/components/PhotoSlot';
import { useChecklist } from '@/src/checklist/useChecklist';
import { useSession } from '@/src/lib/session';
import { requiredFiles, submitRequest, type SubmitError } from '@/src/requests/submitRequest';
import { strings } from '@/src/strings';
import { Body, Button, ErrorText, Field, Screen, Title } from '@/src/ui/components';

const t = strings.request;

export default function NewRequest() {
  const { type: rawType } = useLocalSearchParams<{ type: string }>();
  const type = (REQUEST_TYPES as readonly string[]).includes(rawType) ? (rawType as RequestType) : null;
  const router = useRouter();
  const { session } = useSession();
  const { data } = useChecklist();
  const [passportNumber, setPassportNumber] = useState('');
  const [passportExpiry, setPassportExpiry] = useState('');
  const [files, setFiles] = useState<Partial<Record<DocumentKind, string>>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<SubmitError | null>(null);

  if (!type) return <Screen><ErrorText>{t.errors.unknown}</ErrorText></Screen>;

  const hasIdp = data?.licenceRow?.has_idp ?? false;
  const needed = requiredFiles(type, hasIdp);
  const isEta = type === 'eta_application';
  const ready =
    !!data && needed.every((k) => files[k]) && (!isEta || (passportNumber.trim().length > 0 && passportExpiry.length === 10));

  async function send() {
    if (!session || !data) return;
    setBusy(true);
    setError(null);
    const result = await submitRequest({
      profileId: session.user.id,
      tripId: data.trip.id,
      departure: data.trip.departure_date,
      type: type!,
      hasIdp,
      details: isEta ? { passportNumber: passportNumber.trim(), passportExpiry } : {},
      files: needed.map((kind) => ({ kind, uri: files[kind]! })),
    });
    setBusy(false);
    if ('error' in result) setError(result.error);
    else router.replace(`/requests/${result.requestId}`);
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: isEta ? t.etaTitle : t.permitTitle }} />
      <Title>{isEta ? t.etaTitle : t.permitTitle}</Title>
      <Body muted>{isEta ? t.etaIntro : t.permitIntro}</Body>
      {isEta ? (
        <>
          <Field label={t.passportNumber} value={passportNumber} onChangeText={setPassportNumber} autoCapitalize="characters" />
          <DateField label={t.passportExpiry} value={passportExpiry} onChange={setPassportExpiry} />
        </>
      ) : null}
      {needed.map((kind) => (
        <PhotoSlot key={kind} label={t.files[kind]} uri={files[kind] ?? null} onPicked={(uri) => setFiles((f) => ({ ...f, [kind]: uri }))} />
      ))}
      {error ? <ErrorText>{t.errors[error]}</ErrorText> : null}
      <Button title={t.submit} onPress={send} disabled={!ready} busy={busy} />
    </Screen>
  );
}
