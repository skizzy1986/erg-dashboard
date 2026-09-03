// tokens.ts — keeping the Strava connection alive across two entry points.
//
// Read this before changing anything in it. Strava ROTATES the refresh token on
// every successful refresh: the response carries a NEW refresh_token and the one
// just presented stops working immediately. Two things follow, and both have
// bitten every integration that has ever got this wrong:
//
//   1. Dropping the rotated refresh token does not fail now. It fails in about
//      six hours, when the access token expires and the only refresh token we
//      still hold is the dead one — surfacing as an opaque 401 with no obvious
//      connection to the deploy that caused it.
//   2. Two workers refreshing at once (the nightly cron and a user pressing
//      Sync) can each present the same refresh token. The second one is racing
//      a token that has already been rotated out from under it.
//
// HOW THIS IS SERIALISED, and an honest note about what was specified.
//
// The design called for pg_advisory_xact_lock (or SELECT ... FOR UPDATE) held
// across read-refresh-write. That is not achievable from an edge function: the
// refresh is an HTTPS round trip to Strava sitting in the middle of the
// critical section, and every PostgREST call is its own transaction on a
// pooled connection, so any lock taken is released before the HTTP call is even
// made. A transaction-scoped lock here would serialise nothing while looking
// like it did — which is worse than no lock, because it stops anyone asking the
// question again.
//
// What actually holds the invariant is a compare-and-swap on the write:
//
//     update strava_tokens set ... where user_id = $1 and refresh_token = $presented
//
// A rotation can then only be written by the worker that presented the token
// being replaced. The loser's write matches zero rows, it learns it lost, and
// it uses the winner's live access token instead of overwriting it. No rotation
// is lost, and the failure mode is a wasted HTTP call rather than a dead
// connection. TokenStore.rotate is required to implement exactly that
// predicate; see createSupabaseTokenStore in importer.ts.
import { StravaAuthError, type StravaTokens } from "./client.ts";

/** Refresh this many seconds BEFORE the access token actually expires. */
export const EXPIRY_SKEW_S = 300;

export type StoredTokens = {
  athlete_id: number;
  access_token: string;
  refresh_token: string;
  /** ISO timestamptz as PostgREST returns it. */
  expires_at: string;
  scope: string;
};

export type RotatedTokens = {
  access_token: string;
  refresh_token: string;
  /** ISO timestamptz. */
  expires_at: string;
};

export type TokenStore = {
  read(userId: string): Promise<StoredTokens | null>;
  /**
   * Compare-and-swap. MUST write only when the stored refresh_token still
   * equals `expectedRefreshToken`, and MUST return false (not throw) when it
   * does not. Returning true on an unconditional write would reintroduce the
   * lost-rotation bug this whole module exists to prevent.
   */
  rotate(userId: string, expectedRefreshToken: string, next: RotatedTokens): Promise<boolean>;
  remove(userId: string): Promise<void>;
};

export type RefreshFn = (refreshToken: string) => Promise<StravaTokens>;

export type TokenResult =
  | { status: "ok"; accessToken: string; athleteId: number; rotated: boolean }
  | { status: "not_connected" }
  | { status: "auth_failed" }
  | { status: "refresh_failed" };

/** Strava sends expires_at as unix seconds; the column is timestamptz. */
export function expiresAtISO(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toISOString();
}

export function isFresh(stored: StoredTokens, nowMs: number, skewS = EXPIRY_SKEW_S): boolean {
  const expiry = Date.parse(stored.expires_at);
  if (!Number.isFinite(expiry)) return false; // unparseable -> refresh, never assume valid
  return expiry > nowMs + skewS * 1000;
}

/**
 * Return an access token that is valid right now, refreshing and persisting the
 * rotation if needed.
 *
 * The invalid_grant handling is the subtle half. A single invalid_grant does
 * NOT mean Scott revoked the app — it is exactly what a lost race looks like
 * from the loser's side, because the winner's refresh already invalidated the
 * token we presented. So on the first invalid_grant we re-read the row and try
 * once more with whatever is stored now. Only a SECOND consecutive
 * invalid_grant, on a freshly-read token, is treated as a real revocation and
 * deletes the row. A revocation fails both times; a race does not.
 *
 * Deleting the row on the first failure would be the expensive mistake: it
 * silently disconnects Strava, and the only symptom is that new activities
 * quietly stop appearing.
 */
export async function getFreshAccessToken(
  store: TokenStore,
  refresh: RefreshFn,
  userId: string,
  nowMs: number,
): Promise<TokenResult> {
  const stored = await store.read(userId);
  if (!stored) return { status: "not_connected" };

  if (isFresh(stored, nowMs)) {
    return {
      status: "ok",
      accessToken: stored.access_token,
      athleteId: stored.athlete_id,
      rotated: false,
    };
  }

  let presented = stored.refresh_token;
  let athleteId = stored.athlete_id;

  for (let attempt = 1; attempt <= 2; attempt++) {
    let fresh: StravaTokens;
    try {
      fresh = await refresh(presented);
    } catch (e) {
      if (!(e instanceof StravaAuthError) || e.code !== "invalid_grant") {
        // A 5xx, a network blip, a 429. The credential is not implicated, so
        // the row stays exactly where it is and the run reports refresh_failed.
        return { status: "refresh_failed" };
      }
      if (attempt === 2) {
        await store.remove(userId);
        return { status: "auth_failed" };
      }
      const reread = await store.read(userId);
      if (!reread) return { status: "not_connected" };
      // Retried even when the stored token is unchanged: two consecutive
      // failures on a freshly-read token is the evidence required before
      // destroying the connection, and one extra HTTP call is a trivial price
      // for not disconnecting on a race.
      presented = reread.refresh_token;
      athleteId = reread.athlete_id;
      continue;
    }

    const wrote = await store.rotate(userId, presented, {
      access_token: fresh.access_token,
      refresh_token: fresh.refresh_token,
      expires_at: expiresAtISO(fresh.expires_at),
    });

    if (wrote) {
      return {
        status: "ok",
        accessToken: fresh.access_token,
        athleteId: fresh.athlete_id ?? athleteId,
        rotated: true,
      };
    }

    // CAS lost: another worker rotated first, so the row now holds ITS tokens.
    // Ours are valid too, but writing them would strand the winner's refresh
    // token. Use what is stored instead.
    const winner = await store.read(userId);
    if (!winner) return { status: "not_connected" };
    return {
      status: "ok",
      accessToken: winner.access_token,
      athleteId: winner.athlete_id,
      rotated: false,
    };
  }

  return { status: "auth_failed" };
}
