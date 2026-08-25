import { defineConfig, devices } from '@playwright/test';
import { SCREENSHOT_COMPARE } from './scripts/visual-tolerance.mjs';

// E2E smoke tests build the app with a stub Supabase config and serve it via
// `vite preview`. The auth gate is satisfied by seeding a fake session into
// localStorage (see e2e/fixtures.js) — no real backend is contacted.
const PORT = 4173;
const STUB_ENV = {
  ...process.env,
  VITE_SUPABASE_URL: 'https://test-project.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'test-anon-key',
};

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  timeout: 30_000,
  expect: {
    timeout: 10_000,
    // Two knobs, not one. `threshold` is a per-pixel YIQ colour distance
    // (Playwright default 0.2, allowance 35215 x threshold^2 = 1408.6) and
    // decides whether a pixel counts as different at all; `maxDiffPixels`
    // bounds how many flagged pixels are allowed. So maxDiffPixels: 0 at the
    // default threshold is not strict — nothing ever gets flagged. #291 is the
    // proof: repainting the whole viewport #08080d -> #3d0812 is a delta of
    // 436.7, three times under the allowance, and updated zero baseline bytes.
    // threshold: 0 is affordable because baselines are generated and compared
    // in the same pinned container — at threshold 0 the stable baselines differ
    // by zero pixels, not few. maxDiffPixels: 0 now equals Playwright's default
    // and is kept as a statement of intent.
    toHaveScreenshot: { animations: 'disabled', ...SCREENSHOT_COMPARE },
  },
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: /visual\.spec\.js/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // Visual regression (#249). Viewports are set per describe block in
      // visual.spec.js, so one project covers both desktop and mobile and the
      // snapshot filenames stay stable.
      name: 'visual',
      testMatch: /visual\.spec\.js/,
      // No retries: a retry would paper over exactly the flake this harness
      // exists to make visible.
      retries: 0,
      use: {
        ...devices['Desktop Chrome'],
        deviceScaleFactor: 1,
        reducedMotion: 'reduce',
        // The app formats dates with 'en-GB', 'en-AU' and undefined locales, and
        // reads new Date().toISOString() — both move with locale and timezone.
        locale: 'en-US',
        timezoneId: 'UTC',
      },
    },
  ],
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: STUB_ENV,
  },
});
