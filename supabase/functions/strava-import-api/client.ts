// client.ts — isolates all HTTP to the Strava API for issue #54.
// (1) OAuth token endpoints (authorization-code exchange + refresh-token rotation),
// (2) list/detail activity reads. No Supabase imports here. All calls throw on
// non-2xx with a truncated body (mirror vitals-import-api/client.ts).

const TOKEN_ENDPOINT = "https://www.strava.com/oauth/token";
const API_BASE = "https://www.strava.com/api/v3";

export type StravaTokens = {
  access_token: string;
  refresh_token: string;
  expires_at: number; // Unix epoch seconds
  scope: string | null;
  athlete_id: number | null;
};

export type RateLimit = {
  shortLimit: number | null;
  shortUsage: number | null;
  dailyLimit: number | null;
  dailyUsage: number | null;
};

// Thrown on HTTP 429 so the sync runner can stop gracefully (throttled=true → 207)
// rather than treating a rate-limit hit as a hard failure (502).
export class StravaRateLimitError extends Error {
  rateLimit: RateLimit;
  constructor(message: string, rateLimit: RateLimit) {
    super(message);
    this.name = "StravaRateLimitError";
    this.rateLimit = rateLimit;
  }
}

function parseRateLimit(res: Response): RateLimit {
  // X-RateLimit-Limit / X-RateLimit-Usage are "short,daily" comma pairs.
  const pair = (name: string): [number | null, number | null] => {
    const raw = res.headers.get(name);
    if (!raw) return [null, null];
    const [a, b] = raw.split(",").map((s) => Number(s.trim()));
    return [Number.isFinite(a) ? a : null, Number.isFinite(b) ? b : null];
  };
  const [shortLimit, dailyLimit] = pair("X-RateLimit-Limit");
  const [shortUsage, dailyUsage] = pair("X-RateLimit-Usage");
  return { shortLimit, shortUsage, dailyLimit, dailyUsage };
}

async function postToken(body: URLSearchParams): Promise<StravaTokens> {
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
    throw new Error(`Strava token endpoint failed: HTTP ${res.status}: ${text.slice(0, 200)}`);
  }

  const accessToken = parsed?.access_token;
  const refreshToken = parsed?.refresh_token;
  const expiresAt = parsed?.expires_at;
  if (typeof accessToken !== "string" || accessToken === "") {
    throw new Error("Strava token endpoint returned no access_token");
  }
  if (typeof refreshToken !== "string" || refreshToken === "") {
    throw new Error("Strava token endpoint returned no refresh_token");
  }

  const athlete = parsed?.athlete && typeof parsed.athlete === "object"
    ? (parsed.athlete as Record<string, unknown>)
    : null;
  const athleteId = typeof athlete?.id === "number" ? athlete.id : null;

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: typeof expiresAt === "number" ? expiresAt : Number(expiresAt) || 0,
    scope: typeof parsed?.scope === "string" ? parsed.scope : null,
    athlete_id: athleteId,
  };
}

// Exchange a one-time authorization code (from the OAuth redirect) for tokens.
export async function exchangeAuthCode(
  clientId: string,
  clientSecret: string,
  code: string,
  redirectUri: string,
): Promise<StravaTokens> {
  return await postToken(new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  }));
}

// Refresh an access token. Strava rotates the refresh_token — the caller must
// persist the returned refresh_token.
export async function refreshAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string,
): Promise<StravaTokens> {
  return await postToken(new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  }));
}

// List the athlete's activities (summary objects) for a window. perPage clamped ≤200.
export async function listActivities(
  accessToken: string,
  opts: { after?: number; before?: number; page?: number; perPage?: number },
): Promise<{ activities: unknown[]; rateLimit: RateLimit }> {
  const url = new URL(`${API_BASE}/athlete/activities`);
  if (opts.after != null) url.searchParams.set("after", String(opts.after));
  if (opts.before != null) url.searchParams.set("before", String(opts.before));
  if (opts.page != null) url.searchParams.set("page", String(opts.page));
  const perPage = Math.min(opts.perPage ?? 200, 200);
  url.searchParams.set("per_page", String(perPage));

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { "Authorization": `Bearer ${accessToken}` },
  });

  const rateLimit = parseRateLimit(res);
  if (res.status === 429) {
    throw new StravaRateLimitError("Strava listActivities rate-limited: HTTP 429", rateLimit);
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Strava listActivities failed: HTTP ${res.status}: ${text.slice(0, 300)}`);
  }

  const body = await res.json();
  return { activities: Array.isArray(body) ? body : [], rateLimit };
}

// Fetch a single detailed activity (needed for average_watts / device_watts etc.).
export async function getActivityDetail(
  accessToken: string,
  activityId: number,
): Promise<{ activity: unknown; rateLimit: RateLimit }> {
  const url = new URL(`${API_BASE}/activities/${activityId}`);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { "Authorization": `Bearer ${accessToken}` },
  });

  const rateLimit = parseRateLimit(res);
  if (res.status === 429) {
    throw new StravaRateLimitError(`Strava getActivityDetail ${activityId} rate-limited: HTTP 429`, rateLimit);
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Strava getActivityDetail ${activityId} failed: HTTP ${res.status}: ${text.slice(0, 300)}`);
  }

  return { activity: await res.json(), rateLimit };
}
