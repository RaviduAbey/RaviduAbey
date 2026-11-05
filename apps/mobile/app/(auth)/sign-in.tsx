import { useRouter } from 'expo-router';
import { useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import { strings } from '@/src/strings';
import { Body, Button, ErrorText, Field, Screen, Title } from '@/src/ui/components';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const normalised = email.trim().toLowerCase();
  const valid = EMAIL_RE.test(normalised);

  async function send() {
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithOtp({ email: normalised, options: { shouldCreateUser: true } });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.push({ pathname: '/verify', params: { email: normalised } });
  }

  return (
    <Screen>
      <Title>{strings.signIn.title}</Title>
      <Body muted>{strings.signIn.intro}</Body>
      <Field
        label={strings.signIn.email}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder="you@example.com"
      />
      {error ? <ErrorText>{error}</ErrorText> : null}
      <Button title={strings.signIn.send} onPress={send} disabled={!valid} busy={busy} />
    </Screen>
  );
}
