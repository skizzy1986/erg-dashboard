// strava-sync — on-demand Strava → sessions upsert, user-triggered from the UI (#54).
// Deployed with JWT verification ON (default; do NOT use --no-verify-jwt). The
// Supabase gateway validates the caller's session JWT before this handler runs.
// Incremental only (no backfill); shares the Strava/Supabase secrets with
// strava-import. No Slack (mirrors vitals-sync).
//
// Required env (shared with strava-import): STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET,
//   STRAVA_USER_ID, SUPABASE_URL (auto-injected), SUPABASE_SERVICE_ROLE_KEY (auto-injected).
import { runStravaSync } from "../strava-import-api/sync.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS, "Content-Type": "application/json" },
    });

  const clientId     = Deno.env.get("STRAVA_CLIENT_ID");
  const clientSecret = Deno.env.get("STRAVA_CLIENT_SECRET");
  const userId       = Deno.env.get("STRAVA_USER_ID");
  const supaUrl      = Deno.env.get("SUPABASE_URL");
  const serviceKey   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  const missing = [
    ["STRAVA_CLIENT_ID", clientId],
    ["STRAVA_CLIENT_SECRET", clientSecret],
    ["STRAVA_USER_ID", userId],
    ["SUPABASE_URL", supaUrl],
    ["SUPABASE_SERVICE_ROLE_KEY", serviceKey],
  ].filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) return json({ error: "missing env", missing }, 500);

  let result;
  try {
    result = await runStravaSync(
      { clientId: clientId!, clientSecret: clientSecret!, userId: userId!, supaUrl: supaUrl!, serviceKey: serviceKey! },
      false,
    );
  } catch (e) {
    return json({ error: "strava sync failed", detail: String(e) }, 502);
  }

  if (result.range === null) {
    return json({ ok: true, imported: 0, skipped: 0, throttled: false, range: null });
  }

  return json(
    { ok: result.ok, imported: result.imported, skipped: result.skipped, throttled: result.throttled, range: result.range },
    result.throttled ? 207 : 200,
  );
});
