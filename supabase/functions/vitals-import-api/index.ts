// vitals-import-api — daily ingestion of vitals directly from the Google Health API
// (health.googleapis.com/v4) into public.vitals. Replaces the manual CSV path
// (vitals-import); see WO-005. Mints a short-lived access token from a stored refresh
// token, lists four metrics (HRV, RHR, sleep, weight) for yesterday (Perth time) via
// dataPoints.list, maps them via mapper.ts, and upserts via public.upsert_vital
// (coalesce: never null-wipes an existing value).
//
// Required env (Edge Function secrets): GOOGLE_HEALTH_CLIENT_ID, GOOGLE_HEALTH_CLIENT_SECRET,
//   GOOGLE_HEALTH_REFRESH_TOKEN, VITALS_USER_ID, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
//   CRON_SECRET. Optional: SLACK_BUILD_WEBHOOK_URL.
// Sleep additionally requires the googlehealth.sleep.readonly OAuth scope on the refresh token.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { exchangeToken, listDataPoints } from "./client.ts";
import { mapResponses } from "./mapper.ts";
import { checkCronSecret } from "./cronGuard.ts";

function ymd(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

Deno.serve(async (req: Request) => {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

  // best-effort Slack post — never throws, never blocks the job
  const webhookUrl = Deno.env.get("SLACK_BUILD_WEBHOOK_URL");
  const slack = async (text: string): Promise<void> => {
    if (!webhookUrl) return;
    try {
      await fetch(webhookUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
    } catch (_) { /* swallow — a Slack outage never fails the import */ }
  };

  // 1. shared-secret guard (function is deployed with verify_jwt=false).
  // Fails closed: an unset/empty CRON_SECRET, or any header mismatch,
  // always returns 401 — see cronGuard.ts for the timing-safe compare.
  const guardResponse = checkCronSecret(req);
  if (guardResponse) return guardResponse;

  // 2. validate required env
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

  // 3. exchange refresh token for a short-lived access token
  let accessToken: string;
  try {
    accessToken = await exchangeToken(clientId!, clientSecret!, refreshToken!);
  } catch (e) {
    await slack(`WO-005 FAIL · token exchange: ${String(e)}`);
    return json({ error: "token exchange failed" }, 502);
  }

  // 4. yesterday in Perth time (UTC+8), and the following day, for half-open
  //    [date, nextDate) filters. The daily-* types key on a user-timezone .date,
  //    so the Perth-local calendar day is the correct window.
  const perthYesterday = new Date(Date.now() + 8 * 3600 * 1000 - 24 * 3600 * 1000);
  const date = ymd(perthYesterday);
  const nextDate = ymd(new Date(Date.UTC(perthYesterday.getUTCFullYear(), perthYesterday.getUTCMonth(), perthYesterday.getUTCDate()) + 86400000));

  // 5. per-type snake_case filters (filter is snake_case; response is camelCase).
  //    weight keys on the civil sample date; sleep on the wake date (civil_end_time)
  //    so an evening-start session lands on `date`. One failure must not block others.
  const specs = [
    { key: "hrv", dt: "daily-heart-rate-variability", filter: `daily_heart_rate_variability.date >= "${date}" AND daily_heart_rate_variability.date < "${nextDate}"` },
    { key: "rhr", dt: "daily-resting-heart-rate", filter: `daily_resting_heart_rate.date >= "${date}" AND daily_resting_heart_rate.date < "${nextDate}"` },
    { key: "sleep", dt: "sleep", filter: `sleep.interval.civil_end_time >= "${date}" AND sleep.interval.civil_end_time < "${nextDate}"`, pageSize: 25 },
    { key: "weight", dt: "weight", filter: `weight.sample_time.civil_time >= "${date}" AND weight.sample_time.civil_time < "${nextDate}"` },
  ] as const;

  const settled = await Promise.allSettled(
    specs.map((s) => listDataPoints(accessToken, s.dt, s.filter, (s as { pageSize?: number }).pageSize)),
  );
  const byKey: Record<string, unknown> = {};
  for (let i = 0; i < settled.length; i++) {
    const s = settled[i];
    if (s.status === "fulfilled") {
      byKey[specs[i].key] = s.value;
    } else {
      byKey[specs[i].key] = null;
      await slack(`WO-005 FAIL · ${specs[i].dt}: ${String(s.reason)}`);
    }
  }

  // 6. map raw responses -> one VitalRecord (failed/empty metrics -> null)
  const rec = mapResponses(date, byKey.hrv, byKey.rhr, byKey.sleep, byKey.weight);

  // 7. upsert via coalesce RPC; must set user_id explicitly (service role => auth.uid() null)
  const supa = createClient(supaUrl!, serviceKey!, { auth: { persistSession: false } });
  const { error } = await supa.rpc("upsert_vital", {
    p_user_id: userId,
    p_date: date,
    p_rhr: rec.rhr_bpm,
    p_hrv: rec.hrv_ms,
    p_sleep: rec.sleep_hours,
    p_bodyweight: rec.bodyweight_kg,
    p_source: "google_health_api",
  });
  if (error) {
    await slack(`WO-005 FAIL · upsert: ${error.message}`);
    return json({ error: "upsert failed", detail: error.message }, 502);
  }

  // 8. best-effort Slack success post; list any null fields as a suffix
  const nullFields = [
    ["hrv", rec.hrv_ms],
    ["rhr", rec.rhr_bpm],
    ["sleep", rec.sleep_hours],
    ["bodyweight", rec.bodyweight_kg],
  ].filter(([, v]) => v == null).map(([k]) => k as string);
  const suffix = nullFields.length ? ` [${nullFields.map((k) => `${k}=null`).join(", ")}]` : "";
  await slack(`WO-005 OK · vitals: 1 date(s) upserted (latest ${date})${suffix}`);

  // 9. 200 if all four present, else 207 (partial)
  return json({ ok: nullFields.length === 0, date, record: rec, nullFields }, nullFields.length ? 207 : 200);
});
