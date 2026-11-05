import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import { strings } from '@/src/strings';
import { Body, Button, ErrorText, Field, Screen, Title } from '@/src/ui/components';

export default function Verify() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const digits = code.replace(/\D/g, '');

  async function verify() {
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.verifyOtp({ email, token: digits, type: 'email' });
    setBusy(false);
    // On success the session listener in the root layout routes onwards.
    if (err) setError(strings.verify.wrongCode);
  }

  async function resend() {
    setError(null);
    const { error: err } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    setNotice(err ? err.message : strings.verify.resent);
  }

  return (
    <Screen>
      <Title>{strings.verify.title}</Title>
      <Body muted>{strings.verify.intro(email)}</Body>
      <Field
        label={strings.verify.code}
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        autoComplete="one-time-code"
        maxLength={6}
        placeholder="123456"
      />
      {error ? <ErrorText>{error}</ErrorText> : null}
      <Button title={strings.verify.submit} onPress={verify} disabled={digits.length !== 6} busy={busy} />
      <Button title={strings.verify.resend} onPress={resend} variant="secondary" />
      {notice ? <Body muted>{notice}</Body> : null}
    </Screen>
  );
}
