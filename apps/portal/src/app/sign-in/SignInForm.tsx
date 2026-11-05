'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { strings } from '@/strings';

const t = strings.signIn;

export function SignInForm({ notStaff }: { notStaff: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(notStaff ? t.notStaff : null);

  // A non-staff account that signed in is signed straight back out.
  useEffect(() => {
    if (notStaff) void createClient().auth.signOut();
  }, [notStaff]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await createClient().auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: false },
    });
    setBusy(false);
    if (err) setError(err.message.includes('Signups not allowed') ? t.noAccount : err.message);
    else setStep('code');
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await createClient().auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: 'email' });
    if (err) {
      setBusy(false);
      setError(t.wrongCode);
      return;
    }
    router.replace('/inbox');
    router.refresh();
  }

  return (
    <div className="card">
      <p className="muted">{strings.product} · {strings.portal}</p>
      <h1>{t.title}</h1>
      {step === 'email' ? (
        <form onSubmit={send} style={{ display: 'grid', gap: 12 }}>
          <p className="muted">{t.intro}</p>
          <label>
            {t.email}
            <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          {error ? <p className="error" role="alert">{error}</p> : null}
          <button className="btn" disabled={busy || !email.includes('@')}>{t.send}</button>
        </form>
      ) : (
        <form onSubmit={verify} style={{ display: 'grid', gap: 12 }}>
          <p className="muted">{t.sent(email)}</p>
          <label>
            {t.code}
            <input id="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value)} />
          </label>
          {error ? <p className="error" role="alert">{error}</p> : null}
          <button className="btn" disabled={busy || code.trim().length !== 6}>{t.verify}</button>
          <button type="button" className="btn link" onClick={() => { setStep('email'); setCode(''); setError(null); }}>{t.back}</button>
        </form>
      )}
    </div>
  );
}
