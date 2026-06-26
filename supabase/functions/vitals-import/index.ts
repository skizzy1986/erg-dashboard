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
import { timingSafeEqual } from "jsr:@std/crypto/timing-safe-equal";
import { buildRecords } from "./parser.ts";

Deno.serve(async (req: Request) => {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

  // shared-secret guard (function is deployed with verify_jwt=false)
  const expected = Deno.env.get("CRON_SECRET");
  if (!expected) return json({ error: "CRON_SECRET not configured" }, 500);
  const enc = new TextEncoder();
  if (!timingSafeEqual(enc.encode(req.headers.get("x-cron-secret") ?? ""), enc.encode(expected))) {
    return json({ error: "unauthorized" }, 401);
  }

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
  if (missing.length) return json({ error: "missing env", missing }, 500);

  const fetchCsv = async (url: string, label: string): Promise<string> => {
    const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`${label} fetch failed: HTTP ${res.status}`);
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.startsWith("text/")) throw new Error(`${label} unexpected content-type: ${ct}`);
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
    return json({ error: "fetch failed", detail: String(e) }, 502);
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
    const text = errors.length > 0
      ? `WO-001 FAIL · vitals import: ${errors[0]?.error}`
      : records.length === 0
        ? `WO-001 WARN · vitals: 0 records parsed — check sheet sharing or content-type`
        : `WO-001 OK · vitals: ${upserted} date(s) upserted (latest ${latest})`;
    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
    } catch (_) { /* swallow — a Slack outage never fails the import */ }
  }

  return json(result, errors.length ? 207 : 200);
});
