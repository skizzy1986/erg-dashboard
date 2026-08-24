import * as Sentry from '@sentry/react';

// Runtime error monitoring. Initialisation is gated on VITE_SENTRY_DSN so local
// dev and CI stay silent (no DSN → no-op) while production reports to Sentry.
// The DSN is never hardcoded — it comes from the environment, same as the
// Supabase keys. Returns true when Sentry was initialised, false when skipped.
//
// Note: the Sentry ingest host must also be present in the `connect-src` CSP
// directive in web/vercel.json, or every envelope is blocked before it leaves
// the browser. The org is EU-region, so that host is *.ingest.de.sentry.io.

// Only attach `sentry-trace`/`baggage` headers to our own backend. Without this
// the browser SDK propagates tracing headers to every outbound request, which
// leaks trace ids to third parties and trips their CORS preflights.
function tracePropagationTargets() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) return [/^\//];
  try {
    return [/^\//, new URL(supabaseUrl).origin];
  } catch {
    return [/^\//];
  }
}

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return false;

  Sentry.init({
    dsn,
    // VITE_SENTRY_ENVIRONMENT is injected from Vercel's VERCEL_ENV at build
    // time (see vite.config.js) so preview and production are distinguishable.
    // MODE is the fallback, which keeps local dev and CI reporting as they did.
    environment:
      import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE,
    release: import.meta.env.VITE_SENTRY_RELEASE || undefined,
    // browserTracing is NOT one of the browser SDK's default integrations, so
    // without this line tracesSampleRate below has nothing to sample and no
    // pageload/navigation spans are ever produced.
    integrations: [Sentry.browserTracingIntegration()],
    tracePropagationTargets: tracePropagationTargets(),
    // Conservative sampling to stay well inside a free-tier quota; raise later
    // if performance tracing proves useful.
    tracesSampleRate: 0.1,
    // This is a single-user coaching app, but keep PII off by default anyway.
    sendDefaultPii: false,
  });
  return true;
}

// Single call site for everything that wants to report a handled error. Hooks
// and caches pass their own identifying context so an issue in Sentry says
// which query or mutation produced it, not just that "something threw".
export function captureError(error, context) {
  if (!error) return;
  Sentry.captureException(error, context ? { extra: context } : undefined);
}
