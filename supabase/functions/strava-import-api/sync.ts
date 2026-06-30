// sync.ts — shared Strava → sessions sync runner used by both strava-import (cron)
// and strava-sync (on-demand). Imports only client.ts (IO) and mapper.ts (pure).
// Reads/refreshes the stored token, pages activities for the window, maps the
// supported sports, and upserts each via upsert_strava_session. Stops early and
// reports throttled=true when the short rate-limit window is nearly exhausted.

import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  getActivityDetail,
  listActivities,
  type RateLimit,
  refreshAccessToken,
  StravaRateLimitError,
} from "./client.ts";
import { mapActivity, mapSportType } from "./mapper.ts";

type Supa = ReturnType<typeof createClient>;

const ONE_DAY = 86400;
const REFRESH_BUFFER = 300; // refresh if the token expires within 5 minutes
const RATE_STOP_RATIO = 0.95; // stop when short-window usage ≥ 95% of the limit

export type SyncEnv = {
  clientId: string;
  clientSecret: string;
  userId: string;
  supaUrl: string;
  serviceKey: string;
};

export type SyncResult = {
  ok: boolean;
  imported: number;
  skipped: number;
  throttled: boolean;
  range: { after: number; before: number | null } | null;
};

function shortWindowExhausted(rl: RateLimit): boolean {
  if (rl.shortLimit == null || rl.shortUsage == null) return false;
  return rl.shortUsage >= rl.shortLimit * RATE_STOP_RATIO;
}

async function getAccessToken(
  supa: Supa,
  env: SyncEnv,
): Promise<{ accessToken: string; connected: boolean } | { error: string }> {
  const { data, error } = await supa
    .from("integration_tokens")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", env.userId)
    .eq("provider", "strava")
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { accessToken: "", connected: false };

  const expiresAtSec = Math.floor(Date.parse(data.expires_at as string) / 1000);
  const nowSec = Math.floor(Date.now() / 1000);
  if (Number.isFinite(expiresAtSec) && expiresAtSec - nowSec > REFRESH_BUFFER) {
    return { accessToken: data.access_token as string, connected: true };
  }

  // token expired (or near expiry) — refresh and persist the rotated refresh_token
  const rotated = await refreshAccessToken(
    env.clientId,
    env.clientSecret,
    data.refresh_token as string,
  );
  const { error: upErr } = await supa.rpc("upsert_integration_token", {
    p_user_id: env.userId,
    p_provider: "strava",
    p_access_token: rotated.access_token,
    p_refresh_token: rotated.refresh_token,
    p_expires_at: new Date(rotated.expires_at * 1000).toISOString(),
    p_scope: rotated.scope,
    p_athlete_id: rotated.athlete_id,
  });
  if (upErr) return { error: upErr.message };
  return { accessToken: rotated.access_token, connected: true };
}

async function computeWindow(
  supa: Supa,
  env: SyncEnv,
  forceBackfill: boolean,
): Promise<{ after: number; before: number | null }> {
  const nowSec = Math.floor(Date.now() / 1000);
  const { data, count } = await supa
    .from("strava_activities")
    .select("start_date", { count: "exact" })
    .eq("user_id", env.userId)
    .order("start_date", { ascending: false })
    .limit(1);

  const haveRows = (count ?? 0) > 0;
  if (forceBackfill || !haveRows) {
    return { after: nowSec - 365 * ONE_DAY, before: null };
  }

  const latest = data && data[0]?.start_date ? Date.parse(data[0].start_date as string) : NaN;
  const after = Number.isFinite(latest) ? Math.floor(latest / 1000) - ONE_DAY : nowSec - 365 * ONE_DAY;
  return { after, before: null };
}

export async function runStravaSync(env: SyncEnv, forceBackfill = false): Promise<SyncResult> {
  const supa = createClient(env.supaUrl, env.serviceKey, { auth: { persistSession: false } });

  const tok = await getAccessToken(supa, env);
  if ("error" in tok) throw new Error(`token: ${tok.error}`);
  if (!tok.connected) {
    return { ok: true, imported: 0, skipped: 0, throttled: false, range: null };
  }
  const accessToken = tok.accessToken;

  const window = await computeWindow(supa, env, forceBackfill);

  let imported = 0;
  let skipped = 0;
  let throttled = false;
  let page = 1;

  try {
    paging:
    while (true) {
      const { activities, rateLimit } = await listActivities(accessToken, {
        after: window.after,
        before: window.before ?? undefined,
        page,
        perPage: 200,
      });
      if (activities.length === 0) break;

      for (const summary of activities) {
        if (mapSportType(summary) === null) {
          skipped++;
          continue;
        }

        const id = (summary as { id?: number }).id;
        if (typeof id !== "number") {
          skipped++;
          continue;
        }

        const { activity, rateLimit: detailRl } = await getActivityDetail(accessToken, id);
        const rec = mapActivity(activity);
        if (!rec) {
          skipped++;
        } else {
          const { error } = await supa.rpc("upsert_strava_session", {
            p_user_id: env.userId,
            p_strava_activity_id: rec.strava_activity_id,
            p_date: rec.date,
            p_type: rec.type,
            p_label: rec.label,
            p_duration: rec.duration,
            p_avg_watts: rec.avg_watts,
            p_avg_hr: rec.avg_hr,
            p_distance_m: rec.distance_m,
            p_sport_type: rec.sport_type,
            p_start_date: rec.start_date,
            p_raw: activity,
          });
          if (error) throw new Error(`upsert: ${error.message}`);
          imported++;
        }

        if (shortWindowExhausted(detailRl)) {
          throttled = true;
          break paging;
        }
      }

      if (shortWindowExhausted(rateLimit)) {
        throttled = true;
        break;
      }
      page++;
    }
  } catch (e) {
    // A hard HTTP 429 mid-run is throttling, not a failure: stop gracefully so
    // the caller returns 207 and the next run resumes from the advanced watermark.
    if (e instanceof StravaRateLimitError) {
      throttled = true;
    } else {
      throw e;
    }
  }

  return { ok: !throttled, imported, skipped, throttled, range: window };
}
