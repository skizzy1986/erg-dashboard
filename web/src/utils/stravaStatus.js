// Strava connection status — the one place that turns a `strava_sync_state`
// row into something a human can read. Pure: no React, no Supabase, no THEME.
//
// `tone` is a THEME KEY NAME (a string like 'warning'), never a colour value.
// The panel maps it through THEME so this module stays renderable-agnostic and
// survives the dark→light palette flip untouched.
//
// There is deliberately no free-text error column on the backend — a raw
// upstream error body could carry a client_secret into a browser-readable
// column — so every message shown to Scott is composed HERE from the bounded
// `last_error_code` enum. Never expect prose from the server.

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const STALE_AFTER_MS = 48 * HOUR_MS;

// The complete `last_error_code` enum. Every key must map to a non-empty
// string; a code with no entry falls back to `unknown` rather than rendering
// the raw enum value at Scott.
export const ERROR_CODE_LABELS = {
  token_exchange_failed:
    'Strava rejected the connection attempt. Connect again to retry.',
  refresh_failed:
    'The Strava token could not be refreshed. Reconnect to resume importing.',
  auth_failed: 'Strava access was revoked. Reconnect to resume importing.',
  rate_limited: 'Strava rate limit reached. Importing pauses until it resets.',
  upstream_5xx: 'Strava is having problems. The next sync will retry.',
  insufficient_scope:
    'The connection is missing activity read permission. Reconnect and approve activity access.',
  db_write_failed:
    'Some activities could not be saved to the database. Run the sync again.',
  unknown: 'The last sync failed for an unrecognised reason. Try again.',
};

export function describeErrorCode(code) {
  if (!code) return '';
  return ERROR_CODE_LABELS[code] ?? ERROR_CODE_LABELS.unknown;
}

function plural(n, word, pluralForm) {
  return `${n} ${n === 1 ? word : (pluralForm ?? `${word}s`)}`;
}

function toMs(value) {
  if (value == null) return null;
  const ms = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

// "2 hours ago". Deliberately hand-rolled rather than Intl.RelativeTimeFormat:
// the output must not vary with the CI runner's locale.
function relative(thenMs, nowMs) {
  const delta = nowMs - thenMs;
  if (delta < 60 * 1000) return 'just now';
  if (delta < HOUR_MS)
    return `${plural(Math.floor(delta / 60000), 'minute')} ago`;
  if (delta < DAY_MS)
    return `${plural(Math.floor(delta / HOUR_MS), 'hour')} ago`;
  return `${plural(Math.floor(delta / DAY_MS), 'day')} ago`;
}

// Local wall-clock HH:MM. toLocaleTimeString would drag the runner's locale
// (and a 12-hour clock) into the assertion.
function clockTime(ms) {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// A null row means NEVER CONNECTED, not an error. A failed read is the hook's
// isError, and the panel branches on that before it ever gets here.
export function describeConnection(connection, now = new Date()) {
  const nowMs = toMs(now) ?? Date.now();

  if (!connection || connection.connected !== true) {
    return {
      kind: 'not_connected',
      headline: 'Strava not connected',
      detail:
        'Connect Strava to import rides and runs into the training calendar automatically.',
      tone: 'muted',
      canSync: false,
      canConnect: true,
    };
  }

  const imported = connection.imported_total ?? 0;
  const adopted = connection.adopted_total ?? 0;
  const failed = connection.failed_total ?? 0;
  const status = connection.last_run_status ?? null;
  const errorDetail = describeErrorCode(connection.last_error_code);
  const ambiguous = connection.ambiguous_activity_ids ?? [];
  const lastRunMs = toMs(connection.last_run_at);

  // Precedence: a problem that blocks importing outranks progress, and progress
  // outranks the merely informational. Otherwise a revoked token would render
  // as "Importing history — continuing automatically", which is a lie.
  if (status === 'auth_failed') {
    return {
      kind: 'auth_failed',
      headline: 'Strava access was revoked. Reconnect to resume importing.',
      // A more specific code (an expired refresh token, a missing scope) says
      // something the headline does not; `auth_failed` would only repeat it.
      detail:
        connection.last_error_code &&
        connection.last_error_code !== 'auth_failed'
          ? errorDetail
          : 'Nothing already imported is affected — reconnecting resumes from where it stopped.',
      tone: 'critical',
      canSync: false,
      canConnect: true,
    };
  }

  if (status === 'rate_limited') {
    const resetMs = toMs(connection.rate_limit_resets_at);
    const cleared = resetMs == null || resetMs <= nowMs;
    return {
      kind: 'rate_limited',
      headline: resetMs
        ? `Strava rate limit reached. Sync resumes at ${clockTime(resetMs)}.`
        : 'Strava rate limit reached. Sync resumes shortly.',
      detail: cleared
        ? 'The limit has reset — you can sync again now.'
        : 'Strava caps how many activities can be read per 15 minutes. Nothing was lost; importing continues from where it stopped.',
      tone: 'caution',
      canSync: cleared,
      canConnect: false,
    };
  }

  // 'error' joins 'partial' here: it is a failed run with no other home, and
  // letting it fall through would render an outright failure as "healthy".
  //
  // Branch on last_run_status ALONE, never on `failed > 0`. failed_total is a
  // lifetime counter that nothing resets, so a single failure — and the 23505
  // label-collision path guarantees one eventually — would pin this warning on
  // every clean run thereafter. A failure signal that never clears is noise,
  // and it teaches Scott to stop reading the panel.
  if (status === 'partial' || status === 'error') {
    return {
      kind: 'partial',
      headline: 'Last sync did not finish cleanly',
      detail: `${errorDetail || ERROR_CODE_LABELS.unknown} ${failed} of ${imported + failed} activities have failed since connecting.`,
      tone: 'warning',
      canSync: true,
      canConnect: false,
    };
  }

  // Stale outranks backfilling so a STUCK backfill does not keep promising it
  // is "continuing automatically". A run that has never happened is not stale.
  if (lastRunMs != null && nowMs - lastRunMs > STALE_AFTER_MS) {
    return {
      kind: 'stale',
      headline: `No successful sync in ${plural(Math.floor((nowMs - lastRunMs) / DAY_MS), 'day')}`,
      detail:
        'The scheduled import has not run recently. Sync now to catch up.',
      tone: 'warning',
      canSync: true,
      canConnect: false,
    };
  }

  if (connection.backfill_complete === false) {
    return {
      kind: 'backfilling',
      headline: `Importing history — ${imported} imported, ${adopted} matched to existing sessions. Continuing automatically.`,
      detail: connection.backfill_from
        ? `Working backwards from ${connection.backfill_from}.`
        : 'Older activities are fetched a page at a time to stay inside Strava rate limits.',
      tone: 'accent',
      canSync: true,
      canConnect: false,
    };
  }

  if (ambiguous.length > 0) {
    return {
      kind: 'ambiguous',
      headline: `${plural(ambiguous.length, 'activity', 'activities')} matched more than one existing session and were skipped`,
      detail:
        'Nothing was overwritten. Resolve the duplicates in the log, then sync again.',
      tone: 'caution',
      canSync: true,
      canConnect: false,
    };
  }

  // Healthy is also the connected fallback: 'ok' and 'noop' both mean the last
  // run succeeded, and a freshly connected row has no run yet.
  return {
    kind: 'healthy',
    // `imported` is a lifetime total, so it belongs in the detail line phrased
    // as one — putting it beside "Last sync" read as a per-run count.
    headline: lastRunMs
      ? `Last sync ${relative(lastRunMs, nowMs)}`
      : 'Connected · waiting for the first sync',
    detail:
      adopted > 0
        ? `${plural(imported, 'session')} imported since connecting; ${plural(adopted, 'activity', 'activities')} matched sessions already in the log.`
        : `${plural(imported, 'session')} imported since connecting. New Strava activities are imported automatically.`,
    tone: 'positive',
    canSync: true,
    canConnect: false,
  };
}
