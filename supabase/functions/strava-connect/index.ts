// strava-connect — starts and ends the Strava OAuth relationship. Called from
// the dashboard, so it is deployed with JWT verification ON (the default; do
// NOT use --no-verify-jwt). The Supabase gateway validates the session JWT
// before this handler runs.
//
// Actions: { action: "start" } -> { url } to send the browser to
//          { action: "disconnect" } -> revoke at Strava and forget the tokens
import { createClient } from "jsr:@supabase/supabase-js@2";
import { captureFunctionError } from "../_shared/sentry.ts";
import { subjectFromAuthHeader } from "../_shared/jwtSubject.ts";
import { deauthorize, refreshAccessToken, STRAVA_AUTHORIZE_URL } from "../strava-import/client.ts";
import { createSupabaseTokenStore } from "../strava-import/importer.ts";
import { getFreshAccessToken } from "../strava-import/tokens.ts";

const FN = "strava-connect";

// sentry-trace and baggage are NOT optional. supabase.functions.invoke goes
// through the Sentry-instrumented global fetch, which attaches both headers;
// neither is CORS-safelisted, so both appear in the preflight. Omitting them
// here fails the OPTIONS and the browser never sends the real request — the
// client sees a bare `TypeError: Failed to fetch` and the edge logs show only
// the OPTIONS. That is incident #301, which silently killed the Coach tab.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, sentry-trace, baggage",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

// activity:read_all, not activity:read. activity:read omits activities marked
// private, and Scott's erg and Zwift uploads are frequently private — with the
// narrower scope the importer would silently see a partial history and the
// adoption pass would insert duplicates for the sessions it could not see.
// `read` is deliberately NOT requested: nothing here calls an endpoint that
// needs it.
const SCOPE = "activity:read_all";

const STATE_TTL_MS = 60 * 60 * 1000;

function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS, "Content-Type": "application/json" },
    });

  // The user id comes from the verified bearer's `sub` claim and from nowhere
  // else. Never from the request body — that would let any signed-in caller
  // connect or disconnect any account — and never from an env var, which is
  // the vitals-sync VITALS_USER_ID pattern this function must not copy.
  const userId = subjectFromAuthHeader(req);
  if (!userId) return json({ error: "unauthorized" }, 401);

  const clientId = Deno.env.get("STRAVA_CLIENT_ID");
  const clientSecret = Deno.env.get("STRAVA_CLIENT_SECRET");
  const redirectUrl = Deno.env.get("STRAVA_OAUTH_CALLBACK_URL");
  const supaUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  const missing = [
    ["STRAVA_CLIENT_ID", clientId],
    ["STRAVA_CLIENT_SECRET", clientSecret],
    ["STRAVA_OAUTH_CALLBACK_URL", redirectUrl],
    ["SUPABASE_URL", supaUrl],
    ["SUPABASE_SERVICE_ROLE_KEY", serviceKey],
  ]
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length) {
    await captureFunctionError(FN, new Error(`missing env: ${missing.join(", ")}`), { missing });
    return json({ error: "missing env", missing }, 500);
  }

  let action = "start";
  try {
    const body = await req.json();
    if (typeof body?.action === "string") action = body.action;
  } catch {
    // no body -> default to start
  }

  const supa = createClient(supaUrl!, serviceKey!, { auth: { persistSession: false } });

  try {
    if (action === "start") {
      // Prune first. Abandoned states — a connect started and never finished —
      // otherwise accumulate for ever in a table nothing else ever deletes from.
      await supa
        .from("strava_oauth_state")
        .delete()
        .lt("created_at", new Date(Date.now() - STATE_TTL_MS).toISOString());

      // A plain opaque 32-byte random token. No HMAC and nothing embedded: the
      // DB row is what makes the state single-use AND what binds it to a user,
      // so signing it would add a second mechanism that has to agree with the
      // first without adding a property the row does not already provide.
      const state = base64url(crypto.getRandomValues(new Uint8Array(32)));
      const stateHash = await sha256Hex(state);

      const { error } = await supa
        .from("strava_oauth_state")
        .insert({ state_hash: stateHash, user_id: userId });
      if (error) throw new Error(`oauth state insert failed: ${error.code ?? "unknown"}`);

      const authorize = new URL(STRAVA_AUTHORIZE_URL);
      authorize.searchParams.set("client_id", clientId!);
      authorize.searchParams.set("redirect_uri", redirectUrl!);
      authorize.searchParams.set("response_type", "code");
      authorize.searchParams.set("approval_prompt", "auto");
      authorize.searchParams.set("scope", SCOPE);
      authorize.searchParams.set("state", state);

      // The state is returned to the browser (it has to be — it travels in the
      // URL) but is never logged and never reported to Sentry.
      return json({ ok: true, url: authorize.toString() });
    }

    if (action === "disconnect") {
      const store = createSupabaseTokenStore(supa);

      // Revoke at Strava before forgetting the token, and refresh first if
      // needed: deauthorize requires a live access token, and once our copy is
      // deleted there is no programmatic way to revoke the grant at all — it
      // would sit on Scott's Strava account until he found it by hand.
      let revoked = false;
      try {
        const token = await getFreshAccessToken(
          store,
          (rt) => refreshAccessToken(clientId!, clientSecret!, rt),
          userId,
          Date.now(),
        );
        if (token.status === "ok") revoked = await deauthorize(token.accessToken);
      } catch (e) {
        // Best effort by design: a Strava outage must not leave the user unable
        // to disconnect locally. Reported, then we carry on and delete.
        await captureFunctionError(FN, e, { userId, stage: "deauthorize" });
      }

      await store.remove(userId);
      const { error } = await supa
        .from("strava_sync_state")
        .update({
          connected: false,
          disconnected_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
      if (error) throw new Error(`sync state update failed: ${error.code ?? "unknown"}`);

      // revokedAtStrava:false means the local tokens are gone but the app
      // authorisation may still stand — the UI should point the user at
      // https://www.strava.com/settings/apps rather than claim success.
      return json({ ok: true, disconnected: true, revokedAtStrava: revoked });
    }

    return json({ error: "unknown action" }, 400);
  } catch (e) {
    await captureFunctionError(FN, e, { userId, action });
    return json({ error: "strava connect failed" }, 502);
  }
});
