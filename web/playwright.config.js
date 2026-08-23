import { defineConfig, devices } from '@playwright/test';

// E2E smoke tests build the app with a stub Supabase config and serve it via
// `vite preview`. The auth gate is satisfied by seeding a fake session into
// localStorage (see e2e/fixtures.js) — no real backend is contacted.
const PORT = 4173;
const STUB_ENV = {
  ...process.env,
  VITE_SUPABASE_URL: 'https://test-project.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'test-anon-key',
};

const VISUAL_SPEC = /visual\.spec\.js/;

// Every input a screenshot could vary on, pinned in one place. locale and
// timezoneId matter because utils/schedule.js formats with 'en-AU' while other
// sites use the runner default; pinning both removes the machine from the
// equation. Deliberately NOT applied to the `chromium` smoke project.
const DETERMINISTIC = {
  browserName: 'chromium',
  deviceScaleFactor: 1,
  reducedMotion: 'reduce',
  colorScheme: 'dark',
  locale: 'en-AU',
  timezoneId: 'Australia/Sydney',
};

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  timeout: 30_000,
  // The {platform} token is deliberately absent. Keeping it lets a baseline
  // generated on macOS/Windows sit alongside the container's linux one without
  // colliding: CI keeps passing, the junk gets committed, and the dev sees a
  // green local run and believes they verified the change. Dropping it makes a
  // local `--update-snapshots` overwrite the real baseline instead, so the next
  // CI run fails loudly with PNG churn authored by a human rather than the bot.
  snapshotPathTemplate: '{testDir}/__screenshots__/{projectName}/{arg}{ext}',
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      // Tighter than the 0.2 default so a near-neighbour colour-token change is
      // caught rather than absorbed.
      threshold: 0.15,
      // Absolute, not maxDiffPixelRatio: the same ratio would give ~1,024px of
      // slack at 1280x800 but only ~330px at 390x844, so the two viewports would
      // have silently different sensitivity. Determinism (not tolerance) is what
      // makes reruns identical; this budget only absorbs glyph-hinting noise
      // after a container patch rebuild.
      maxDiffPixels: 120,
      // Freezes CSS animations/transitions. Does NOT touch rAF/JS animation,
      // which is why the Recharts containers still have to be masked.
      animations: 'disabled',
      caret: 'hide',
      maskColor: '#ff00ff',
    },
  },
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: VISUAL_SPEC,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'visual-desktop',
      testMatch: VISUAL_SPEC,
      // grep filters at collection, not runtime. A runtime test.skip() would
      // mean a mistake in the viewport config silently skips every shot and
      // reports the job green with nothing asserted.
      grep: /@desktop/,
      // Options are spelled out rather than spread from a device preset: the
      // presets carry viewports and scale factors that violate the fixed sizes
      // this harness depends on, and Playwright may revise them between
      // versions. Never add `channel` — a channel browser floats independently
      // of the lockfile-pinned container image and would rot the baselines.
      use: { ...DETERMINISTIC, viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'visual-mobile',
      testMatch: VISUAL_SPEC,
      grep: /@mobile/,
      // isMobile is load-bearing, not cosmetic: without it Chromium paints a
      // classic scrollbar that eats ~15px of the 390px canvas and is itself a
      // cross-version rendering difference, whereas mobile emulation overlays
      // it. index.html also declares viewport-fit=cover and BottomTabBar uses
      // env(safe-area-inset-bottom), so this is the path the 767px fork is
      // designed for. Removing it later breaks all three mobile shots at once.
      use: {
        ...DETERMINISTIC,
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
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
