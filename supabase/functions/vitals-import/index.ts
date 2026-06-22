// vitals-import — daily ingestion of the Health Data Export sheet into public.vitals.
// Reads the published-CSV of the sheet, maps per VITALS_IMPORT.md, and upserts via
// public.upsert_vital (coalesce: never null-wipes, never touches readiness/soreness/notes).
//
// Required env (set as Edge Function secrets):
//   SHEET_CSV_URL              publish-to-web CSV URL of the Health Data Export sheet
//   VITALS_USER_ID             owner uuid (rows written with this so RLS shows them to Scott)
//   SUPABASE_URL               (auto-injected on Supabase)
//   SUPABASE_SERVICE_ROLE_KEY  service role (bypasses RLS; required to write)
//   CRON_SECRET                shared secret; caller must send header x-cron-secret
import { createClient } from "jsr:@supabase/supabase-js@2";
import { buildRecords } from "./parser.ts";

Deno.serve(async (req: Request) => {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

  // shared-secret guard (function is deployed with verify_jwt=false)
  const expected = Deno.env.get("CRON_SECRET");
  if (expected && req.headers.get("x-cron-secret") !== expected) {
    return json({ error: "unauthorized" }, 401);
  }

  const csvUrl = Deno.env.get("SHEET_CSV_URL");
  const userId = Deno.env.get("VITALS_USER_ID");
  const supaUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const missing = [
    ["SHEET_CSV_URL", csvUrl], ["VITALS_USER_ID", userId],
    ["SUPABASE_URL", supaUrl], ["SUPABASE_SERVICE_ROLE_KEY", serviceKey],
  ].filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) return json({ error: "missing env", missing }, 500);

  let csv: string;
  try {
    const res = await fetch(csvUrl!, { redirect: "follow" });
    if (!res.ok) return json({ error: "fetch failed", status: res.status }, 502);
    csv = await res.text();
  } catch (e) {
    return json({ error: "fetch threw", detail: String(e) }, 502);
  }

  const records = buildRecords(csv);
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

  return json({
    ok: errors.length === 0,
    parsed: records.length,
    upserted,
    errors,
    range: records.length ? { first: records[0].date, last: records[records.length - 1].date } : null,
  }, errors.length ? 207 : 200);
});
