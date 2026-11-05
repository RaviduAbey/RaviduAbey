import { defineConfig, devices } from '@playwright/test';

// Needs the local Supabase stack running (`supabase start`) with the seed data.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  use: { baseURL: 'http://localhost:3100', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm exec next dev --port 3100',
    url: 'http://localhost:3100/sign-in',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
