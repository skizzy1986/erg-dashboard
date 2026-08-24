import { test, expect } from '@playwright/test';
import { installAppFixtures } from './fixtures.js';

// Every dashboard tab (matches the NAV in App.jsx).
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

// The ErrorBoundary fallback in App.jsx renders this sentence when a
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

    await installAppFixtures(context);
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
