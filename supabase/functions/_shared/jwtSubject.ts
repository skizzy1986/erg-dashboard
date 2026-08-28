// jwtSubject.ts — read the authenticated user id out of the request's bearer.
//
// THIS DOES NOT VERIFY THE SIGNATURE, and must not be used as if it did. It is
// safe only in a function deployed with JWT verification ON (the default): the
// Supabase gateway validates the signature, issuer and expiry before the
// handler is ever invoked, so by the time this runs the token is already known
// to be genuine and all that is left is to read a claim out of it.
//
// A function deployed with --no-verify-jwt must NEVER use this to decide who
// the caller is — there is nothing upstream doing the verifying, and the `sub`
// claim would be whatever the caller typed.
//
// The alternative this replaces is worse in a way that is easy to miss: taking
// a user id from the request BODY, or from an environment variable like
// vitals-sync's VITALS_USER_ID. A body-supplied id lets any authenticated
// caller act as any user; an env-pinned id makes the function silently wrong
// the day a second user exists.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function decodeBase64Url(segment: string): string {
  const padded = segment.replace(/-/g, "+").replace(/_/g, "/")
    .padEnd(segment.length + ((4 - (segment.length % 4)) % 4), "=");
  const bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/**
 * The `sub` claim of the Authorization bearer, or null when there is no bearer,
 * it is malformed, or `sub` is not a UUID. Never throws.
 */
export function subjectFromAuthHeader(req: Request): string | null {
  const header = req.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  const parts = match[1].split(".");
  if (parts.length !== 3) return null;

  try {
    const claims = JSON.parse(decodeBase64Url(parts[1])) as Record<string, unknown>;
    const sub = claims?.sub;
    return typeof sub === "string" && UUID_RE.test(sub) ? sub : null;
  } catch {
    return null;
  }
}
