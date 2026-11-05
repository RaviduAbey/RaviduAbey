import { useRouter } from 'expo-router';
import { useState } from 'react';
import { CountryPicker } from '@/src/components/CountryPicker';
import { DateField } from '@/src/components/DateField';
import { useSession } from '@/src/lib/session';
import { useOnboardingDraft } from '@/src/onboarding/draft';
import { saveOnboarding } from '@/src/onboarding/saveOnboarding';
import { strings } from '@/src/strings';
import { Body, Button, ErrorText, Field, Screen, Title, Toggle } from '@/src/ui/components';

const t = strings.onboarding.licence;

export default function Licence() {
  const router = useRouter();
  const { session, refreshProfile } = useSession();
  const { draft, update } = useOnboardingDraft();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = !draft.hasLicence || (!!draft.issuingCountryIso2 && !!draft.expiryDate);

  async function finish() {
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      await saveOnboarding(session.user.id, draft);
      await refreshProfile();
      router.replace('/');
    } catch {
      setError(t.saveError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Title>{t.title}</Title>
      <Body muted>{t.intro}</Body>
      <Toggle label={t.has} value={draft.hasLicence} onChange={(v) => update({ hasLicence: v })} />
      {draft.hasLicence ? (
        <>
          <CountryPicker label={t.issuedBy} value={draft.issuingCountryIso2 ?? ''} onChange={(c) => update({ issuingCountryIso2: c })} />
          <Field label={t.number} value={draft.licenceNumber ?? ''} onChangeText={(v) => update({ licenceNumber: v })} autoCapitalize="characters" />
          <DateField label={t.expiry} value={draft.expiryDate ?? ''} onChange={(v) => update({ expiryDate: v })} />
          <Toggle label={t.idp} value={draft.hasIdp} onChange={(v) => update({ hasIdp: v })} />
          <Body muted>{t.idpHint}</Body>
        </>
      ) : null}
      {error ? <ErrorText>{error}</ErrorText> : null}
      <Button title={strings.onboarding.finish} disabled={!valid} busy={busy} onPress={finish} />
    </Screen>
  );
}
