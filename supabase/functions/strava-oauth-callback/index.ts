// strava-oauth-callback — the redirect target Strava sends the browser back to.
//
// Deployed with --no-verify-jwt: Strava's redirect is a plain browser
// navigation carrying no session JWT, so there is nothing for the gateway to
// verify. That makes this the one Strava endpoint reachable by anyone, and
// everything below is shaped by that.
//
// THREE RULES, all of them consequences of being public:
//
//  1. ALWAYS 302, NEVER A BODY. No JSON, no error text, no echo of `code` or
//     `state`. A response body here is a reflection primitive and an oracle
//     that tells a prober which states exist.
//
//  2. FAILED VALIDATION IS NOT AN ERROR. A malformed, expired or already-used
//     state is ordinary traffic on a public URL — a stale bookmark, a
//     double-clicked Connect button, a scanner. Reporting those to Sentry
//     would let any anonymous caller drain the free plan's quota at will and
//     blind monitoring for the whole org. Sentry hears only about token
//     exchange 5xx, database write failure, and genuinely unexpected throws.
//
//  3. THE REDIRECT TARGET IS ALWAYS THE CONFIGURED URL. Never a value from the
//     request — that is an open redirect, and on an OAuth callback an open
//     redirect is how the authorization code gets forwarded to someone else.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { captureFunctionError } from "../_shared/sentry.ts";
import { deauthorize, exchangeAuthCode, type StravaTokens } from "../strava-import/client.ts";

const FN = "strava-oauth-callback";

const REQUIRED_SCOPE = "activity:read_all";

// base64url of 32 bytes is exactly 43 characters. Anything else was not minted
// by strava-connect.
const STATE_RE = /^[A-Za-z0-9_-]{43}$/;
const CODE_RE = /^[A-Za-z0-9_-]{8,512}$/;

const STATE_TTL_MS = 60 * 60 * 1000;

Deno.serve(async (req: Request) => {
  const appUrl = Deno.env.get("STRAVA_APP_REDIRECT_URL");

  // Without a configured destination there is nowhere safe to send the browser.
  // 404 rather than inventing a target from the request.
  if (!appUrl) {
    await captureFunctionError(FN, new Error("missing env: STRAVA_APP_REDIRECT_URL"), {});
    return new Response(null, { status: 404 });
  }

  const redirect = (params: Record<string, string>): Response => {
    const to = new URL(appUrl);
    for (const [k, v] of Object.entries(params)) to.searchParams.set(k, v);
    return new Response(null, {
      status: 302,
      headers: { Location: to.toString(), "Cache-Control": "no-store" },
    });
  };
  const fail = (reason: string) => redirect({ strava: "error", reason });

  if (req.method !== "GET") return redirect({ strava: "error", reason: "method" });

  const url = new URL(req.url);
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const denied = url.searchParams.get("error");

  // The user pressed Cancel on Strava's authorize screen. Entirely normal.
  if (denied) return fail("denied");

  // Cheap pre-filter FIRST: shape only, no crypto, no database round trip, no
  // Sentry. A scanner hitting this URL costs one regex, not a hash and a query.
  if (!state || !STATE_RE.test(state)) return fail("state");
  if (!code || !CODE_RE.test(code)) return fail("code");

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
    // A configuration fault, not hostile traffic — this one Sentry should see.
    await captureFunctionError(FN, new Error(`missing env: ${missing.join(", ")}`), { missing });
    return fail("server");
  }

  const supa = createClient(supaUrl!, serviceKey!, { auth: { persistSession: false } });

  try {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(state));
    const stateHash = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // ONE atomic statement — an UPDATE ... WHERE redeemed_at IS NULL RETURNING,
    // never a SELECT followed by an UPDATE. Check-then-set has a window in
    // which two concurrent callbacks both see the state unredeemed and both
    // proceed; this way exactly one of them gets a row back. It is also what
    // makes an impatient double-click land on the error page instead of
    // exchanging the code twice.
    const { data: redeemed, error: redeemErr } = await supa
      .from("strava_oauth_state")
      .update({ redeemed_at: new Date().toISOString() })
      .eq("state_hash", stateHash)
      .is("redeemed_at", null)
      .gte("created_at", new Date(Date.now() - STATE_TTL_MS).toISOString())
      .select("user_id");

    if (redeemErr) {
      await captureFunctionError(FN, new Error(`state redeem failed: ${redeemErr.code ?? "unknown"}`), {});
      return fail("server");
    }
    // Zero rows is the expected outcome for expired, unknown or already-used
    // state. Not reported: see rule 2 in the header.
    if (!Array.isArray(redeemed) || redeemed.length !== 1) return fail("state");

    const userId = String((redeemed[0] as { user_id: string }).user_id);

    let tokens: StravaTokens;
    try {
      tokens = await exchangeAuthCode(clientId!, clientSecret!, code);
    } catch (e) {
      // A dead or replayed code is client-side and quiet; anything else is a
      // real upstream failure worth an issue.
      const status = (e as { status?: number })?.status;
      if (status && status >= 500) {
        await captureFunctionError(FN, e, { stage: "token-exchange", status });
      }
      return fail("exchange");
    }

    // Strava reports the granted scope on the CALLBACK query string; the token
    // response does not reliably carry it. A user can untick permissions on the
    // authorize screen, so what we asked for is not what we got.
    const granted = url.searchParams.get("scope") ?? tokens.scope ?? "";
    if (!granted.split(",").map((s) => s.trim()).includes(REQUIRED_SCOPE)) {
      // Do NOT persist. A token without activity:read_all cannot see private
      // activities, so it would produce a silently partial history — worse than
      // no connection, because the adoption pass would then insert duplicates
      // for everything it could not see. Hand the token straight back.
      await deauthorize(tokens.access_token);
      return fail("insufficient_scope");
    }

    const athleteId = tokens.athlete_id;
    if (athleteId == null) return fail("exchange");

    // A different athlete than the one already connected. Refuse rather than
    // overwrite: blending two people's training into one log is not a
    // confidentiality problem, it is a corrupted training history that nobody
    // can untangle afterwards. An explicit disconnect is required first.
    const { data: existing, error: existingErr } = await supa
      .from("strava_tokens")
      .select("athlete_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (existingErr) {
      await captureFunctionError(FN, new Error(`tokens read failed: ${existingErr.code ?? "unknown"}`), { userId });
      return fail("server");
    }
    if (existing && Number((existing as { athlete_id: number }).athlete_id) !== athleteId) {
      await deauthorize(tokens.access_token);
      return fail("athlete_mismatch");
    }

    const nowISO = new Date().toISOString();
    const { error: tokenErr } = await supa.from("strava_tokens").upsert(
      {
        user_id: userId,
        athlete_id: athleteId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: new Date(tokens.expires_at * 1000).toISOString(),
        scope: granted,
        updated_at: nowISO,
      },
      { onConflict: "user_id" },
    );
    if (tokenErr) {
      await captureFunctionError(FN, new Error(`tokens upsert failed: ${tokenErr.code ?? "unknown"}`), { userId });
      return fail("server");
    }

    // Cursors are deliberately NOT reset here. Reconnecting the same athlete
    // after an accidental disconnect should resume, not re-walk ten weeks.
    const { error: syncErr } = await supa.from("strava_sync_state").upsert(
      {
        user_id: userId,
        connected: true,
        athlete_id: athleteId,
        scope: granted,
        connected_at: nowISO,
        disconnected_at: null,
        backfill_from: backfillFrom!,
        updated_at: nowISO,
      },
      { onConflict: "user_id" },
    );
    if (syncErr) {
      await captureFunctionError(FN, new Error(`sync state upsert failed: ${syncErr.code ?? "unknown"}`), { userId });
      return fail("server");
    }

    return redirect({ strava: "connected" });
  } catch (e) {
    await captureFunctionError(FN, e, { stage: "callback" });
    return fail("server");
  }
});
