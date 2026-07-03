import { test, expect } from '@playwright/test';

// Auth gate: main.jsx renders the dashboard only when supabase.auth.getSession()
// returns a session. supabase-js reads it from localStorage under
// `sb-<project-ref>-auth-token` and, for an unexpired token, returns it without
// any network call (verified in @supabase/auth-js __loadSession). The preview
// build uses VITE_SUPABASE_URL=https://test-project.supabase.co (see
// playwright.config.js), so the project ref is `test-project`.
const STORAGE_KEY = 'sb-test-project-auth-token';

function fakeSession() {
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 24; // +24h
  return {
    access_token: 'e2e-fake-access-token',
    refresh_token: 'e2e-fake-refresh-token',
    token_type: 'bearer',
    expires_in: 86400,
    expires_at: expiresAt,
    user: {
      id: '00000000-0000-0000-0000-000000000000',
      aud: 'authenticated',
      role: 'authenticated',
      email: 'e2e@example.com',
      app_metadata: { provider: 'email' },
      user_metadata: {},
      created_at: '2026-01-01T00:00:00.000Z',
    },
  };
}

// Every dashboard tab (matches the NAV in erg-dashboard.jsx).
const TABS = [
  'overview',
  'calendar',
  'program',
  'plan',
  'live',
  'erg',
  'strength',
  'logger',
  'mobility',
  'recovery',
  'log',
  'journal',
  'coach',
];

// Label shown on each nav button is the tab key, uppercased.
const NAV_LABEL = (tab) => tab.toUpperCase();

// The ErrorBoundary fallback in erg-dashboard.jsx renders this sentence when a
// view crashes on render. Its absence is the "mounted without error" signal.
const ERROR_BOUNDARY_TEXT = 'hit a render error';

test.describe('dashboard smoke', () => {
  let consoleErrors;

  test.beforeEach(async ({ page, context }) => {
    consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(String(err)));

    // Stub all Supabase REST/auth traffic so no real backend is needed and the
    // app's data fetches resolve cleanly with empty results.
    await context.route(/test-project\.supabase\.co\/.*/, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: '[]',
      });
    });

    // Seed the fake session before any app code runs so the auth gate passes.
    await context.addInitScript(
      ([key, session]) => {
        window.localStorage.setItem(key, JSON.stringify(session));
      },
      [STORAGE_KEY, fakeSession()]
    );
  });

  test('app gets past the auth gate and shows the dashboard nav', async ({
    page,
  }) => {
    await page.goto('/');
    // The login screen would show a SIGN IN button; the dashboard shows the nav.
    await expect(
      page.getByRole('button', { name: NAV_LABEL('overview'), exact: true })
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'SIGN IN' })).toHaveCount(0);
  });

  for (const tab of TABS) {
    test(`tab "${tab}" mounts without error`, async ({ page }) => {
      await page.goto('/');

      const navButton = page.getByRole('button', {
        name: NAV_LABEL(tab),
        exact: true,
      });
      await expect(navButton).toBeVisible();
      await navButton.click();

      // The active tab button is highlighted with the accent border colour.
      await expect(navButton).toHaveCSS('border-top-color', 'rgb(0, 212, 255)');

      // No error-boundary fallback rendered.
      await expect(page.getByText(ERROR_BOUNDARY_TEXT)).toHaveCount(0);

      // No console errors / uncaught exceptions during mount.
      expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
    });
  }
});
