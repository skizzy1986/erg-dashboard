// client.ts — isolates all HTTP to the Google APIs for WO-005.
// Two responsibilities: (1) exchange the long-lived refresh token for a short-lived
// access token, (2) fetch a single daily-rolled-up metric from the Google Health API.
// No Supabase imports here.

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const HEALTH_API_BASE = "https://health.googleapis.com/v4";

// Exchange the refresh token for a short-lived access token (no browser interaction).
export async function exchangeToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string,
): Promise<string> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });

  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const text = await res.text();
  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = JSON.parse(text) as Record<string, unknown>;
  } catch {
    parsed = null;
  }

  if (!res.ok) {
    const desc =
      (parsed && typeof parsed.error_description === "string" && parsed.error_description) ||
      `HTTP ${res.status}: ${text.slice(0, 200)}`;
    throw new Error(`token exchange failed: ${desc}`);
  }

  const accessToken = parsed?.access_token;
  if (typeof accessToken !== "string" || accessToken === "") {
    const desc =
      (parsed && typeof parsed.error_description === "string" && parsed.error_description) ||
      `HTTP ${res.status}: ${text.slice(0, 200)}`;
    throw new Error(`token exchange returned no access_token: ${desc}`);
  }

  return accessToken;
}

// Fetch a single metric's daily roll-up for one date. Throws on HTTP error;
// returns the parsed JSON body on success.
export async function fetchMetric(
  accessToken: string,
  dataType: string,
  date: string,
): Promise<unknown> {
  const url = `${HEALTH_API_BASE}/users/me/dataTypes/${dataType}/dataPoints:dailyRollUp`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ startDate: date, endDate: date }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Health API ${dataType} failed: HTTP ${res.status}: ${text.slice(0, 200)}`);
  }

  return await res.json();
}
