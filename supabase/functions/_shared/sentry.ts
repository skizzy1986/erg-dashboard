// Shared Sentry wiring for every edge function.
//
// Before this existed the only signal a function was failing was an HTTP status
// nobody watched and a best-effort Slack post wrapped in an empty catch. Errors
// now go to the `erg-dashboard-functions` project (separate from the frontend's
// `erg-dashboard`, so the two issue streams stay legible).
//
// Set SENTRY_DSN as an Edge Function secret. Without it every export here is a
// no-op, so local `supabase functions serve` stays silent.
//
// Two constraints shape this file and neither is stylistic:
//
//  1. `defaultIntegrations: false`. The Deno SDK does not instrument
//     Deno.serve, so there is no per-request scope. The edge runtime reuses an
//     isolate across requests, so any globally-captured breadcrumb or context
//     leaks into the NEXT caller's event. Disabling the default integrations
//     removes the machinery that would accumulate that state; everything
//     request-specific is passed explicitly through withScope below.
//
//  2. `await flush()` before returning. The isolate can be frozen the moment
//     the Response resolves, discarding anything still queued in the transport.
import * as Sentry from "npm:@sentry/deno@10.70.0";

const FLUSH_MS = 2000;

let initialised = false;

/** Idempotent. Returns true when Sentry is live, false when no DSN is set. */
export function initSentry(): boolean {
  if (initialised) return true;
  const dsn = Deno.env.get("SENTRY_DSN");
  if (!dsn) return false;

  Sentry.init({
    dsn,
    environment: Deno.env.get("SENTRY_ENVIRONMENT") ?? "production",
    // See note 1 above — this is required for correctness, not tuning.
    defaultIntegrations: false,
    tracesSampleRate: 0,
    sendDefaultPii: false,
  });
  initialised = true;
  return true;
}

/**
 * Report an error with per-request context, then flush.
 *
 * `fn` is the function name so issues group per function. Everything else in
 * `context` becomes searchable tags/extra. Never pass secrets or CSV/user
 * payloads — only identifiers and status codes.
 */
export async function captureFunctionError(
  fn: string,
  error: unknown,
  context: Record<string, unknown> = {},
): Promise<void> {
  if (!initSentry()) return;

  // withScope, never the global scope: the isolate is shared across requests.
  Sentry.withScope((scope) => {
    scope.setTag("function", fn);
    for (const [k, v] of Object.entries(context)) scope.setExtra(k, v);
    scope.setFingerprint([fn, String((error as Error)?.message ?? error)]);
    Sentry.captureException(
      error instanceof Error ? error : new Error(String(error)),
    );
  });

  // See note 2 above — without this the event dies with the isolate.
  await Sentry.flush(FLUSH_MS);
}

/**
 * Cron check-in. Sentry's free plan allows a single monitor, so only the job
 * whose silent failure actually degrades the app (vitals-import) uses this —
 * without vitals, readiness and every load calculation downstream go stale.
 *
 * `monitorConfig` upserts the schedule, so the expected cadence is defined in
 * code rather than clicked into the UI. Returns the check-in id to pass to
 * `finishCheckIn`, or null when Sentry is not configured.
 */
export function startCheckIn(
  monitorSlug: string,
  schedule: string,
): string | null {
  if (!initSentry()) return null;
  return Sentry.captureCheckIn(
    { monitorSlug, status: "in_progress" },
    {
      schedule: { type: "crontab", value: schedule },
      checkinMargin: 30,
      maxRuntime: 10,
      timezone: "Etc/UTC",
    },
  );
}

export async function finishCheckIn(
  monitorSlug: string,
  checkInId: string | null,
  status: "ok" | "error",
): Promise<void> {
  if (!checkInId || !initSentry()) return;
  Sentry.captureCheckIn({ checkInId, monitorSlug, status });
  await Sentry.flush(FLUSH_MS);
}
