// Shared setup for the e2e specs: get past the Supabase auth gate and keep the
// app off the network.
//
// Auth gate: main.jsx renders the dashboard only when supabase.auth.getSession()
// returns a session. supabase-js reads it from localStorage under
// `sb-<project-ref>-auth-token` and, for an unexpired token, returns it without
// any network call (verified in @supabase/auth-js __loadSession). The preview
// build uses VITE_SUPABASE_URL=https://test-project.supabase.co (see
// playwright.config.js), so the project ref is `test-project`.
//
// Plain helpers rather than an extended `test`: smoke.spec.js also wires
// console-error listeners that the visual spec has no use for, and visual.spec.js
// pins the browser clock, which smoke must not do.

export const STORAGE_KEY = 'sb-test-project-auth-token';

// `nowMs` is a parameter because visual.spec.js pins the browser clock — the
// session has to read as unexpired relative to the *pinned* time, or supabase-js
// tries to refresh it against a stub that answers `[]`.
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
export async function seedSession(context, nowMs) {
  await context.addInitScript(
    ([key, session]) => {
      window.localStorage.setItem(key, JSON.stringify(session));
    },
    [STORAGE_KEY, fakeSession(nowMs)]
  );
}

export async function installAppFixtures(context, { now } = {}) {
  await stubSupabase(context);
  await seedSession(context, now);
}
