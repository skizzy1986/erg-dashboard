// cronGuard.ts — fail-closed, timing-safe shared-secret check for the
// x-cron-secret header. Call this before any other work happens.
//
// Threat model this closes:
//   1. CRON_SECRET unset or "" must NEVER authorize a request (previously:
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
 * Returns a 401 Response if the request fails the CRON_SECRET guard.
 * Returns null if the request is authorized and the caller should proceed.
 */
export function checkCronSecret(req: Request): Response | null {
  const expected = Deno.env.get("CRON_SECRET");
  if (!expected) return unauthorized(); // unset or "" -> fail closed, no exceptions

  const provided = req.headers.get("x-cron-secret");
  if (!provided) return unauthorized(); // header missing or "" -> fail closed

  const match = timingSafeEqual(sha256(expected), sha256(provided));
  return match ? null : unauthorized();
}
