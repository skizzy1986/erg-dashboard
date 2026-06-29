// vitals-sync — on-demand Google Health → vitals upsert, user-triggered from the UI.
// Deployed with JWT verification ON (default; do NOT use --no-verify-jwt).
// The Supabase gateway validates the caller's session JWT before this handler runs.
// Uses the same Google Health credentials as vitals-import-api (no new secrets needed).
//
// Required env (shared with vitals-import-api): GOOGLE_HEALTH_CLIENT_ID,
//   GOOGLE_HEALTH_CLIENT_SECRET, GOOGLE_HEALTH_REFRESH_TOKEN, VITALS_USER_ID,
//   SUPABASE_URL (auto-injected), SUPABASE_SERVICE_ROLE_KEY (auto-injected).
import { createClient } from "jsr:@supabase/supabase-js@2";
import { exchangeToken, listDataPoints } from "../vitals-import-api/client.ts";
import { mapResponses } from "../vitals-import-api/mapper.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function ymd(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS, "Content-Type": "application/json" },
    });

  const clientId     = Deno.env.get("GOOGLE_HEALTH_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_HEALTH_CLIENT_SECRET");
  const refreshToken = Deno.env.get("GOOGLE_HEALTH_REFRESH_TOKEN");
  const userId       = Deno.env.get("VITALS_USER_ID");
  const supaUrl      = Deno.env.get("SUPABASE_URL");
  const serviceKey   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  const missing = [
    ["GOOGLE_HEALTH_CLIENT_ID", clientId],
    ["GOOGLE_HEALTH_CLIENT_SECRET", clientSecret],
    ["GOOGLE_HEALTH_REFRESH_TOKEN", refreshToken],
    ["VITALS_USER_ID", userId],
    ["SUPABASE_URL", supaUrl],
    ["SUPABASE_SERVICE_ROLE_KEY", serviceKey],
  ].filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) return json({ error: "missing env", missing }, 500);

  const supa = createClient(supaUrl!, serviceKey!, { auth: { persistSession: false } });

  // yesterday in Perth time (UTC+8) — same window as the scheduled cron
  const perthYesterday = new Date(Date.now() + 8 * 3600 * 1000 - 24 * 3600 * 1000);
  const date = ymd(perthYesterday);
  const nextDate = ymd(
    new Date(
      Date.UTC(
        perthYesterday.getUTCFullYear(),
        perthYesterday.getUTCMonth(),
        perthYesterday.getUTCDate(),
      ) + 86400000,
    ),
  );

  // skip Google API calls entirely if all four core fields are already populated
  const { data: existing } = await supa
    .from("vitals")
    .select("rhr_bpm, hrv_ms, sleep_hours, bodyweight_kg")
    .eq("user_id", userId!)
    .eq("date", date)
    .maybeSingle();
  if (
    existing?.rhr_bpm != null &&
    existing?.hrv_ms != null &&
    existing?.sleep_hours != null &&
    existing?.bodyweight_kg != null
  ) {
    return json({ ok: true, date, skipped: true });
  }

  let accessToken: string;
  try {
    accessToken = await exchangeToken(clientId!, clientSecret!, refreshToken!);
  } catch (e) {
    return json({ error: "token exchange failed", detail: String(e) }, 502);
  }

  const specs = [
    { key: "hrv", dt: "daily-heart-rate-variability", filter: `daily_heart_rate_variability.date >= "${date}" AND daily_heart_rate_variability.date < "${nextDate}"` },
    { key: "rhr", dt: "daily-resting-heart-rate", filter: `daily_resting_heart_rate.date >= "${date}" AND daily_resting_heart_rate.date < "${nextDate}"` },
    { key: "sleep", dt: "sleep", filter: `sleep.interval.civil_end_time >= "${date}" AND sleep.interval.civil_end_time < "${nextDate}"`, pageSize: 25 },
    { key: "weight", dt: "weight", filter: `weight.sample_time.civil_time >= "${date}" AND weight.sample_time.civil_time < "${nextDate}"` },
    { key: "steps", dt: "daily-steps", filter: `daily_steps.date >= "${date}" AND daily_steps.date < "${nextDate}"` },
    { key: "distance", dt: "daily-distance", filter: `daily_distance.date >= "${date}" AND daily_distance.date < "${nextDate}"` },
    { key: "activeMin", dt: "daily-active-minutes", filter: `daily_active_minutes.date >= "${date}" AND daily_active_minutes.date < "${nextDate}"` },
    { key: "calories", dt: "daily-calories-expended", filter: `daily_calories_expended.date >= "${date}" AND daily_calories_expended.date < "${nextDate}"` },
  ] as const;

  const settled = await Promise.allSettled(
    specs.map((s) => listDataPoints(accessToken, s.dt, s.filter, (s as { pageSize?: number }).pageSize)),
  );
  const byKey: Record<string, unknown> = {};
  for (let i = 0; i < settled.length; i++) {
    byKey[specs[i].key] = settled[i].status === "fulfilled" ? (settled[i] as PromiseFulfilledResult<unknown>).value : null;
  }

  const rec = mapResponses(date, byKey.hrv, byKey.rhr, byKey.sleep, byKey.weight, byKey.steps, byKey.distance, byKey.activeMin, byKey.calories);

  const { error } = await supa.rpc("upsert_vital", {
    p_user_id: userId,
    p_date: date,
    p_rhr: rec.rhr_bpm,
    p_hrv: rec.hrv_ms,
    p_sleep: rec.sleep_hours,
    p_bodyweight: rec.bodyweight_kg,
    p_source: "google_health_api",
    p_steps: rec.steps_count,
    p_distance: rec.distance_m,
    p_active_min: rec.active_minutes,
    p_calories: rec.calories_kcal,
  });
  if (error) return json({ error: "upsert failed", detail: error.message }, 502);

  const nullFields = (
    [
      ["hrv", rec.hrv_ms],
      ["rhr", rec.rhr_bpm],
      ["sleep", rec.sleep_hours],
      ["bodyweight", rec.bodyweight_kg],
      ["steps_count", rec.steps_count],
      ["distance_m", rec.distance_m],
      ["active_minutes", rec.active_minutes],
      ["calories_kcal", rec.calories_kcal],
    ] as [string, unknown][]
  ).filter(([, v]) => v == null).map(([k]) => k);

  return json({ ok: nullFields.length === 0, date, record: rec, nullFields }, nullFields.length ? 207 : 200);
});
