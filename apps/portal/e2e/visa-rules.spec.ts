import { execSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

const PSQL = 'PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -tAc';

test.beforeEach(() => {
  execSync(`${PSQL} "insert into public.country_visa_rules (country_iso2, fee_usd, max_stay_days, source_url, verified_on) values ('NZ', 50, 30, 'https://www.eta.gov.lk/', '2026-01-01') on conflict (country_iso2) do update set fee_usd = 50, verified_on = '2026-01-01'"`);
});

test('admin changes a fee to free', async ({ page }) => {
  await signIn(page, 'admin@example.test');
  await expect(page).toHaveURL(/\/inbox$/);
  await page.goto('/visa-rules');
  const row = page.getByRole('row', { name: /New Zealand/ });
  await expect(row).toContainText('US$50');
  await expect(row).toHaveClass(/stale/);
  await row.getByRole('button', { name: 'Edit' }).click();
  await row.getByLabel('Fee (US$)').fill('0');
  await row.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('row', { name: /New Zealand/ })).toContainText('Free');
  await expect(page.getByRole('row', { name: /New Zealand/ })).not.toHaveClass(/stale/);
});

test('agent sees the rules read-only', async ({ page }) => {
  await signIn(page, 'agent@example.test');
  await expect(page).toHaveURL(/\/inbox$/);
  await page.goto('/visa-rules');
  await expect(page.getByRole('row', { name: /New Zealand/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Add country' })).toHaveCount(0);
});
