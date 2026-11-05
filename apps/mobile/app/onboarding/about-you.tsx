import { useRouter } from 'expo-router';
import { useState } from 'react';
import { CountryPicker } from '@/src/components/CountryPicker';
import { isValidPhone, normalisePhone, useOnboardingDraft } from '@/src/onboarding/draft';
import { strings } from '@/src/strings';
import { Body, Button, Field, Screen, Title } from '@/src/ui/components';

const t = strings.onboarding.aboutYou;

export default function AboutYou() {
  const router = useRouter();
  const { draft, update } = useOnboardingDraft();
  const [phoneRaw, setPhoneRaw] = useState(draft.phoneE164);
  const phone = normalisePhone(phoneRaw);
  const phoneOk = isValidPhone(phone);
  const valid = draft.fullName.trim().length > 0 && phoneOk && draft.nationalityIso2.length === 2;

  return (
    <Screen>
      <Title>{t.title}</Title>
      <Body muted>{t.intro}</Body>
      <Field label={t.name} value={draft.fullName} onChangeText={(v) => update({ fullName: v })} autoComplete="name" />
      <Field
        label={t.phone}
        value={phoneRaw}
        onChangeText={(v) => {
          setPhoneRaw(v);
          update({ phoneE164: normalisePhone(v) });
        }}
        keyboardType="phone-pad"
        autoComplete="tel"
        placeholder="+44 7700 900123"
        hint={t.phoneHint}
        error={phoneRaw.length > 0 && !phoneOk ? t.phoneError : null}
      />
      <CountryPicker label={t.nationality} value={draft.nationalityIso2} onChange={(c) => update({ nationalityIso2: c })} />
      <Body muted>{t.nationalityHint}</Body>
      <Button title={strings.onboarding.next} disabled={!valid} onPress={() => router.push('/onboarding/trip')} />
    </Screen>
  );
}
