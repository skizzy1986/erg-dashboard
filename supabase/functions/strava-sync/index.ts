// strava-sync — the user-triggered half of #54, for the Sync button in the
// dashboard. Deployed with JWT verification ON (the default; do NOT use
// --no-verify-jwt) so the Supabase gateway validates the session before this
// handler runs.
//
// It shares runImport with the cron entry point, so a manual sync and a
// scheduled one cannot drift apart in behaviour. The only differences are how
// the caller is authenticated and the `mode` recorded on the run.
import { captureFunctionError } from "../_shared/sentry.ts";
import { subjectFromAuthHeader } from "../_shared/jwtSubject.ts";
import { runImport, serviceClient } from "../strava-import/importer.ts";

const FN = "strava-sync";

// Same header list as strava-connect and coach-chat, and for the same reason:
// supabase.functions.invoke goes through the Sentry-instrumented global fetch,
// so sentry-trace and baggage appear in the preflight. Dropping either fails
// the OPTIONS and the request is never sent (incident #301).
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, sentry-trace, baggage",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS, "Content-Type": "application/json" },
    });

  // From the verified bearer's `sub`, never from the body and never from an
  // env var. See _shared/jwtSubject.ts.
  const userId = subjectFromAuthHeader(req);
  if (!userId) return json({ error: "unauthorized" }, 401);

  const clientId = Deno.env.get("STRAVA_CLIENT_ID");
  const clientSecret = Deno.env.get("STRAVA_CLIENT_SECRET");
  const backfillFrom = Deno.env.get("STRAVA_BACKFILL_FROM");
  const supaUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  const missing = [
    ["STRAVA_CLIENT_ID", clientId],
    ["STRAVA_CLIENT_SECRET", clientSecret],
    ["STRAVA_BACKFILL_FROM", backfillFrom],
    ["SUPABASE_URL", supaUrl],
    ["SUPABASE_SERVICE_ROLE_KEY", serviceKey],
  ]
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length) {
    await captureFunctionError(FN, new Error(`missing env: ${missing.join(", ")}`), { missing });
    return json({ error: "missing env", missing }, 500);
  }

  let dryRun = new URL(req.url).searchParams.get("dry_run") === "1";
  try {
    const body = await req.json();
    if (body?.dry_run === true) dryRun = true;
  } catch {
    // no body — a plain Sync press
  }

  try {
    const result = await runImport(
      {
        supa: serviceClient(supaUrl!, serviceKey!),
        clientId: clientId!,
        clientSecret: clientSecret!,
        backfillFrom: backfillFrom!,
      },
      { userId, mode: "user", dryRun },
    );
    return json(result, result.ok ? 200 : 207);
  } catch (e) {
    await captureFunctionError(FN, e, { userId, mode: "user" });
    return json({ error: "strava sync failed" }, 502);
  }
});
