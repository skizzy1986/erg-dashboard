// vitals-import-api — daily ingestion of vitals directly from the Google Health API
// (health.googleapis.com/v4) into public.vitals. Replaces the manual CSV path
// (vitals-import); see WO-005. Mints a short-lived access token from a stored refresh
// token, pulls four daily roll-ups (HRV, RHR, sleep, weight) for yesterday (Perth time),
// maps them via mapper.ts, and upserts via public.upsert_vital (coalesce: never
// null-wipes an existing value).
//
// Required env (set as Edge Function secrets):
//   GOOGLE_HEALTH_CLIENT_ID      OAuth 2.0 client id
//   GOOGLE_HEALTH_CLIENT_SECRET  OAuth 2.0 client secret
//   GOOGLE_HEALTH_REFRESH_TOKEN  long-lived refresh token (from scripts/google-health-oauth.ts)
//   VITALS_USER_ID               owner uuid (rows written with this so RLS shows them to Scott)
//   SUPABASE_URL                 (auto-injected on Supabase)
//   SUPABASE_SERVICE_ROLE_KEY    service role (bypasses RLS; required to write)
//   CRON_SECRET                  shared secret; caller must send header x-cron-secret
// Optional:
//   SLACK_BUILD_WEBHOOK_URL      #build webhook for best-effort success/failure posts
import { createClient } from "jsr:@supabase/supabase-js@2";
import { exchangeToken, fetchMetric } from "./client.ts";
import { mapResponses } from "./mapper.ts";

Deno.serve(async (req: Request) => {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

  // best-effort Slack post — never throws, never blocks the job
  const webhookUrl = Deno.env.get("SLACK_BUILD_WEBHOOK_URL");
  const slack = async (text: string): Promise<void> => {
    if (!webhookUrl) return;
    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
    } catch (_) { /* swallow — a Slack outage never fails the import */ }
  };

  // 1. shared-secret guard (function is deployed with verify_jwt=false)
  const expected = Deno.env.get("CRON_SECRET");
  if (expected && req.headers.get("x-cron-secret") !== expected) {
    return json({ error: "unauthorized" }, 401);
  }

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
    return json({ error: "token exchange failed", detail: String(e) }, 502);
  }

  // 4. yesterday in Perth time (UTC+8): shift now by +8h, drop a day, use UTC getters
  //    on the shifted instant so the offset is honoured.
  const perthYesterday = new Date(Date.now() + 8 * 3600 * 1000 - 24 * 3600 * 1000);
  const yyyy = perthYesterday.getUTCFullYear();
  const mm = String(perthYesterday.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(perthYesterday.getUTCDate()).padStart(2, "0");
  const date = `${yyyy}-${mm}-${dd}`;

  // 5. four parallel metric fetches; one failure must not block the others
  const dataTypes = [
    "daily-heart-rate-variability",
    "daily-resting-heart-rate",
    "sleep",
    "weight",
  ] as const;

  const settled = await Promise.allSettled(
    dataTypes.map((dt) => fetchMetric(accessToken, dt, date)),
  );

  const responses: Array<unknown> = [];
  for (let i = 0; i < settled.length; i++) {
    const s = settled[i];
    if (s.status === "fulfilled") {
      responses.push(s.value);
    } else {
      responses.push(null);
      await slack(`WO-005 FAIL · Health API ${dataTypes[i]}: ${String(s.reason)}`);
    }
  }
  const [hrvResp, rhrResp, sleepResp, weightResp] = responses;

  // 6. map raw responses -> one VitalRecord (failed/empty metrics -> null)
  const rec = mapResponses(date, hrvResp, rhrResp, sleepResp, weightResp);

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
  ].filter(([, v]) => v == null).map(([k]) => `${k}=null`);
  const suffix = nullFields.length ? ` [${nullFields.join(", ")}]` : "";
  await slack(`WO-005 OK · vitals: 1 date(s) upserted (latest ${date})${suffix}`);

  // 9. 200 if all four present, else 207 (partial)
  const result = {
    ok: nullFields.length === 0,
    date,
    record: rec,
    nullFields: nullFields.map((f) => f.replace("=null", "")),
  };
  return json(result, nullFields.length ? 207 : 200);
});
