import * as Sentry from '@sentry/react';

// Runtime error monitoring. Initialisation is gated on VITE_SENTRY_DSN so local
// dev and CI stay silent (no DSN → no-op) while production reports to Sentry.
// The DSN is never hardcoded — it comes from the environment, same as the
// Supabase keys. Returns true when Sentry was initialised, false when skipped.
//
// Note: the Sentry ingest host must also be present in the `connect-src` CSP
// directive in web/public/_headers, or every envelope is blocked before it
// leaves the browser. The org is EU-region, so that host is
// *.ingest.de.sentry.io.

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
    // VITE_SENTRY_ENVIRONMENT is injected by the deploy workflow at build time
    // (see vite.config.js) so preview and production are distinguishable.
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

// postgrest-js rejects with a plain `{ code, details, hint, message }` object,
// not an Error. Sentry titles a non-Error capture by stringifying it, so every
// Supabase failure in the app arrived as one issue called "[object Object]".
// Wrapping restores a real message and stack without changing anything for the
// call sites that already pass an Error.
function toError(value) {
  if (value instanceof Error) return value;

  let msg;
  if (typeof value?.message === 'string' && value.message) {
    msg = value.message;
  } else if (value !== null && typeof value === 'object') {
    try {
      msg = JSON.stringify(value);
    } catch {
      // Circular reference — the keys still say more than "[object Object]".
      msg = `Non-serialisable error object (${Object.keys(value).join(', ')})`;
    }
    if (!msg || msg === '{}') msg = 'Empty error object';
  } else {
    msg = String(value);
  }

  const wrapped = new Error(msg);
  if (typeof value?.name === 'string' && value.name) wrapped.name = value.name;
  return wrapped;
}

// The fields a postgrest error actually carries. Copied shallowly and only when
// scalar: sendDefaultPii is false above, and a deep copy of an arbitrary
// rejection would drag row payloads into Sentry.
function originalFields(value) {
  if (value === null || typeof value !== 'object')
    return { value: String(value) };
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (v === null || ['string', 'number', 'boolean'].includes(typeof v)) {
      out[k] = v;
    }
  }
  return out;
}

// Single call site for everything that wants to report a handled error. Hooks
// and caches pass their own identifying context so an issue in Sentry says
// which query or mutation produced it, not just that "something threw".
export function captureError(error, context) {
  if (!error) return;

  if (error instanceof Error) {
    Sentry.captureException(error, context ? { extra: context } : undefined);
    return;
  }

  const wrapped = toError(error);
  // Every wrapped error is thrown from the same few call sites, so Sentry's
  // stacktrace-led default grouping merges unrelated DB failures into one
  // issue. Appending the postgrest code (or the message) splits them again.
  const discriminator = error?.code || wrapped.message;
  Sentry.captureException(wrapped, {
    extra: { ...context, originalError: originalFields(error) },
    fingerprint: ['{{ default }}', String(discriminator)],
  });
}
