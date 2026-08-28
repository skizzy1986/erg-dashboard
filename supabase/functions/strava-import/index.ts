// strava-import — the scheduled half of #54. Walks Strava for every connected
// athlete, adopts the sessions already in the table under another source, and
// imports the rest.
//
// Deployed with --no-verify-jwt (pg_cron carries no session JWT), so the
// x-cron-secret guard is the ONLY thing standing between this handler and the
// public internet. It runs before anything else touches the environment or the
// database — see cronGuard.ts for why an unset secret must fail closed.
//
// The guard uses STRAVA_CRON_SECRET, deliberately not the shared CRON_SECRET
// the vitals jobs use: separate secrets mean a leak of one cannot be replayed
// against the other, and either can be rotated alone.
//
// No Sentry cron check-in here. The free plan allows a single cron monitor and
// it is spent on vitals-import, whose silent failure degrades readiness and
// every load figure downstream. A silent failure here costs a delayed import
// that the next run picks up from the persisted cursor.
import { checkCronSecret } from "../_shared/cronGuard.ts";
import { captureFunctionError } from "../_shared/sentry.ts";
import { runImport, type ImportResult } from "./importer.ts";
import { serviceClient } from "./supaClient.ts";

const FN = "strava-import";

Deno.serve(async (req: Request) => {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });

  // 1. shared-secret guard, before any other work.
  const guard = checkCronSecret(req, "STRAVA_CRON_SECRET");
  if (guard) return guard;

  // 2. required env, named explicitly so a missing secret is diagnosable from
  //    the response rather than from a stack trace.
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

  // 3. dry run, from the query string or a JSON body. Runs the entire pipeline
  //    and reports the per-activity decision with ZERO writes — including no
  //    sync-state update, so inspecting the plan cannot change the next run.
  const url = new URL(req.url);
  let dryRun = url.searchParams.get("dry_run") === "1" ||
    url.searchParams.get("dry_run") === "true";
  if (!dryRun && req.method === "POST") {
    try {
      const body = await req.json();
      dryRun = body?.dry_run === true;
    } catch {
      // no body, or not JSON — a plain cron POST. Not an error.
    }
  }

  const supa = serviceClient(supaUrl!, serviceKey!);

  // 4. every connected athlete. Solo today; a loop rather than a hardcoded user
  //    id because a hardcoded id is exactly the vitals-sync pattern this
  //    feature was told not to copy.
  const { data: rows, error } = await supa
    .from("strava_sync_state")
    .select("user_id")
    .eq("connected", true);
  if (error) {
    await captureFunctionError(FN, new Error(`sync state read failed: ${error.code ?? "unknown"}`), {});
    return json({ error: "sync state read failed" }, 502);
  }

  const users = (rows ?? []).map((r) => String((r as { user_id: string }).user_id));
  if (users.length === 0) return json({ ok: true, status: "noop", users: 0 }, 200);

  const results: ImportResult[] = [];
  for (const userId of users) {
    try {
      results.push(
        await runImport(
          { supa, clientId: clientId!, clientSecret: clientSecret!, backfillFrom: backfillFrom! },
          { userId, mode: "cron", dryRun },
        ),
      );
    } catch (e) {
      // One athlete's run must never abort the others.
      await captureFunctionError(FN, e, { userId, mode: "cron" });
      results.push({
        ok: false,
        userId,
        mode: "cron",
        dryRun,
        status: "error",
        errorCode: "unknown",
        imported: 0,
        adopted: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        deferred: 0,
        ambiguousActivityIds: [],
        stopReason: null,
        stravaCalls: 0,
        backfillComplete: false,
        decisions: [],
      });
    }
  }

  const ok = results.every((r) => r.ok);
  // 207 when some athlete ended partial/error, so a monitor can tell the
  // difference between "nothing to do" and "half of it did not land".
  return json({ ok, dryRun, results }, ok ? 200 : 207);
});
