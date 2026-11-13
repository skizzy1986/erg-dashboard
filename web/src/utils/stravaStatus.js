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
//
// Words go through Lingui at CALL time (never at module scope), so the panel
// gets the active language each render. Numbers are interpolated as plain
// placeholders, not ICU `#`, so they are never locale-grouped: "1234 sessions"
// in English stays exactly as it was, and es-CO gets no "1.234".

import { i18n } from '@lingui/core';
import { msg, plural, t } from '@lingui/core/macro';

import { clockTime } from './dateFormat.js';

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

// ERROR_CODE_LABELS stays the English reference (tests compare against it);
// this is what renders. A test pins every message to its label.
export const ERROR_CODE_MESSAGES = {
  token_exchange_failed: msg`Strava rejected the connection attempt. Connect again to retry.`,
  refresh_failed: msg`The Strava token could not be refreshed. Reconnect to resume importing.`,
  auth_failed: msg`Strava access was revoked. Reconnect to resume importing.`,
  rate_limited: msg`Strava rate limit reached. Importing pauses until it resets.`,
  upstream_5xx: msg`Strava is having problems. The next sync will retry.`,
  insufficient_scope: msg`The connection is missing activity read permission. Reconnect and approve activity access.`,
  db_write_failed: msg`Some activities could not be saved to the database. Run the sync again.`,
  unknown: msg`The last sync failed for an unrecognised reason. Try again.`,
};

export function describeErrorCode(code) {
  if (!code) return '';
  return i18n._(
    ERROR_CODE_LABELS[code]
      ? ERROR_CODE_MESSAGES[code]
      : ERROR_CODE_MESSAGES.unknown
  );
}

// Each count carries the words that agree with it, so Spanish can inflect the
// participle and verb ("importada"/"importadas", "coincidió"/"coincidieron").
const sessionsImported = (count) =>
  plural(count, {
    one: `${count} session imported since connecting`,
    other: `${count} sessions imported since connecting`,
  });
const activitiesMatched = (count) =>
  plural(count, {
    one: `${count} activity matched sessions already in the log.`,
    other: `${count} activities matched sessions already in the log.`,
  });
const days = (count) =>
  plural(count, { one: `${count} day`, other: `${count} days` });

function toMs(value) {
  if (value == null) return null;
  const ms = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

// "2 hours ago". Deliberately hand-rolled rather than Intl.RelativeTimeFormat:
// the output must not vary with the CI runner's locale.
function relative(thenMs, nowMs) {
  const delta = nowMs - thenMs;
  if (delta < 60 * 1000) return t`just now`;
  if (delta < HOUR_MS) {
    const minutes = Math.floor(delta / 60000);
    return plural(minutes, {
      one: `${minutes} minute ago`,
      other: `${minutes} minutes ago`,
    });
  }
  if (delta < DAY_MS) {
    const hours = Math.floor(delta / HOUR_MS);
    return plural(hours, {
      one: `${hours} hour ago`,
      other: `${hours} hours ago`,
    });
  }
  const daysAgo = Math.floor(delta / DAY_MS);
  return plural(daysAgo, {
    one: `${daysAgo} day ago`,
    other: `${daysAgo} days ago`,
  });
}

// A null row means NEVER CONNECTED, not an error. A failed read is the hook's
// isError, and the panel branches on that before it ever gets here.
export function describeConnection(connection, now = new Date()) {
  const nowMs = toMs(now) ?? Date.now();

  if (!connection || connection.connected !== true) {
    return {
      kind: 'not_connected',
      headline: t`Strava not connected`,
      detail: t`Connect Strava to import rides and runs into the training calendar automatically.`,
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
      headline: t`Strava access was revoked. Reconnect to resume importing.`,
      // A more specific code (an expired refresh token, a missing scope) says
      // something the headline does not; `auth_failed` would only repeat it.
      detail:
        connection.last_error_code &&
        connection.last_error_code !== 'auth_failed'
          ? errorDetail
          : t`Nothing already imported is affected — reconnecting resumes from where it stopped.`,
      tone: 'critical',
      canSync: false,
      canConnect: true,
    };
  }

  if (status === 'rate_limited') {
    const resetMs = toMs(connection.rate_limit_resets_at);
    const cleared = resetMs == null || resetMs <= nowMs;
    const resumesAt = resetMs ? clockTime(resetMs) : null;
    return {
      kind: 'rate_limited',
      headline: resumesAt
        ? t`Strava rate limit reached. Sync resumes at ${resumesAt}.`
        : t`Strava rate limit reached. Sync resumes shortly.`,
      detail: cleared
        ? t`The limit has reset — you can sync again now.`
        : t`Strava caps how many activities can be read per 15 minutes. Nothing was lost; importing continues from where it stopped.`,
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
    const cause = errorDetail || describeErrorCode('unknown');
    const attempted = imported + failed;
    return {
      kind: 'partial',
      headline: t`Last sync did not finish cleanly`,
      detail: t`${cause} ${failed} of ${attempted} activities have failed since connecting.`,
      tone: 'warning',
      canSync: true,
      canConnect: false,
    };
  }

  // Stale outranks backfilling so a STUCK backfill does not keep promising it
  // is "continuing automatically". A run that has never happened is not stale.
  if (lastRunMs != null && nowMs - lastRunMs > STALE_AFTER_MS) {
    const span = days(Math.floor((nowMs - lastRunMs) / DAY_MS));
    return {
      kind: 'stale',
      headline: t`No successful sync in ${span}`,
      detail: t`The scheduled import has not run recently. Sync now to catch up.`,
      tone: 'warning',
      canSync: true,
      canConnect: false,
    };
  }

  if (connection.backfill_complete === false) {
    const from = connection.backfill_from;
    return {
      kind: 'backfilling',
      headline: t`Importing history — ${imported} imported, ${adopted} matched to existing sessions. Continuing automatically.`,
      detail: from
        ? t`Working backwards from ${from}.`
        : t`Older activities are fetched a page at a time to stay inside Strava rate limits.`,
      tone: 'accent',
      canSync: true,
      canConnect: false,
    };
  }

  if (ambiguous.length > 0) {
    const count = ambiguous.length;
    return {
      kind: 'ambiguous',
      headline: plural(count, {
        one: `${count} activity matched more than one existing session and were skipped`,
        other: `${count} activities matched more than one existing session and were skipped`,
      }),
      detail: t`Nothing was overwritten. Resolve the duplicates in the log, then sync again.`,
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
      ? lastSync(relative(lastRunMs, nowMs))
      : t`Connected · waiting for the first sync`,
    detail:
      adopted > 0
        ? importedAndMatched(
            sessionsImported(imported),
            activitiesMatched(adopted)
          )
        : importedOnly(sessionsImported(imported)),
    tone: 'positive',
    canSync: true,
    canConnect: false,
  };
}

function lastSync(when) {
  return t`Last sync ${when}`;
}

function importedAndMatched(importedText, matchedText) {
  return t`${importedText}; ${matchedText}`;
}

function importedOnly(importedText) {
  return t`${importedText}. New Strava activities are imported automatically.`;
}
