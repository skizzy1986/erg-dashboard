// client.ts — isolates all HTTP to the Google APIs for WO-005.
// (1) exchange the long-lived refresh token for a short-lived access token,
// (2) list a single data type's data points for a filter window from the Google Health API.
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
    throw new Error(`token exchange returned no access_token`);
  }

  return accessToken;
}

// List data points for one data type matching an AIP-160 filter string.
// NB: the filter must be snake_case (data-type prefix AND member names); the JSON
// response is camelCase. GET, no request body. Throws on HTTP error.
export async function listDataPoints(
  accessToken: string,
  dataType: string,
  filter: string,
  pageSize?: number,
): Promise<unknown> {
  const url = new URL(`${HEALTH_API_BASE}/users/me/dataTypes/${dataType}/dataPoints`);
  url.searchParams.set("filter", filter);
  if (pageSize) url.searchParams.set("pageSize", String(pageSize));

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { "Authorization": `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Health API ${dataType} failed: HTTP ${res.status}: ${text.slice(0, 300)}`);
  }

  return await res.json();
}
