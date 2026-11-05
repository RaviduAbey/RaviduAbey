import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

test('signed-out visitors are sent to sign-in', async ({ page }) => {
  await page.goto('/inbox');
  await expect(page).toHaveURL(/\/sign-in$/);
});

test('a tourist account cannot use the portal', async ({ page }) => {
  await signIn(page, 'anna@example.test');
  await expect(page).toHaveURL(/\/sign-in\?error=not_staff/);
  await expect(page.getByText("This account isn't on the staff list. Ask an admin to add you.")).toBeVisible();
});

test('an admin lands on the inbox', async ({ page }) => {
  await signIn(page, 'admin@example.test');
  await expect(page).toHaveURL(/\/inbox$/);
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
  await expect(page.getByText('admin@example.test · admin')).toBeVisible();
});
