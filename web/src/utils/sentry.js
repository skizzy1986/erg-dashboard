import * as Sentry from '@sentry/react';

// Runtime error monitoring. Initialisation is gated on VITE_SENTRY_DSN so local
// dev and CI stay silent (no DSN → no-op) while production reports to Sentry.
// The DSN is never hardcoded — it comes from the environment, same as the
// Supabase keys. Returns true when Sentry was initialised, false when skipped.
export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return false;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_SENTRY_RELEASE || undefined,
    // Conservative sampling to stay well inside a free-tier quota; raise later
    // if performance tracing proves useful.
    tracesSampleRate: 0.1,
    // This is a single-user coaching app, but keep PII off by default anyway.
    sendDefaultPii: false,
  });
  return true;
}
