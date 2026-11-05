import { stayDays, todayInColombo, validateTrip } from '@tourist/core';
import { useRouter } from 'expo-router';
import { DateField } from '@/src/components/DateField';
import { useOnboardingDraft } from '@/src/onboarding/draft';
import { strings } from '@/src/strings';
import { Body, Button, ErrorText, Screen, Title } from '@/src/ui/components';

const t = strings.onboarding.trip;
const ISO = /^\d{4}-\d{2}-\d{2}$/;

export default function Trip() {
  const router = useRouter();
  const { draft, update } = useOnboardingDraft();
  const complete = ISO.test(draft.arrival) && ISO.test(draft.departure);
  const result = complete ? validateTrip(draft.arrival, draft.departure, todayInColombo()) : null;

  return (
    <Screen>
      <Title>{t.title}</Title>
      <Body muted>{t.intro}</Body>
      <DateField label={t.arrival} value={draft.arrival} onChange={(v) => update({ arrival: v })} />
      <DateField label={t.departure} value={draft.departure} onChange={(v) => update({ departure: v })} />
      {result && !result.ok ? <ErrorText>{t.errors[result.error]}</ErrorText> : null}
      {result?.ok ? <Body>{t.length(stayDays(draft.arrival, draft.departure))}</Body> : null}
      <Button title={strings.onboarding.next} disabled={!result?.ok} onPress={() => router.push('/onboarding/licence')} />
    </Screen>
  );
}
