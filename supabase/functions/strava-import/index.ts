// strava-import — scheduled (cron) Strava → sessions sync (#54).
// Deployed with verify_jwt=false; guarded by the x-cron-secret header.
// Reads the stored Strava token, pages the activity window (365-day backfill on
// first run, incremental otherwise), maps supported sports, and upserts each
// session via upsert_strava_session. Stops early on rate-limit pressure (207);
// the next run resumes from the advanced watermark.
//
// Required env: STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_USER_ID,
//   CRON_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
// Optional: SLACK_BUILD_WEBHOOK_URL. Optional body: { backfill: true }.
import { runStravaSync } from "../strava-import-api/sync.ts";

Deno.serve(async (req: Request) => {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

  const webhookUrl = Deno.env.get("SLACK_BUILD_WEBHOOK_URL");
  const slack = async (text: string): Promise<void> => {
    if (!webhookUrl) return;
    try {
      await fetch(webhookUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
    } catch (_) { /* swallow — a Slack outage never fails the import */ }
  };

  const expected = Deno.env.get("CRON_SECRET");
  if (expected && req.headers.get("x-cron-secret") !== expected) {
    return json({ error: "unauthorized" }, 401);
  }

  const clientId     = Deno.env.get("STRAVA_CLIENT_ID");
  const clientSecret = Deno.env.get("STRAVA_CLIENT_SECRET");
  const userId       = Deno.env.get("STRAVA_USER_ID");
  const supaUrl      = Deno.env.get("SUPABASE_URL");
  const serviceKey   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  const missing = [
    ["STRAVA_CLIENT_ID", clientId],
    ["STRAVA_CLIENT_SECRET", clientSecret],
    ["STRAVA_USER_ID", userId],
    ["CRON_SECRET", expected],
    ["SUPABASE_URL", supaUrl],
    ["SUPABASE_SERVICE_ROLE_KEY", serviceKey],
  ].filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) return json({ error: "missing env", missing }, 500);

  let backfill = false;
  try {
    const body = await req.json();
    backfill = body?.backfill === true;
  } catch (_) { /* no body — incremental */ }

  let result;
  try {
    result = await runStravaSync(
      { clientId: clientId!, clientSecret: clientSecret!, userId: userId!, supaUrl: supaUrl!, serviceKey: serviceKey! },
      backfill,
    );
  } catch (e) {
    await slack(`#54 FAIL · Strava import: ${String(e)}`);
    return json({ error: "strava import failed", detail: String(e) }, 502);
  }

  if (result.range === null) {
    return json({ ok: true, skipped: "not connected" });
  }

  if (result.throttled) {
    await slack(`#54 THROTTLED · Strava import: ${result.imported} imported, paused on rate limit`);
    return json({ ok: false, throttled: true, imported: result.imported, skipped: result.skipped, range: result.range }, 207);
  }

  await slack(`#54 OK · Strava import: ${result.imported} imported, ${result.skipped} skipped`);
  return json({ ok: true, imported: result.imported, skipped: result.skipped, throttled: false, range: result.range });
});
