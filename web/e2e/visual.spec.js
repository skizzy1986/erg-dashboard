// Visual regression baselines for the app shell (#249, design slice S6.0).
//
// WHAT THIS COVERS: shell and chrome only — the desktop nav, the mobile bottom
// tab bar, headers, section labels, card and form primitives, the login screen
// and ErrorFallback. It exists so the palette rename can prove it moved no
// pixels and the S6 spacing pass has something that catches drift.
//
// WHAT THIS DOES NOT COVER, and nobody should read it as covering:
//   - Data. The fixtures stub Supabase to `[]`, so every interior renders as an
//     empty state. Content fixtures are a later issue.
//   - Chart internals. Every `.recharts-responsive-container` is masked (see
//     below), so S6 cannot lean on these baselines for chart layout. The mask
//     tracks the container's bounding box, so container geometry IS still
//     covered — what is lost is everything drawn inside it.
//   - Desktop plan/live/erg/strength/logger/mobility/recovery/log/coach, mobile
//     erg/coach, StrengthLogger entirely, and every hover, focus and expanded
//     state.
//
// WHY THE CLOCK IS PINNED: OverviewView, CalendarView, MobileAnalytics and
// MobileRecovery all render `new Date()`. Unpinned, every baseline rots at
// midnight.
//
// WHY THE CHARTS ARE MASKED: .design-sync/NOTES.md records that a pinned clock
// stalls Recharts' react-smooth line-draw part-way through, and that it cannot
// be disabled from outside because PaceTrendChart hardcodes <Line> without
// isAnimationActive. The two constraints are complementary, not competing — the
// pinned clock is what makes the baselines stable across days, and the mask is
// what makes its one known side effect harmless.
//
// BASELINES ARE GENERATED IN THE CI PLAYWRIGHT CONTAINER, never on a dev
// machine — glyph rasterisation differs and a locally-generated baseline fails
// forever. Dispatch `E2E — Web` on your branch with `update_baselines: true` and
// it regenerates them and commits them to that branch (#288); reviewing the
// resulting PNG diff on the PR is where "is this right?" gets decided. The
// equivalent by hand, if you have a Docker daemon:
//   docker run --rm -v "$PWD":/repo -w /repo/web -e HOME=/root -e CI=1 \
//     mcr.microsoft.com/playwright:v1.62.1-noble \
//     sh -c "npm ci && npm run test:visual:update"
//
// That form is POSIX-shell only. Under Git Bash on Windows, MSYS rewrites the
// container-side `/repo` into a Windows path before Docker ever sees it, so the
// mount lands somewhere unintended — and `$PWD` compounds it when the checkout
// path contains a space. Turn the rewriting off and pass a native path, quoting
// the whole -v argument so the space survives:
//   MSYS_NO_PATHCONV=1 docker run --rm -v "C:\path\to\erg-dashboard:/repo" \
//     -w /repo/web -e HOME=/root -e CI=1 \
//     mcr.microsoft.com/playwright:v1.62.1-noble \
//     sh -c "npm ci && npm run test:visual:update"

import { test, expect } from '@playwright/test';
import { installAppFixtures, stubSupabase, seedSession } from './fixtures.js';

// Monday 15 June 2026, midday UTC — mid-week, mid-month, and far enough from
// either midnight that no timezone rounding can flip the calendar day.
const FIXED_TIME = Date.UTC(2026, 5, 15, 12);

function chartMask(page) {
  return [page.locator('.recharts-responsive-container')];
}

async function shot(page, name) {
  await expect(page).toHaveScreenshot(`${name}.png`, { mask: chartMask(page) });
}

async function openAuthed(page, context) {
  await installAppFixtures(context, { now: FIXED_TIME });
  await page.clock.setFixedTime(FIXED_TIME);
  await page.goto('/');
  // The mobile splash overlays the tab tree, and toBeVisible() ignores
  // occlusion, so every mobile baseline would capture the splash instead.
  // The timeout must beat the default 5000ms — that is exactly the splash
  // ceiling, so a default wait races it.
  await expect(page.locator('.siq-splash')).toHaveCount(0, { timeout: 10_000 });
}

// Tab switching is state-only (App.jsx and MobileApp.jsx both hold `view` in
// useState — there is no routing), and the active-tab styling is a colour on
// desktop and a font-weight on mobile. Both of those properties are owned by
// other design workstreams, so settling on "the rendered tree changed" keeps
// this harness from breaking when they move.
async function switchTo(page, button) {
  const root = page.locator('#root');
  const before = await root.innerHTML();
  await button.click();
  await expect
    .poll(async () => (await root.innerHTML()) !== before, { timeout: 10_000 })
    .toBe(true);
  // Every tab is behind React.lazy with `fallback={null}` (App.jsx:402), so the
  // poll above does NOT prove the new tab rendered. Measured on this branch,
  // #root innerHTML length at each stage of a PROGRAM switch:
  //
  //   before click 42989 -> poll satisfied 43219 -> chunk loaded 73883
  //
  // The ~230 chars that satisfy the poll are the nav button's own active
  // styling; the tab's ~30 KB of markup has not arrived. Screenshotting there
  // captures the outgoing tab plus a highlighted nav button — a 17%-of-pixels
  // diff against the baseline, not antialiasing noise. It is timing-dependent,
  // so it passes often enough to read as a flake; the visual project sets
  // retries:0 precisely so that cannot be papered over.
  //
  // Supabase is stubbed from the route handler, so the chunk is the only
  // request left in flight. Same remedy as smoke.spec.js, same reason.
  await page.waitForLoadState('networkidle');
}

test.describe('desktop shell', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  // Reached by clicking the nav button's visible text — there are no test ids
  // in web/src, and adding one would put this PR on the wrong side of the
  // property boundary it exists to protect.
  const nav = (page, label) =>
    page.getByRole('button', { name: label, exact: true });

  test('overview', async ({ page, context }) => {
    await openAuthed(page, context);
    await expect(nav(page, 'OVERVIEW')).toBeVisible();
    await shot(page, 'desktop-overview');
  });

  test('calendar', async ({ page, context }) => {
    await openAuthed(page, context);
    await expect(nav(page, 'CALENDAR')).toBeVisible();
    await switchTo(page, nav(page, 'CALENDAR'));
    await shot(page, 'desktop-calendar');
  });

  test('program', async ({ page, context }) => {
    await openAuthed(page, context);
    await expect(nav(page, 'PROGRAM')).toBeVisible();
    await switchTo(page, nav(page, 'PROGRAM'));
    await shot(page, 'desktop-program');
  });

  test('journal', async ({ page, context }) => {
    await openAuthed(page, context);
    await expect(nav(page, 'JOURNAL')).toBeVisible();
    await switchTo(page, nav(page, 'JOURNAL'));
    await shot(page, 'desktop-journal');
  });

  // ErrorFallback renders only from the Sentry boundary in main.jsx, which
  // wraps AuthGate — the inner ErrorBoundary in App.jsx catches per-tab crashes
  // with its own message, so no tab can reach it. useIsMobile()'s useState
  // initializer is the one render-phase call above that boundary, and
  // window.matchMedia is its only dependency.
  test('error fallback', async ({ page, context }) => {
    await stubSupabase(context);
    await seedSession(context, FIXED_TIME);
    await context.addInitScript(() => {
      window.matchMedia = () => {
        throw new Error('e2e: forced render error');
      };
    });
    await page.clock.setFixedTime(FIXED_TIME);
    await page.goto('/');
    await expect(page.getByRole('alert')).toBeVisible();
    await shot(page, 'error-fallback');
  });
});

test.describe('mobile shell', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  // 390 < 767, so useIsMobile matches and main.jsx mounts MobileApp — an
  // entirely different component tree, which is why these shots are not
  // optional. BottomTabBar buttons hold an icon span and a label span, so the
  // accessible name is the emoji plus the label; substring matching is enough
  // and none of the five labels is a substring of another.
  const tab = (page, label) => page.getByRole('button', { name: label });

  test('today', async ({ page, context }) => {
    await openAuthed(page, context);
    await expect(tab(page, 'Today')).toBeVisible();
    await shot(page, 'mobile-today');
  });

  test('train', async ({ page, context }) => {
    await openAuthed(page, context);
    await switchTo(page, tab(page, 'Train'));
    await shot(page, 'mobile-train');
  });

  test('progress', async ({ page, context }) => {
    await openAuthed(page, context);
    await switchTo(page, tab(page, 'Progress'));
    await shot(page, 'mobile-progress');
  });

  test('body', async ({ page, context }) => {
    await openAuthed(page, context);
    await switchTo(page, tab(page, 'Body'));
    await shot(page, 'mobile-body');
  });
});

test.describe('login', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  // No seeded session: the auth gate falls through to main.jsx's own Login
  // form, the only surface covering its input and button primitives.
  test('signed out', async ({ page, context }) => {
    await stubSupabase(context);
    await page.clock.setFixedTime(FIXED_TIME);
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'SIGN IN' })).toBeVisible();
    await shot(page, 'login');
  });
});
