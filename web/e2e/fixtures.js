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

import { expect } from '@playwright/test';

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

// Click something that lazy-loads (every tab is a React.lazy chunk) and wait
// until the requests that click started have finished and the network has
// been quiet for `quietMs`.
//
// page.waitForLoadState('networkidle') cannot do this: a load state is
// reached once per document, and "if the state has been already reached
// while loading current document, the method resolves immediately"
// (Playwright docs, page.waitForLoadState). A tab switch is not a
// navigation, so after the first settle it returned at once and every
// screenshot or absence-check raced the chunk. Measured with the PROGRAM
// chunk delayed 1.5 s: #root was 43,401 chars after that wait, 73,883 once
// the tab arrived. Listeners go on BEFORE the click so the chunk request
// cannot slip past them.
export async function clickAndSettle(
  page,
  target,
  { quietMs = 500, timeout = 10_000 } = {}
) {
  const inflight = new Set();
  let lastActivity = Date.now();
  const start = (req) => {
    inflight.add(req);
    lastActivity = Date.now();
  };
  const end = (req) => {
    inflight.delete(req);
    lastActivity = Date.now();
  };
  page.on('request', start);
  page.on('requestfinished', end);
  page.on('requestfailed', end);
  try {
    await target.click();
    await expect
      .poll(() => inflight.size === 0 && Date.now() - lastActivity >= quietMs, {
        timeout,
        intervals: [100],
        message: `network did not go quiet for ${quietMs}ms after the click`,
      })
      .toBe(true);
  } finally {
    page.off('request', start);
    page.off('requestfinished', end);
    page.off('requestfailed', end);
  }
}

export async function installAppFixtures(context, { now } = {}) {
  await stubSupabase(context);
  await seedSession(context, now);
}
