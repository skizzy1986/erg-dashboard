// strava-oauth-callback — browser-redirect target of the Strava OAuth flow (#54).
// Deployed with verify_jwt=false (Strava redirects the browser here with no JWT).
// Exchanges the one-time ?code for tokens and persists them via
// upsert_integration_token (service role; user_id = STRAVA_USER_ID). Returns a
// minimal HTML page — NEVER renders tokens into the response body.
//
// Required env: STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_REDIRECT_URI,
//   STRAVA_USER_ID, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
// Optional: SLACK_BUILD_WEBHOOK_URL.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { exchangeAuthCode } from "../strava-import-api/client.ts";

function html(body: string, status = 200): Response {
  return new Response(
    `<!doctype html><meta charset="utf-8"><title>Strava</title><body style="font-family:system-ui;background:#08080d;color:#e8e8f0;padding:40px;text-align:center">${body}</body>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

Deno.serve(async (req: Request) => {
  const webhookUrl = Deno.env.get("SLACK_BUILD_WEBHOOK_URL");
  const slack = async (text: string): Promise<void> => {
    if (!webhookUrl) return;
    try {
      await fetch(webhookUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
    } catch (_) { /* swallow — a Slack outage never fails the callback */ }
  };

  const clientId     = Deno.env.get("STRAVA_CLIENT_ID");
  const clientSecret = Deno.env.get("STRAVA_CLIENT_SECRET");
  const redirectUri  = Deno.env.get("STRAVA_REDIRECT_URI");
  const userId       = Deno.env.get("STRAVA_USER_ID");
  const supaUrl      = Deno.env.get("SUPABASE_URL");
  const serviceKey   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  const missing = [
    ["STRAVA_CLIENT_ID", clientId],
    ["STRAVA_CLIENT_SECRET", clientSecret],
    ["STRAVA_REDIRECT_URI", redirectUri],
    ["STRAVA_USER_ID", userId],
    ["SUPABASE_URL", supaUrl],
    ["SUPABASE_SERVICE_ROLE_KEY", serviceKey],
  ].filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) {
    return new Response(JSON.stringify({ error: "missing env", missing }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const error = url.searchParams.get("error");
  if (error) {
    return html(`<h2>Strava connection cancelled</h2><p>${error}. You can close this tab.</p>`);
  }

  const code = url.searchParams.get("code");
  if (!code) {
    return html(`<h2>Strava connection failed</h2><p>No authorization code returned. You can close this tab.</p>`, 400);
  }

  let tokens;
  try {
    tokens = await exchangeAuthCode(clientId!, clientSecret!, code, redirectUri!);
  } catch (e) {
    await slack(`#54 FAIL · Strava code exchange: ${String(e)}`);
    return html(`<h2>Strava connection failed</h2><p>Could not exchange the authorization code. You can close this tab.</p>`, 502);
  }

  const supa = createClient(supaUrl!, serviceKey!, { auth: { persistSession: false } });
  const { error: rpcError } = await supa.rpc("upsert_integration_token", {
    p_user_id: userId,
    p_provider: "strava",
    p_access_token: tokens.access_token,
    p_refresh_token: tokens.refresh_token,
    p_expires_at: new Date(tokens.expires_at * 1000).toISOString(),
    p_scope: tokens.scope,
    p_athlete_id: tokens.athlete_id,
  });
  if (rpcError) {
    await slack(`#54 FAIL · Strava token upsert: ${rpcError.message}`);
    return html(`<h2>Strava connection failed</h2><p>Could not store the connection. You can close this tab.</p>`, 502);
  }

  await slack(`#54 OK · Strava connected (athlete ${tokens.athlete_id ?? "?"})`);
  return html(`<h2>Strava connected</h2><p>You can close this tab.</p>`);
});
