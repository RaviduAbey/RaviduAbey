import type { Page } from '@playwright/test';

const MAILPIT = 'http://127.0.0.1:54324/api/v1';

async function latestId(email: string): Promise<string | null> {
  const res = await fetch(`${MAILPIT}/search?query=${encodeURIComponent(`to:${email}`)}`);
  const body = (await res.json()) as { messages: { ID: string }[] };
  return body.messages[0]?.ID ?? null;
}

/** Waits for a new sign-in email (newer than `previousId`) and returns its 6-digit code. */
export async function waitForCode(email: string, previousId: string | null): Promise<string> {
  for (let i = 0; i < 40; i++) {
    const id = await latestId(email);
    if (id && id !== previousId) {
      const msg = (await (await fetch(`${MAILPIT}/message/${id}`)).json()) as { Text: string };
      const match = /\b\d{6}\b/.exec(msg.Text);
      if (match) return match[0];
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`No sign-in email for ${email}`);
}

export async function signIn(page: Page, email: string) {
  await page.goto('/sign-in');
  const before = await latestId(email);
  await page.getByLabel('Work email').fill(email);
  await page.getByRole('button', { name: 'Send code' }).click();
  await page.getByLabel('6-digit code').fill(await waitForCode(email, before));
  await page.getByRole('button', { name: 'Sign in' }).click();
}
