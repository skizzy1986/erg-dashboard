// vitals-import — daily ingestion of the Health Data Export sheet into public.vitals.
// Reads three published-CSV tabs (Vitals, Sleep, Body Measurements), maps per
// VITALS_IMPORT.md, and upserts via public.upsert_vital (coalesce: never null-wipes,
// never touches readiness/soreness/notes).
//
// Required env (set as Edge Function secrets):
//   VITALS_CSV_URL             published CSV URL for the Vitals tab
//   SLEEP_CSV_URL              published CSV URL for the Sleep tab
//   WEIGHT_CSV_URL             published CSV URL for the Body Measurements tab
//   VITALS_USER_ID             owner uuid (rows written with this so RLS shows them to Scott)
//   SUPABASE_URL               (auto-injected on Supabase)
//   SUPABASE_SERVICE_ROLE_KEY  service role (bypasses RLS; required to write)
//   CRON_SECRET                shared secret; caller must send header x-cron-secret
import { createClient } from "jsr:@supabase/supabase-js@2";
import { buildRecords } from "./parser.ts";
import { checkCronSecret } from "./cronGuard.ts";
import {
  captureFunctionError,
  startCheckIn,
  finishCheckIn,
} from "../_shared/sentry.ts";

const FN = "vitals-import";
// Sentry's free plan allows one cron monitor and this is the job that earns it:
// when it stops silently, the vitals table goes stale and every readiness and
// load number downstream quietly drifts. 01:00 UTC daily, matching the
// scheduler that calls this endpoint.
const MONITOR_SLUG = "vitals-import";
const MONITOR_SCHEDULE = "0 1 * * *";

Deno.serve(async (req: Request) => {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

  // shared-secret guard (function is deployed with verify_jwt=false).
  // Fails closed: an unset/empty CRON_SECRET, or any header mismatch,
  // always returns 401 — see cronGuard.ts for the timing-safe compare.
  const guardResponse = checkCronSecret(req);
  if (guardResponse) return guardResponse;

  // Only after the guard: an unauthorised probe is not a run of this job, and
  // counting it as one would mask a genuinely missed cron.
  const checkInId = startCheckIn(MONITOR_SLUG, MONITOR_SCHEDULE);
  const fail = async (
    body: Record<string, unknown>,
    status: number,
    error: unknown,
    context: Record<string, unknown> = {},
  ) => {
    await captureFunctionError(FN, error, context);
    await finishCheckIn(MONITOR_SLUG, checkInId, "error");
    return json(body, status);
  };

  const vitalsUrl  = Deno.env.get("VITALS_CSV_URL");
  const sleepUrl   = Deno.env.get("SLEEP_CSV_URL");
  const weightUrl  = Deno.env.get("WEIGHT_CSV_URL");
  const userId     = Deno.env.get("VITALS_USER_ID");
  const supaUrl    = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  const missing = [
    ["VITALS_CSV_URL", vitalsUrl], ["SLEEP_CSV_URL", sleepUrl], ["WEIGHT_CSV_URL", weightUrl],
    ["VITALS_USER_ID", userId], ["SUPABASE_URL", supaUrl], ["SUPABASE_SERVICE_ROLE_KEY", serviceKey],
  ].filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) {
    return await fail(
      { error: "missing env", missing },
      500,
      new Error(`missing env: ${missing.join(", ")}`),
      { missing },
    );
  }

  const fetchCsv = async (url: string, label: string): Promise<string> => {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) throw new Error(`${label} fetch failed: HTTP ${res.status}`);
    return res.text();
  };

  let vitalsCsv: string, sleepCsv: string, weightCsv: string;
  try {
    [vitalsCsv, sleepCsv, weightCsv] = await Promise.all([
      fetchCsv(vitalsUrl!, "vitals"),
      fetchCsv(sleepUrl!,  "sleep"),
      fetchCsv(weightUrl!, "weight"),
    ]);
  } catch (e) {
    return await fail({ error: "fetch failed", detail: String(e) }, 502, e, {
      stage: "csv-fetch",
    });
  }

  const records = buildRecords(vitalsCsv, sleepCsv, weightCsv);
  const supa = createClient(supaUrl!, serviceKey!, { auth: { persistSession: false } });

  let upserted = 0;
  const errors: Array<{ date: string; error: string }> = [];
  for (const r of records) {
    const { error } = await supa.rpc("upsert_vital", {
      p_user_id: userId,
      p_date: r.date,
      p_rhr: r.rhr_bpm,
      p_hrv: r.hrv_ms,
      p_sleep: r.sleep_hours,
      p_bodyweight: r.bodyweight_kg,
      p_source: "health_export",
    });
    if (error) errors.push({ date: r.date, error: error.message });
    else upserted++;
  }

  const result = {
    ok: errors.length === 0,
    parsed: records.length,
    upserted,
    errors,
    range: records.length ? { first: records[0].date, last: records[records.length - 1].date } : null,
  };

  // best-effort Slack post — never throws, never blocks the job
  const webhookUrl = Deno.env.get("SLACK_BUILD_WEBHOOK_URL");
  if (webhookUrl) {
    const latest = records[records.length - 1]?.date ?? "?";
    const text = errors.length === 0
      ? `WO-001 OK · vitals: ${upserted} date(s) upserted (latest ${latest})`
      : `WO-001 FAIL · vitals import: ${errors[0]?.error}`;
    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
    } catch (_) { /* swallow — a Slack outage never fails the import */ }
  }

  // A 207 means some rows failed to upsert. That is a partial failure of the
  // job, so it reports as an error rather than a healthy check-in.
  if (errors.length) {
    await captureFunctionError(
      FN,
      new Error(`upsert failed for ${errors.length} date(s): ${errors[0].error}`),
      { parsed: records.length, upserted, failedDates: errors.map((e) => e.date) },
    );
  }
  await finishCheckIn(MONITOR_SLUG, checkInId, errors.length ? "error" : "ok");

  return json(result, errors.length ? 207 : 200);
});
