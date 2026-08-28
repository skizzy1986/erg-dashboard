// cronGuard.ts — fail-closed, timing-safe shared-secret check for the
// x-cron-secret header. Call this before any other work happens.
//
// This is a COPY of vitals-import-api/cronGuard.ts, not an import from it, and
// deliberately so: making a Strava function depend on a *vitals* function is a
// nonsense dependency that would make either one un-deletable without breaking
// the other. It lives in _shared/ so the next cron function copies nothing.
//
// One thing is genuinely new here and it is the reason the env var name is a
// parameter: strava-import guards on STRAVA_CRON_SECRET, not the shared
// CRON_SECRET. Separate secrets mean a leaked vitals cron secret cannot be
// replayed against the Strava importer, and rotating one does not force
// rotating the other. The default keeps the existing call sites unchanged.
//
// Threat model this closes:
//   1. The secret unset or "" must NEVER authorize a request (previously:
//      `if (expected && ...)` skipped the check entirely when `expected`
//      was falsy, silently opening the endpoint to any unauthenticated
//      caller).
//   2. Raw string `!==` short-circuits on the first differing byte, so a
//      naive check leaks how many leading characters of a guessed secret
//      are correct via response timing. We instead compare fixed-length
//      SHA-256 digests of both sides with node:crypto's timingSafeEqual,
//      so every call — right or wrong, short or long, matching or not —
//      does the identical fixed-size constant-time compare. Hashing first
//      also sidesteps timingSafeEqual's hard requirement that both inputs
//      be equal length (it throws otherwise): the two digests are always
//      exactly 32 bytes, so there is no length branch to leak and no
//      exception path to reason about.
import { createHash, timingSafeEqual } from "node:crypto";

const unauthorized = (): Response =>
  new Response(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });

const sha256 = (input: string): Uint8Array => createHash("sha256").update(input, "utf8").digest();

/**
 * Returns a 401 Response if the request fails the shared-secret guard.
 * Returns null if the request is authorized and the caller should proceed.
 *
 * `envVar` names the secret to compare against; it is never read from the
 * request, only from the function's own environment.
 */
export function checkCronSecret(req: Request, envVar = "CRON_SECRET"): Response | null {
  const expected = Deno.env.get(envVar);
  if (!expected) return unauthorized(); // unset or "" -> fail closed, no exceptions

  const provided = req.headers.get("x-cron-secret");
  if (!provided) return unauthorized(); // header missing or "" -> fail closed

  const match = timingSafeEqual(sha256(expected), sha256(provided));
  return match ? null : unauthorized();
}
