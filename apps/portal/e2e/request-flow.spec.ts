import { execSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

const PSQL = 'PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -tAc';
const REQUEST_ID = '00000000-0000-4000-c000-00000000e2e1';

// 1x1 PNG
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkaPhfDwAEhgHAXyXhRAAAAABJRU5ErkJggg==', 'base64');

test.beforeEach(async () => {
  const serviceKey = JSON.parse(execSync('supabase status -o json', { cwd: '../..' }).toString()).SERVICE_ROLE_KEY as string;
  await fetch(`http://127.0.0.1:54321/storage/v1/object/documents/00000000-0000-4000-a000-00000000a001/${REQUEST_ID}/passport-e2e.png`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'image/png', 'x-upsert': 'true' },
    body: PNG,
  });
  // A fresh ETA request from the seeded tourist, with a passport image in storage.
  execSync(`${PSQL} "delete from public.service_requests where id = '${REQUEST_ID}' or (trip_id = '00000000-0000-4000-b000-00000000a001' and type = 'eta_application')"`);
  execSync(`${PSQL} "insert into public.service_requests (id, profile_id, trip_id, type, details) values ('${REQUEST_ID}', '00000000-0000-4000-a000-00000000a001', '00000000-0000-4000-b000-00000000a001', 'eta_application', '{\\"passportNumber\\":\\"PA1234567\\",\\"passportExpiry\\":\\"2031-01-01\\"}')"`);
  execSync(`${PSQL} "insert into public.request_documents (request_id, kind, storage_path, uploaded_by) values ('${REQUEST_ID}', 'passport', '00000000-0000-4000-a000-00000000a001/${REQUEST_ID}/passport-e2e.png', '00000000-0000-4000-a000-00000000a001')"`);
});

test('agent works a request: review, ask for info, timeline and inbox update', async ({ page }) => {
  await signIn(page, 'agent@example.test');
  await expect(page).toHaveURL(/\/inbox$/);

  const row = page.getByRole('row', { name: /Anna Demo/ }).filter({ hasText: 'ETA application' });
  await expect(row).toContainText('New');
  await row.getByRole('link', { name: 'Anna Demo' }).click();

  await expect(page.getByRole('heading', { name: 'ETA application' })).toBeVisible();
  await expect(page.getByText('PA1234567')).toBeVisible();
  await expect(page.getByRole('link', { name: /Passport photo page/ })).toBeVisible();
  await expect(page.getByText('Free ETA')).toBeVisible();

  await page.getByRole('button', { name: 'Start review' }).click();
  await expect(page.getByText('In review').first()).toBeVisible();

  await page.getByLabel('Note to the tourist').fill('Passport photo is blurry, please retake it.');
  await page.getByRole('button', { name: 'Ask tourist for info' }).click();
  await expect(page.getByText('Waiting on tourist').first()).toBeVisible();

  const timeline = page.getByRole('list', { name: 'Timeline' });
  await expect(timeline.getByRole('listitem')).toHaveCount(3);
  await expect(timeline).toContainText('Passport photo is blurry, please retake it.');

  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Inbox' }).click();
  await expect(page.getByRole('row', { name: /Anna Demo/ }).filter({ hasText: 'ETA application' })).toContainText('Waiting on tourist');
});

test('agent completes a request with the approval attached', async ({ page }) => {
  execSync(`${PSQL} "update public.service_requests set status = 'in_review' where id = '${REQUEST_ID}'"`);
  await signIn(page, 'agent@example.test');
  await expect(page).toHaveURL(/\/inbox$/);
  await page.goto(`/requests/${REQUEST_ID}`);
  await page.getByLabel('Attach the ETA approval (optional)').setInputFiles({
    name: 'eta-approval.png', mimeType: 'image/png', buffer: PNG,
  });
  await page.getByLabel('Note to the tourist').fill('Your ETA is approved. Have a great trip!');
  await page.getByRole('button', { name: 'Mark completed' }).click();
  await expect(page.getByText('This request is closed.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'ETA approval' })).toBeVisible();
  const kinds = execSync(`${PSQL} "select string_agg(kind, ',' order by kind) from public.request_documents where request_id = '${REQUEST_ID}'"`).toString().trim();
  expect(kinds).toBe('eta_approval,passport');
});
