// state.ts — cursor and budget arithmetic, pure. No IO, no clock of its own:
// every function that needs "now" takes it as an argument, which is what makes
// the throttling behaviour testable instead of timing-dependent.
import type { RateLimit } from "./client.ts";

/**
 * Detail fetches per invocation. The real constraint is Strava's 15-minute read
 * quota shared with every other call the app makes; this is the belt to that
 * braces, so one runaway backfill cannot spend the whole window.
 */
export const MAX_STRAVA_CALLS = 50;

/**
 * Wall-clock budget. Supabase edge functions have a hard execution ceiling, and
 * a run killed mid-page loses whatever it had not yet persisted. Stopping
 * ourselves at 20 s means the cursor is always written by a run that chose to
 * stop, never by one that was cut off.
 */
export const MAX_WALL_MS = 20_000;

/**
 * Stop at 80% of the 15-minute window rather than 100%. The remaining 20% is
 * headroom for vitals-import, the Coach tab and any manual sync that fires in
 * the same window — spending the quota to the last call would make THOSE fail
 * instead, which is a much worse trade than one slower backfill.
 */
export const RATE_LIMIT_STOP_FRACTION = 0.8;

export const QUARTER_HOUR_MS = 15 * 60 * 1000;

export type StopReason = "calls" | "elapsed" | "rate_limit" | null;
export type ChunkBudget = { maxCalls: number; maxElapsedMs: number };

export const DEFAULT_BUDGET: ChunkBudget = {
  maxCalls: MAX_STRAVA_CALLS,
  maxElapsedMs: MAX_WALL_MS,
};

/**
 * Should this invocation stop fetching and persist what it has?
 *
 * The three limits are independent and any one of them trips: a run can be
 * inside its call budget and inside its time budget and still have to stop
 * because the shared 15-minute quota is nearly spent.
 */
export function shouldStopChunk(
  calls: number,
  elapsedMs: number,
  rateLimit: RateLimit,
  budget: ChunkBudget = DEFAULT_BUDGET,
): { stop: boolean; reason: StopReason } {
  if (calls >= budget.maxCalls) return { stop: true, reason: "calls" };
  if (elapsedMs >= budget.maxElapsedMs) return { stop: true, reason: "elapsed" };
  if (
    rateLimit.shortLimit != null &&
    rateLimit.shortUsage != null &&
    rateLimit.shortLimit > 0 &&
    rateLimit.shortUsage >= RATE_LIMIT_STOP_FRACTION * rateLimit.shortLimit
  ) {
    return { stop: true, reason: "rate_limit" };
  }
  return { stop: false, reason: null };
}

/**
 * Next 00/15/30/45 boundary, strictly after `nowMs`. Strava's short window
 * resets on the quarter hour, so this is when a rate-limited run may resume.
 * Exactly on a boundary returns the NEXT one — resuming at the instant of a
 * reset races the reset itself.
 */
export function nextQuarterHour(nowMs: number): number {
  return (Math.floor(nowMs / QUARTER_HOUR_MS) + 1) * QUARTER_HOUR_MS;
}

/**
 * Move the backfill `before` cursor further back in time.
 *
 * Strava returns a page newest-first, so the oldest activity on the page is the
 * next boundary. The cursor MUST decrease on every page or the backfill re-lists
 * the same page forever, spending the quota and never finishing. When a page
 * cannot supply a strictly smaller value — every activity shares the boundary
 * second, or the page was empty of usable timestamps — we step back one second
 * by hand. One second of history is a cheap price for a guaranteed terminator.
 */
export function advanceBackfillCursor(
  current: number | null,
  epochSeconds: number[],
): number | null {
  const usable = epochSeconds.filter((n) => Number.isFinite(n));
  if (usable.length === 0) return current == null ? null : current - 1;
  const oldest = Math.min(...usable);
  if (current == null) return oldest;
  return oldest < current ? oldest : current - 1;
}

/**
 * Incremental watermark. Advances over EVERYTHING seen, ineligible activities
 * included — a week containing nothing but WeightTraining must still move the
 * watermark, or every subsequent run re-lists that week for ever.
 */
export function advanceIncrementalWatermark(
  current: number | null,
  epochSeconds: number[],
): number | null {
  const usable = epochSeconds.filter((n) => Number.isFinite(n));
  if (usable.length === 0) return current;
  const newest = Math.max(...usable);
  if (current == null) return newest;
  return newest > current ? newest : current;
}

/** Unix seconds from a UTC ISO stamp. Strava's `start_date` always ends in Z. */
export function epochSecondsFromUTC(startDate: string | null | undefined): number {
  const ms = Date.parse(String(startDate ?? ""));
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : NaN;
}
