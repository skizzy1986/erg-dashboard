// Shared Playwright setup for the e2e specs.
//
// Auth gate: main.jsx renders the dashboard only when supabase.auth.getSession()
// returns a session. supabase-js reads it from localStorage under
// `sb-<project-ref>-auth-token` and, for an unexpired token, returns it without
// any network call (verified in @supabase/auth-js __loadSession). The preview
// build uses VITE_SUPABASE_URL=https://test-project.supabase.co (see
// playwright.config.js), so the project ref is `test-project`.
export const STORAGE_KEY = 'sb-test-project-auth-token';

// The instant the visual specs pin the browser clock to. Everything the app
// renders relative to "today" — Overview's Today/Tomorrow, schedule.js's weekday
// string, CalendarView's -3/+14 day window, ErgView's rolling 7 days,
// trainingLoad's CTL/ATL walk — is a function of this value, so a baseline taken
// under a live clock would rot the next calendar day. Never derive it.
export const FIXED_NOW = new Date('2026-03-11T02:00:00.000Z');

// nowMs MUST be the clock the browser will see. auth-js decides whether to
// return the stored session or refresh it by comparing expires_at against the
// *browser's* Date.now(), which the visual specs freeze. If the two clocks drift
// more than 24h apart, auth-js fires a refresh, the blanket route stub answers
// `[]`, auth-js reads that as a non-session and clears storage — and every
// screenshot captures the Login screen instead of the dashboard.
export function fakeSession(nowMs = Date.now()) {
  const expiresAt = Math.floor(nowMs / 1000) + 60 * 60 * 24; // +24h
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

// Stub all Supabase REST/auth traffic so no real backend is needed and the
// app's data fetches resolve cleanly with empty results.
export async function stubSupabase(context) {
  await context.route(/test-project\.supabase\.co\/.*/, (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: '[]',
    });
  });
}

// Seed the fake session before any app code runs so the auth gate passes.
export async function seedSession(context, nowMs = Date.now()) {
  await context.addInitScript(
    ([key, session]) => {
      window.localStorage.setItem(key, JSON.stringify(session));
    },
    [STORAGE_KEY, fakeSession(nowMs)]
  );
}

export async function stubApp(context, { nowMs = Date.now() } = {}) {
  await stubSupabase(context);
  await seedSession(context, nowMs);
}

// Visual-only — deliberately NOT called by the smoke spec, which asserts zero
// console errors against the real service-worker path and would lose that
// coverage. vite.config.js registers VitePWA with registerType 'autoUpdate' and
// a NetworkFirst rule on /supabase\.co\/rest/, and the SW does register in the
// `vite preview` build. Three ways that breaks a screenshot: an update/reload
// cycle mid-capture, a 3s network race changing when queries settle, and — with
// the manifest, on a secure origin — Chrome's installability criteria firing
// beforeinstallprompt so usePWAInstall renders InstallButton into every shot.
// The stub never settles rather than rejecting: virtual:pwa-register fires and
// forgets, so a rejection would only print a console error.
export async function suppressServiceWorker(context) {
  await context.addInitScript(() => {
    if (navigator.serviceWorker) {
      navigator.serviceWorker.register = () => new Promise(() => {});
    }
  });
}
