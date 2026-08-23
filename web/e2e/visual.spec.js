import { test, expect } from '@playwright/test';
import { FIXED_NOW, stubApp, suppressServiceWorker } from './fixtures.js';

// Screenshot baselines for the app shell and chrome.
//
// WHAT IS COVERED: the header, the desktop nav, the mobile tab bar, section
// labels, the crash fallback, and a handful of representative views. The
// Supabase stub answers every request with `[]`, so every view interior is its
// EMPTY state. These baselines do NOT cover populated content — content
// fixtures are a later issue, and nothing here should be read as proving them.
//
// CHARTS ARE MASKED. Recharts draws its lines through react-smooth, which
// derives easing progress from the clock. Under the pinned clock these specs
// require, the line-draw stalls partway and never completes, and it cannot be
// disabled from outside the component — the desktop charts hardcode <Line>
// without isAnimationActive (see web/.design-sync/NOTES.md). Masking the
// containers is the v1 answer, so S6 cannot lean on this harness for chart
// layout. Unmask once the charts take an isAnimationActive prop.
//
// BASELINES ARE GENERATED IN THE CI PLAYWRIGHT CONTAINER, NEVER LOCALLY. This
// app serves no webfont, so every glyph falls back to the *platform* monospace
// face and a locally generated baseline fails in CI forever. To update, run the
// "Visual Baselines (manual)" workflow against your branch. There is
// deliberately no local update script.

const CHART = '.recharts-responsive-container';

test.describe('visual baselines', () => {
  test.beforeEach(async ({ page, context }) => {
    // setFixedTime, not clock.install(): install() fakes rAF and timers too, so
    // react-query's backoff and auth-js's auto-refresh stall unless hand-cranked
    // with runFor, and a missed crank yields a plausible-looking baseline of a
    // half-mounted shell. Freezing Date.now() is all that is needed once the
    // charts are masked — App.jsx's 60s setNowTick(new Date()) then re-renders
    // to an identical result.
    await page.clock.setFixedTime(FIXED_NOW);
    await stubApp(context, { nowMs: FIXED_NOW.getTime() });
    await suppressServiceWorker(context);
  });

  // Guards the expires_at/pinned-clock interaction described in fixtures.js: if
  // the seeded token ever reads expired against the frozen clock, the app falls
  // back to the Login screen and every shot below silently captures that
  // instead. Failing here names the cause; a pixel diff would not.
  async function openDashboard(page) {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'SIGN IN' })).toHaveCount(0);
  }

  async function openDesktopTab(page, label) {
    await openDashboard(page);
    const btn = page.getByRole('button', { name: label, exact: true });
    await expect(btn).toBeVisible();
    await btn.click();
    await expect(btn).toHaveCSS('border-top-color', 'rgb(0, 212, 255)');
  }

  test.describe('desktop', { tag: '@desktop' }, () => {
    test('header and nav chrome', async ({ page }) => {
      await openDashboard(page);
      await expect(
        page.getByRole('button', { name: 'OVERVIEW', exact: true })
      ).toBeVisible();
      // Clipped to the chrome strip so a nav or header change produces a small
      // readable diff instead of a full-viewport one.
      await expect(page).toHaveScreenshot('desktop-chrome-header-nav.png', {
        clip: { x: 0, y: 0, width: 1280, height: 190 },
      });
    });

    test('overview', async ({ page }) => {
      await openDashboard(page);
      await expect(
        page.getByRole('button', { name: 'OVERVIEW', exact: true })
      ).toBeVisible();
      await expect(page).toHaveScreenshot('desktop-overview.png', {
        mask: [page.locator(CHART)],
      });
    });

    test('strength', async ({ page }) => {
      await openDesktopTab(page, 'STRENGTH');
      await expect(page).toHaveScreenshot('desktop-strength.png', {
        mask: [page.locator(CHART)],
      });
    });

    test('recovery', async ({ page }) => {
      await openDesktopTab(page, 'RECOVERY');
      await expect(page).toHaveScreenshot('desktop-recovery.png', {
        mask: [page.locator(CHART)],
      });
    });

    test('journal', async ({ page }) => {
      await openDesktopTab(page, 'JOURNAL');
      await expect(page).toHaveScreenshot('desktop-journal.png', {
        mask: [page.locator(CHART)],
      });
    });

    test('error fallback', async ({ page, context }) => {
      // useIsMobile() calls window.matchMedia during AuthGate's first render
      // (main.jsx:248 -> useIsMobile.js:5), above the session === undefined
      // early return and above every error boundary except the Sentry one at
      // main.jsx:297. Throwing there crashes the real production bundle through
      // the real boundary into the real ErrorFallback, with no production test
      // hook. initSentry() is a no-op without VITE_SENTRY_DSN, which this build
      // never sets, so nothing is reported and the shot cannot vary on Sentry's
      // availability. matchMedia has exactly one caller module in web/src.
      await context.addInitScript(() => {
        window.matchMedia = () => {
          throw new Error('e2e: forced render error');
        };
      });
      await page.goto('/');
      // This assertion is the trigger's canary. If useIsMobile ever moves into
      // an effect or gains a try/catch, the crash stops happening and this fails
      // loudly — without it the test would quietly screenshot the working app.
      await expect(page.getByRole('alert')).toBeVisible();
      await expect(page).toHaveScreenshot('desktop-error-fallback.png');
    });
  });

  test.describe('mobile', { tag: '@mobile' }, () => {
    // BottomTabBar buttons wrap an emoji span and a label span, so the
    // accessible name is the two concatenated — match the label as a substring
    // rather than exact.
    const tab = (page, label) => page.getByRole('button', { name: label });

    test('analytics', async ({ page }) => {
      await openDashboard(page);
      await expect(tab(page, 'Analytics')).toBeVisible();
      await expect(page).toHaveScreenshot('mobile-analytics.png', {
        mask: [page.locator(CHART)],
      });
    });

    test('recovery', async ({ page }) => {
      await openDashboard(page);
      const btn = tab(page, 'Recovery');
      await expect(btn).toBeVisible();
      await btn.click();
      await expect(page).toHaveScreenshot('mobile-recovery.png', {
        mask: [page.locator(CHART)],
      });
    });

    test('tab bar chrome', async ({ page }) => {
      await openDashboard(page);
      await expect(tab(page, 'Analytics')).toBeVisible();
      // Isolating the fixed bottom bar. This is the shot that will surface a
      // font or emoji rasterisation drift first, which makes it the useful one
      // to look at when every baseline fails at once.
      await expect(page).toHaveScreenshot('mobile-chrome-tabbar.png', {
        clip: { x: 0, y: 764, width: 390, height: 80 },
      });
    });
  });
});
