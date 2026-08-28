// importer.ts — the orchestration both entry points share. strava-import (cron)
// and strava-sync (a user pressing Sync) differ only in how they authenticate
// and which `mode` they record; everything below runs identically for both, so
// there is exactly one implementation of the import to reason about.
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import {
  getActivity,
  listActivities,
  refreshAccessToken,
  StravaRateLimitError,
  type RateLimit,
  EMPTY_RATE_LIMIT,
} from "./client.ts";
import {
  chooseAdoptionCandidate,
  isEligible,
  localDateISO,
  mapActivityToSession,
  hasDeviceWatts,
  avgWattsOrNull,
  avgHrOrNull,
  type AdoptionCandidate,
  type StravaActivity,
} from "./mapper.ts";
import {
  advanceBackfillCursor,
  advanceIncrementalWatermark,
  DEFAULT_BUDGET,
  epochSecondsFromUTC,
  nextQuarterHour,
  shouldStopChunk,
  type ChunkBudget,
  type StopReason,
} from "./state.ts";
import { getFreshAccessToken, type RotatedTokens, type StoredTokens, type TokenStore } from "./tokens.ts";
import { captureFunctionError } from "../_shared/sentry.ts";

const FN = "strava-import";
const PER_PAGE = 100;
export const COMPLETED_STATUSES = ["actual", "completed", "logged"] as const;

export type RunStatus = "ok" | "partial" | "noop" | "rate_limited" | "auth_failed" | "error";
export type ErrorCode =
  | "token_exchange_failed"
  | "refresh_failed"
  | "auth_failed"
  | "rate_limited"
  | "upstream_5xx"
  | "insufficient_scope"
  | "db_write_failed"
  | "unknown";

export type Decision = {
  activityId: number;
  sportType: string | null;
  date: string | null;
  action: "insert" | "update" | "adopt" | "skip" | "ambiguous" | "failed";
  detail?: string;
};

export type ImportResult = {
  ok: boolean;
  userId: string;
  mode: "cron" | "user";
  dryRun: boolean;
  status: RunStatus;
  errorCode: ErrorCode | null;
  imported: number;
  adopted: number;
  updated: number;
  skipped: number;
  failed: number;
  ambiguousActivityIds: number[];
  stopReason: StopReason;
  stravaCalls: number;
  backfillComplete: boolean;
  decisions: Decision[];
};

export type ImportDeps = {
  supa: SupabaseClient;
  clientId: string;
  clientSecret: string;
  /** ISO "YYYY-MM-DD" — Scott's Gate 2 decision, no history before this date. */
  backfillFrom: string;
  now?: () => number;
  budget?: ChunkBudget;
};

export type ImportOptions = {
  userId: string;
  mode: "cron" | "user";
  dryRun: boolean;
};

// ---------------------------------------------------------------------------
// Token store — the CAS write tokens.ts requires.
// ---------------------------------------------------------------------------

export function createSupabaseTokenStore(supa: SupabaseClient): TokenStore {
  return {
    async read(userId: string): Promise<StoredTokens | null> {
      const { data, error } = await supa
        .from("strava_tokens")
        .select("athlete_id, access_token, refresh_token, expires_at, scope")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw new Error(`strava_tokens read failed: ${error.code ?? "unknown"}`);
      return (data as StoredTokens | null) ?? null;
    },

    // `.eq("refresh_token", expectedRefreshToken)` IS the compare-and-swap, and
    // it is the whole reason a concurrent refresh cannot strand a rotation.
    // Removing that predicate turns this into a last-writer-wins update and
    // silently reintroduces the bug tokens.ts exists to prevent.
    async rotate(userId: string, expectedRefreshToken: string, next: RotatedTokens): Promise<boolean> {
      const { data, error } = await supa
        .from("strava_tokens")
        .update({
          access_token: next.access_token,
          refresh_token: next.refresh_token,
          expires_at: next.expires_at,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("refresh_token", expectedRefreshToken)
        .select("user_id");
      if (error) throw new Error(`strava_tokens rotate failed: ${error.code ?? "unknown"}`);
      return Array.isArray(data) && data.length === 1;
    },

    async remove(userId: string): Promise<void> {
      const { error } = await supa.from("strava_tokens").delete().eq("user_id", userId);
      if (error) throw new Error(`strava_tokens delete failed: ${error.code ?? "unknown"}`);
    },
  };
}

// ---------------------------------------------------------------------------
// Sync state
// ---------------------------------------------------------------------------

type SyncState = {
  user_id: string;
  connected: boolean;
  backfill_from: string;
  backfill_complete: boolean;
  backfill_cursor_before: number | null;
  incremental_after: number | null;
  imported_total: number;
  adopted_total: number;
  skipped_total: number;
  failed_total: number;
  ambiguous_activity_ids: number[];
  rate_limit_resets_at: string | null;
};

const SYNC_COLUMNS =
  "user_id, connected, backfill_from, backfill_complete, backfill_cursor_before, " +
  "incremental_after, imported_total, adopted_total, skipped_total, failed_total, " +
  "ambiguous_activity_ids, rate_limit_resets_at";

async function readSyncState(supa: SupabaseClient, userId: string): Promise<SyncState | null> {
  const { data, error } = await supa
    .from("strava_sync_state")
    .select(SYNC_COLUMNS)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`strava_sync_state read failed: ${error.code ?? "unknown"}`);
  return (data as SyncState | null) ?? null;
}

async function writeSyncState(
  supa: SupabaseClient,
  userId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const { error } = await supa
    .from("strava_sync_state")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (error) throw new Error(`strava_sync_state write failed: ${error.code ?? "unknown"}`);
}

// ---------------------------------------------------------------------------
// Small date helpers (ISO in, ISO out — no local-string Date parsing anywhere)
// ---------------------------------------------------------------------------

function shiftISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function isoDateToEpochSeconds(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 1000);
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

export async function runImport(deps: ImportDeps, opts: ImportOptions): Promise<ImportResult> {
  const { supa, clientId, clientSecret, backfillFrom } = deps;
  const now = deps.now ?? (() => Date.now());
  const budget = deps.budget ?? DEFAULT_BUDGET;
  const startedAt = now();
  const { userId, mode, dryRun } = opts;

  const result: ImportResult = {
    ok: true,
    userId,
    mode,
    dryRun,
    status: "noop",
    errorCode: null,
    imported: 0,
    adopted: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    ambiguousActivityIds: [],
    stopReason: null,
    stravaCalls: 0,
    backfillComplete: false,
    decisions: [],
  };

  const sync = await readSyncState(supa, userId);
  if (!sync || !sync.connected) {
    result.status = "noop";
    return result;
  }
  result.backfillComplete = sync.backfill_complete;

  // A previous run hit 429 and asked us to wait for the quarter-hour reset.
  // Honouring it is what stops a 15-minute cron from turning one 429 into
  // ninety-six of them a day.
  if (sync.rate_limit_resets_at && Date.parse(sync.rate_limit_resets_at) > now()) {
    result.status = "rate_limited";
    result.errorCode = "rate_limited";
    return result;
  }

  const store = createSupabaseTokenStore(supa);
  const token = await getFreshAccessToken(
    store,
    (rt) => refreshAccessToken(clientId, clientSecret, rt),
    userId,
    now(),
  );

  if (token.status !== "ok") {
    result.ok = false;
    if (token.status === "auth_failed") {
      result.status = "auth_failed";
      result.errorCode = "auth_failed";
      if (!dryRun) {
        await writeSyncState(supa, userId, {
          connected: false,
          disconnected_at: new Date(now()).toISOString(),
          last_run_at: new Date(now()).toISOString(),
          last_run_mode: mode,
          last_run_status: "auth_failed",
          last_error_code: "auth_failed",
        });
      }
      await captureFunctionError(FN, new Error("strava connection revoked"), { userId, mode });
      return result;
    }
    if (token.status === "refresh_failed") {
      result.status = "error";
      result.errorCode = "refresh_failed";
      if (!dryRun) {
        await writeSyncState(supa, userId, {
          last_run_at: new Date(now()).toISOString(),
          last_run_mode: mode,
          last_run_status: "error",
          last_error_code: "refresh_failed",
        });
      }
      await captureFunctionError(FN, new Error("strava token refresh failed"), { userId, mode });
      return result;
    }
    result.status = "noop";
    return result;
  }

  const accessToken = token.accessToken;

  // -------------------------------------------------------------------------
  // Collect. Incremental first (cheap, and it is what keeps today's training
  // showing up), then backfill with whatever budget is left.
  // -------------------------------------------------------------------------
  const seen = new Map<number, StravaActivity>();
  let calls = 0;
  let rateLimit: RateLimit = EMPTY_RATE_LIMIT;
  let stopReason: StopReason = null;
  let rateLimited = false;

  const elapsed = () => now() - startedAt;
  const checkStop = (): boolean => {
    const s = shouldStopChunk(calls, elapsed(), rateLimit, budget);
    if (s.stop) stopReason = s.reason;
    return s.stop;
  };

  const collect = (activities: Record<string, unknown>[]): number[] => {
    const epochs: number[] = [];
    for (const raw of activities) {
      const a = raw as StravaActivity;
      if (typeof a.id === "number") seen.set(a.id, a);
      const e = epochSecondsFromUTC(a.start_date as string | null);
      if (Number.isFinite(e)) epochs.push(e);
    }
    return epochs;
  };

  let incrementalAfter = sync.incremental_after ?? isoDateToEpochSeconds(sync.backfill_from ?? backfillFrom);
  let backfillCursor = sync.backfill_cursor_before;
  let backfillComplete = sync.backfill_complete;

  try {
    // --- incremental -------------------------------------------------------
    for (let page = 1; !checkStop(); page++) {
      const { activities, rateLimit: rl } = await listActivities(accessToken, {
        after: incrementalAfter,
        page,
        perPage: PER_PAGE,
      });
      calls++;
      rateLimit = rl;
      // The watermark advances over EVERYTHING listed, ineligible activities
      // included. A week of nothing but WeightTraining must still move it, or
      // that week is re-listed on every run for ever.
      incrementalAfter = advanceIncrementalWatermark(incrementalAfter, collect(activities)) ??
        incrementalAfter;
      if (activities.length < PER_PAGE) break;
    }

    // --- backfill ----------------------------------------------------------
    if (!backfillComplete) {
      let cursor = backfillCursor ?? Math.floor(now() / 1000);
      while (!checkStop()) {
        const { activities, rateLimit: rl } = await listActivities(accessToken, {
          before: cursor,
          perPage: PER_PAGE,
        });
        calls++;
        rateLimit = rl;

        if (activities.length === 0) {
          backfillComplete = true;
          break;
        }

        const epochs = collect(activities);
        const next = advanceBackfillCursor(cursor, epochs);

        // Persist BEFORE fetching the next page. A run cut off by the edge
        // runtime then resumes exactly here instead of re-walking from the
        // start — the cursor only ever moves after the page it describes has
        // been taken into `seen`.
        if (!dryRun && next != null) {
          await writeSyncState(supa, userId, { backfill_cursor_before: next });
        }
        cursor = next ?? cursor;
        backfillCursor = cursor;

        const reachedFloor = activities.some((raw) => {
          const local = (raw as StravaActivity).start_date_local;
          return typeof local === "string" && localDateISO(local) < backfillFrom;
        });
        if (reachedFloor || activities.length < PER_PAGE) {
          backfillComplete = true;
          break;
        }
      }
    }
  } catch (e) {
    if (e instanceof StravaRateLimitError) {
      rateLimited = true;
      rateLimit = e.rateLimit;
      stopReason = "rate_limit";
    } else {
      result.ok = false;
      result.status = "error";
      result.errorCode = "upstream_5xx";
      await captureFunctionError(FN, e, { userId, mode, stage: "list", calls });
      if (!dryRun) {
        await writeSyncState(supa, userId, {
          last_run_at: new Date(now()).toISOString(),
          last_run_mode: mode,
          last_run_status: "error",
          last_error_code: "upstream_5xx",
        });
      }
      return result;
    }
  }

  result.stravaCalls = calls;
  result.stopReason = stopReason;
  result.backfillComplete = backfillComplete;

  // -------------------------------------------------------------------------
  // Filter to what we will actually write.
  // -------------------------------------------------------------------------
  const eligible: StravaActivity[] = [];
  for (const a of seen.values()) {
    let activity = a;
    // Exception path: a summary missing the fields the mapper needs, for a
    // sport we do care about. One detail fetch, and only while budget remains.
    if (
      (typeof activity.distance !== "number" ||
        typeof activity.moving_time !== "number" ||
        typeof activity.start_date_local !== "string") &&
      (activity.sport_type === "Rowing" || activity.sport_type === "VirtualRide") &&
      !checkStop()
    ) {
      try {
        const { activity: detail, rateLimit: rl } = await getActivity(accessToken, activity.id);
        calls++;
        rateLimit = rl;
        if (detail) activity = detail as StravaActivity;
      } catch (e) {
        if (e instanceof StravaRateLimitError) {
          rateLimited = true;
          rateLimit = e.rateLimit;
        }
      }
    }

    const verdict = isEligible(activity, backfillFrom);
    if (verdict.eligible) {
      eligible.push(activity);
    } else {
      result.decisions.push({
        activityId: activity.id,
        sportType: activity.sport_type ?? null,
        date: typeof activity.start_date_local === "string" ? localDateISO(activity.start_date_local) : null,
        action: "skip",
        detail: verdict.reason,
      });
    }
  }
  result.stravaCalls = calls;

  if (eligible.length === 0) {
    result.status = rateLimited ? "rate_limited" : "noop";
    if (rateLimited) result.errorCode = "rate_limited";
    if (!dryRun) {
      await writeSyncState(supa, userId, {
        incremental_after: incrementalAfter,
        backfill_complete: backfillComplete,
        last_run_at: new Date(now()).toISOString(),
        last_run_mode: mode,
        last_run_status: result.status,
        last_error_code: result.errorCode,
        rate_limit_resets_at: rateLimited ? new Date(nextQuarterHour(now())).toISOString() : null,
      });
    }
    return result;
  }

  // -------------------------------------------------------------------------
  // Two reads for the whole chunk, not two per activity.
  // -------------------------------------------------------------------------
  const activityIds = eligible.map((a) => a.id);
  const { data: linkedRows, error: linkedErr } = await supa
    .from("sessions")
    .select("id, strava_activity_id")
    .eq("user_id", userId)
    .in("strava_activity_id", activityIds);
  if (linkedErr) throw new Error(`sessions link read failed: ${linkedErr.code ?? "unknown"}`);
  const alreadyLinked = new Set<number>(
    (linkedRows ?? []).map((r) => Number((r as { strava_activity_id: number }).strava_activity_id)),
  );

  const dates = eligible.map((a) => localDateISO(String(a.start_date_local))).sort();
  const windowFrom = shiftISO(dates[0], -1);
  const windowTo = shiftISO(dates[dates.length - 1], 1);

  // date_iso, never the text `date`: it is the generated, indexed DATE column,
  // and range-filtering the M/D/YY text would compare lexically and silently
  // return the wrong rows.
  const { data: candidateRows, error: candErr } = await supa
    .from("sessions")
    .select("id, date_iso, type, distance_m")
    .eq("user_id", userId)
    .is("strava_activity_id", null)
    .in("status", COMPLETED_STATUSES as unknown as string[])
    .gte("date_iso", windowFrom)
    .lte("date_iso", windowTo)
    .not("distance_m", "is", null);
  if (candErr) throw new Error(`sessions candidate read failed: ${candErr.code ?? "unknown"}`);
  let candidates: AdoptionCandidate[] = (candidateRows ?? []) as AdoptionCandidate[];

  // -------------------------------------------------------------------------
  // Per activity. One failure never stops the run: a run that fails 2 of 14
  // ends 'partial' with the other 12 correctly written, which is strictly
  // better than 14 activities left unimported because of one bad row.
  // -------------------------------------------------------------------------
  const ambiguous: number[] = [];

  for (const a of eligible) {
    const draft = mapActivityToSession(a);
    const decision: Decision = {
      activityId: a.id,
      sportType: a.sport_type ?? null,
      date: draft.date,
      action: "skip",
    };

    try {
      if (alreadyLinked.has(a.id)) {
        decision.action = "update";
        if (!dryRun) {
          const { data, error } = await supa.rpc("upsert_strava_session", {
            p_user_id: userId,
            p_activity_id: draft.strava_activity_id,
            p_date: draft.date,
            p_type: draft.type,
            p_label: draft.label,
            p_duration: draft.duration,
            p_distance_m: draft.distance_m,
            p_avg_watts: draft.avg_watts,
            p_avg_hr: draft.avg_hr,
          });
          if (error) throw new Error(`upsert_strava_session failed: ${error.code ?? "unknown"}`);
          decision.detail = String((data as { action: string }[] | null)?.[0]?.action ?? "updated");
        }
        result.updated++;
        result.decisions.push(decision);
        continue;
      }

      const choice = chooseAdoptionCandidate(a, candidates);

      if (choice.decision === "ambiguous") {
        // Two plausible existing sessions. Doing nothing is the correct
        // behaviour: a wrong adoption rewrites power onto a session that was
        // not this session, and nothing downstream would ever surface it.
        decision.action = "ambiguous";
        decision.detail = choice.matches.map((m) => m.id).join(",");
        ambiguous.push(a.id);
        result.skipped++;
        result.decisions.push(decision);
        continue;
      }

      if (choice.decision === "adopt") {
        decision.action = "adopt";
        decision.detail = String(choice.sessionId);
        if (!dryRun) {
          const { data, error } = await supa.rpc("adopt_strava_session", {
            p_user_id: userId,
            p_session_id: choice.sessionId,
            p_activity_id: a.id,
            p_avg_watts: avgWattsOrNull(a),
            p_has_device_watts: hasDeviceWatts(a),
            p_avg_hr: avgHrOrNull(a),
          });
          if (error) throw new Error(`adopt_strava_session failed: ${error.code ?? "unknown"}`);
          const action = String((data as { action: string }[] | null)?.[0]?.action ?? "adopted");
          decision.detail = `${choice.sessionId}:${action}`;
          if (action === "adopt_lost_race") {
            // Another run claimed that row between our read and our write.
            // Skipping is deliberate: the row it lost to is most likely this
            // same activity imported by the other worker, and inserting would
            // create the duplicate this whole pass exists to avoid.
            decision.action = "skip";
            result.skipped++;
            await captureFunctionError(FN, new Error("adopt lost race"), {
              userId,
              activityId: a.id,
              sessionId: choice.sessionId,
            });
            result.decisions.push(decision);
            continue;
          }
        }
        // Consumed: a second activity in this same chunk must not adopt it too.
        candidates = candidates.filter((c) => c.id !== choice.sessionId);
        result.adopted++;
        result.decisions.push(decision);
        continue;
      }

      decision.action = "insert";
      if (!dryRun) {
        const { data, error } = await supa.rpc("upsert_strava_session", {
          p_user_id: userId,
          p_activity_id: draft.strava_activity_id,
          p_date: draft.date,
          p_type: draft.type,
          p_label: draft.label,
          p_duration: draft.duration,
          p_distance_m: draft.distance_m,
          p_avg_watts: draft.avg_watts,
          p_avg_hr: draft.avg_hr,
        });
        if (error) throw new Error(`upsert_strava_session failed: ${error.code ?? "unknown"}`);
        decision.detail = String((data as { action: string }[] | null)?.[0]?.action ?? "inserted");
      }
      result.imported++;
      result.decisions.push(decision);
    } catch (e) {
      decision.action = "failed";
      result.failed++;
      result.decisions.push(decision);
      await captureFunctionError(FN, e, { userId, mode, activityId: a.id, stage: "write" });
    }
  }

  result.ambiguousActivityIds = ambiguous;

  if (ambiguous.length) {
    // Once per run, not once per activity — this is a to-do list for Scott, not
    // an incident, and one issue per ambiguous activity would bury the signal.
    await captureFunctionError(
      FN,
      new Error("strava import: ambiguous adoption candidates, skipped"),
      { userId, mode, ambiguousActivityIds: ambiguous },
    );
  }

  const wrote = result.imported + result.adopted + result.updated;
  if (rateLimited) result.status = "rate_limited";
  else if (result.failed > 0 && wrote > 0) result.status = "partial";
  else if (result.failed > 0) result.status = "error";
  else if (wrote === 0) result.status = "noop";
  else result.status = "ok";

  result.ok = result.status === "ok" || result.status === "noop";
  if (rateLimited) result.errorCode = "rate_limited";
  else if (result.failed > 0) result.errorCode = "db_write_failed";

  // A dry run writes NOTHING — not the cursor, not the counters, not
  // last_run_at. Anything less and "show me what it would do" would itself
  // change what the next real run does.
  if (!dryRun) {
    await writeSyncState(supa, userId, {
      incremental_after: incrementalAfter,
      backfill_cursor_before: backfillCursor,
      backfill_complete: backfillComplete,
      last_run_at: new Date(now()).toISOString(),
      last_run_mode: mode,
      last_run_status: result.status,
      last_error_code: result.errorCode,
      imported_total: sync.imported_total + result.imported,
      adopted_total: sync.adopted_total + result.adopted,
      skipped_total: sync.skipped_total + result.skipped,
      failed_total: sync.failed_total + result.failed,
      ambiguous_activity_ids: Array.from(
        new Set([...(sync.ambiguous_activity_ids ?? []), ...ambiguous]),
      ),
      rate_limit_resets_at: rateLimited ? new Date(nextQuarterHour(now())).toISOString() : null,
    });
  }

  return result;
}

/** Service-role client. Never constructed with the anon key. */
export function serviceClient(url: string, serviceKey: string): SupabaseClient {
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}
