// client.ts — every HTTP call to Strava, and nothing else. No Supabase import,
// no environment reads beyond what is passed in, so the module stays trivially
// swappable in tests.
//
// SECRET DISCIPLINE, enforced here rather than left to call sites: no thrown
// error, no message, no property on any error class below ever carries an
// access token, refresh token, client secret, authorization code or OAuth
// state. Sentry fingerprints on the error message, so a message carrying token
// material would write that token into the issue title and every alert that
// quotes it. Errors carry a status code and a bounded reason string, full stop.

// Module constants, never environment variables. These are fixed properties of
// Strava's API — putting them in env would mean a mistyped secret could point
// the OAuth exchange at an attacker-controlled host and hand it the client
// secret, with nothing in code to notice.
export const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";
export const STRAVA_AUTHORIZE_URL = "https://www.strava.com/oauth/authorize";
export const STRAVA_DEAUTHORIZE_URL = "https://www.strava.com/oauth/deauthorize";
export const STRAVA_API_BASE = "https://www.strava.com/api/v3";

export type RateLimit = {
  /** 15-minute window limit and usage, or null when Strava sent no header. */
  shortLimit: number | null;
  shortUsage: number | null;
  dailyLimit: number | null;
  dailyUsage: number | null;
  /** 'read' when the read-specific headers were present, 'overall' otherwise. */
  source: "read" | "overall" | null;
};

export const EMPTY_RATE_LIMIT: RateLimit = {
  shortLimit: null,
  shortUsage: null,
  dailyLimit: null,
  dailyUsage: null,
  source: null,
};

export type StravaTokens = {
  access_token: string;
  refresh_token: string;
  /** Unix seconds, as Strava sends it. */
  expires_at: number;
  athlete_id: number | null;
  /** Present on some responses only; the callback's `scope` query param is authoritative. */
  scope: string | null;
};

/** Strava refused the credential itself. Never retried blindly — see tokens.ts. */
export class StravaAuthError extends Error {
  code: "invalid_grant" | "unauthorized";
  constructor(code: "invalid_grant" | "unauthorized") {
    super(`strava auth rejected: ${code}`);
    this.name = "StravaAuthError";
    this.code = code;
  }
}

export class StravaRateLimitError extends Error {
  rateLimit: RateLimit;
  constructor(rateLimit: RateLimit) {
    super("strava rate limit exceeded (429)");
    this.name = "StravaRateLimitError";
    this.rateLimit = rateLimit;
  }
}

export class StravaHttpError extends Error {
  status: number;
  constructor(status: number, what: string) {
    super(`strava ${what} failed: HTTP ${status}`);
    this.name = "StravaHttpError";
    this.status = status;
  }
}

/**
 * Read the live quota out of a response rather than hardcoding Strava's
 * published numbers — the published numbers are per-application defaults and
 * change without notice, and a hardcoded ceiling that is too high gets the app
 * throttled while one that is too low throws away usable budget.
 *
 * Headers are "limit,daily" pairs, e.g. X-RateLimit-Limit: "200,2000" with
 * X-RateLimit-Usage: "57,913". The read-specific pair is preferred when
 * present, because listing and fetching activities spends the read quota.
 */
export function parseRateLimit(headers: Headers): RateLimit {
  const pair = (v: string | null): [number | null, number | null] => {
    if (!v) return [null, null];
    const parts = v.split(",").map((p) => Number(p.trim()));
    const ok = (n: number) => (Number.isFinite(n) ? n : null);
    return [ok(parts[0]), ok(parts[1])];
  };

  const readLimit = headers.get("x-readratelimit-limit");
  const readUsage = headers.get("x-readratelimit-usage");
  if (readLimit || readUsage) {
    const [sl, dl] = pair(readLimit);
    const [su, du] = pair(readUsage);
    return { shortLimit: sl, dailyLimit: dl, shortUsage: su, dailyUsage: du, source: "read" };
  }

  const limit = headers.get("x-ratelimit-limit");
  const usage = headers.get("x-ratelimit-usage");
  if (!limit && !usage) return EMPTY_RATE_LIMIT;
  const [sl, dl] = pair(limit);
  const [su, du] = pair(usage);
  return { shortLimit: sl, dailyLimit: dl, shortUsage: su, dailyUsage: du, source: "overall" };
}

/** True when a 400/401 token response is Strava saying the grant itself is dead. */
function isInvalidGrant(status: number, body: unknown): boolean {
  if (status !== 400 && status !== 401) return false;
  const b = body as Record<string, unknown> | null;
  if (b && typeof b.error === "string" && b.error === "invalid_grant") return true;
  const errors = b && Array.isArray(b.errors) ? (b.errors as Record<string, unknown>[]) : [];
  return errors.some(
    (e) =>
      (e?.field === "refresh_token" || e?.field === "code" || e?.resource === "RefreshToken") &&
      e?.code === "invalid",
  );
}

async function postToken(
  body: URLSearchParams,
  what: "token exchange" | "token refresh",
): Promise<StravaTokens> {
  const res = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  // Read as text then parse, so a non-JSON error page cannot throw here and
  // mask the real status. The text itself is NEVER put into an error message.
  const text = await res.text();
  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = JSON.parse(text) as Record<string, unknown>;
  } catch {
    parsed = null;
  }

  if (!res.ok) {
    if (isInvalidGrant(res.status, parsed)) throw new StravaAuthError("invalid_grant");
    if (res.status === 401) throw new StravaAuthError("unauthorized");
    if (res.status === 429) throw new StravaRateLimitError(parseRateLimit(res.headers));
    throw new StravaHttpError(res.status, what);
  }

  const access = parsed?.access_token;
  const refresh = parsed?.refresh_token;
  const expires = parsed?.expires_at;
  if (typeof access !== "string" || !access || typeof refresh !== "string" || !refresh) {
    throw new StravaHttpError(res.status, `${what} (no tokens in response)`);
  }

  const athlete = parsed?.athlete as Record<string, unknown> | undefined;
  return {
    access_token: access,
    refresh_token: refresh,
    expires_at: typeof expires === "number" ? expires : 0,
    athlete_id: typeof athlete?.id === "number" ? (athlete.id as number) : null,
    scope: typeof parsed?.scope === "string" ? (parsed.scope as string) : null,
  };
}

/** One-time exchange of an authorization code. Called only by the OAuth callback. */
export function exchangeAuthCode(
  clientId: string,
  clientSecret: string,
  code: string,
): Promise<StravaTokens> {
  return postToken(
    new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
    }),
    "token exchange",
  );
}

/**
 * Trade a refresh token for a fresh access token.
 *
 * Strava ROTATES the refresh token on every successful refresh: the response
 * carries a new refresh_token and the presented one stops working. The caller
 * must persist it — see tokens.ts, which is the only place that should call
 * this directly.
 */
export function refreshAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string,
): Promise<StravaTokens> {
  return postToken(
    new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    "token refresh",
  );
}

async function getJson(url: string, accessToken: string, what: string): Promise<{
  body: unknown;
  rateLimit: RateLimit;
}> {
  const res = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const rateLimit = parseRateLimit(res.headers);

  if (res.status === 429) throw new StravaRateLimitError(rateLimit);
  if (res.status === 401) throw new StravaAuthError("unauthorized");
  if (!res.ok) throw new StravaHttpError(res.status, what);

  return { body: await res.json(), rateLimit };
}

export type ListParams = {
  /** Unix seconds; activities strictly AFTER this. */
  after?: number | null;
  /** Unix seconds; activities strictly BEFORE this. */
  before?: number | null;
  page?: number;
  perPage?: number;
};

export async function listActivities(
  accessToken: string,
  params: ListParams,
): Promise<{ activities: Record<string, unknown>[]; rateLimit: RateLimit }> {
  const url = new URL(`${STRAVA_API_BASE}/athlete/activities`);
  if (params.after != null) url.searchParams.set("after", String(params.after));
  if (params.before != null) url.searchParams.set("before", String(params.before));
  url.searchParams.set("page", String(params.page ?? 1));
  url.searchParams.set("per_page", String(params.perPage ?? 100));

  const { body, rateLimit } = await getJson(url.toString(), accessToken, "athlete/activities");
  return {
    activities: Array.isArray(body) ? (body as Record<string, unknown>[]) : [],
    rateLimit,
  };
}

/**
 * Detail fetch. The summary payload from listActivities already carries every
 * field the mapper needs, so this is the exception path — used only when a
 * summary arrives missing distance, moving_time or start_date_local — and it
 * still spends the same read quota, so it is counted against the same budget.
 */
export async function getActivity(
  accessToken: string,
  activityId: number,
): Promise<{ activity: Record<string, unknown> | null; rateLimit: RateLimit }> {
  const { body, rateLimit } = await getJson(
    `${STRAVA_API_BASE}/activities/${activityId}`,
    accessToken,
    "activities/:id",
  );
  return { activity: body && typeof body === "object" ? (body as Record<string, unknown>) : null, rateLimit };
}

/**
 * Revoke an access token at Strava. Best-effort by contract: the caller is
 * either disconnecting (where a failure must not block deleting our copy) or
 * backing out of a connect that was granted the wrong scope (where the local
 * state was never written in the first place). Returns whether Strava accepted.
 */
export async function deauthorize(accessToken: string): Promise<boolean> {
  try {
    const res = await fetch(STRAVA_DEAUTHORIZE_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}
