// mapper.ts — pure mapping of raw Google Health API dailyRollUp responses into VitalRecord.
// No side effects, no IO — unit-testable outside Deno.
//
// ============================================================================
// CRITICAL — UNVERIFIED RESPONSE FIELD NAMES
// ============================================================================
// The Google Health API launched May 2026. The exact JSON response shape for the
// `dataPoints:dailyRollUp` endpoint is NOT yet empirically confirmed in this repo.
// Every field path used by the extractors below is a PROVISIONAL ASSUMPTION derived
// from the documented schema. Before this function is trusted in production, each
// extractor's assumed path MUST be validated against a real live API response (or the
// reference at developers.google.com/health) and corrected if it differs.
//
// Assumed common response shape for all four metrics (one consistent shape, documented
// once here, reused by every extractor):
//
//   {
//     "point": [
//       {
//         "value": [ { "fpVal": <number>, ... } ],   // typed value array
//         ...
//       }
//     ]
//   }
//
// Notes on the assumption:
//  - The top-level array is assumed to be `point` (fall back to `dataPoints` defensively).
//  - Each point carries a `value` array of typed values; numeric readings are assumed to
//    be in `fpVal` (floating-point) with `intVal` as a defensive fallback.
//  - Per-metric extractors additionally assume named keys (e.g. `rmssd`, `beatsPerMinute`,
//    `weightKg`, sleep `stage`/`durationMinutes`) documented in each block below.
// All extractors return null rather than throwing when the shape is missing/malformed.
// ============================================================================

export type VitalRecord = {
  date: string;            // YYYY-MM-DD
  rhr_bpm: number | null;
  hrv_ms: number | null;
  sleep_hours: number | null;
  bodyweight_kg: number | null;
};

// --- shared defensive accessors --------------------------------------------

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

// Pull the data points array out of a response, tolerating `point` or `dataPoints`.
function points(resp: unknown): unknown[] {
  const r = asRecord(resp);
  if (!r) return [];
  if (Array.isArray(r.point)) return r.point as unknown[];
  if (Array.isArray(r.dataPoints)) return r.dataPoints as unknown[];
  return [];
}

// Read a finite number from a value-like object, preferring fpVal then intVal,
// optionally keyed by a named field on the value object.
function readNumber(value: unknown, key?: string): number | null {
  const r = asRecord(value);
  if (!r) return null;
  const candidates: unknown[] = [];
  if (key) candidates.push(r[key]);
  candidates.push(r.fpVal, r.intVal, r.value);
  for (const c of candidates) {
    const n = typeof c === "number" ? c : typeof c === "string" ? Number(c) : NaN;
    if (Number.isFinite(n)) return n;
  }
  return null;
}

// First finite number found across all points' value arrays, optionally keyed.
function firstValue(resp: unknown, key?: string): number | null {
  for (const p of points(resp)) {
    const pr = asRecord(p);
    if (!pr) continue;
    for (const v of asArray(pr.value)) {
      const n = readNumber(v, key);
      if (n != null) return n;
    }
    // Some shapes may place the number directly on the point.
    const direct = readNumber(pr, key);
    if (direct != null) return direct;
  }
  return null;
}

// --- per-metric extractors --------------------------------------------------

// HRV (daily-heart-rate-variability) -> hrv_ms.
// ASSUMED PATH (UNVERIFIED): point[].value[].rmssd (fp), else point[].value[].fpVal.
// Verify the RMSSD field key against a live response before production use.
export function extractHrv(resp: unknown): number | null {
  const n = firstValue(resp, "rmssd");
  return n == null ? null : Math.round(n);
}

// RHR (daily-resting-heart-rate) -> rhr_bpm.
// ASSUMED PATH (UNVERIFIED): point[].value[].beatsPerMinute (fp/int), else fpVal/intVal.
// Verify the resting-HR field key against a live response before production use.
export function extractRhr(resp: unknown): number | null {
  const n = firstValue(resp, "beatsPerMinute");
  return n == null ? null : Math.round(n);
}

// Sleep (sleep) -> sleep_hours.
// ASSUMED PATH (UNVERIFIED): point[].value[] is an array of sleep-stage segments, each
// with a `stage` string and a `durationMinutes` number. Sum durations of all stages
// whose `stage` is NOT "Awake" (case-insensitive), divide by 60, round to 2 dp.
// Returns null if no non-Awake duration was found.
// Verify the stage label values and duration field key against a live response.
export function extractSleepHours(resp: unknown): number | null {
  let totalMinutes = 0;
  let found = false;
  for (const p of points(resp)) {
    const pr = asRecord(p);
    if (!pr) continue;
    for (const seg of asArray(pr.value)) {
      const sr = asRecord(seg);
      if (!sr) continue;
      const stage = typeof sr.stage === "string" ? sr.stage : "";
      if (stage.toLowerCase() === "awake") continue;
      const mins = readNumber(sr, "durationMinutes");
      if (mins != null) {
        totalMinutes += mins;
        found = true;
      }
    }
  }
  if (!found || totalMinutes <= 0) return null;
  return +(totalMinutes / 60).toFixed(2);
}

// Weight (weight) -> bodyweight_kg.
// ASSUMED PATH (UNVERIFIED): point[].value[].weightKg (fp), else point[].value[].fpVal.
// Assumes the value is already in kilograms. Verify the field key and unit against a
// live response before production use.
export function extractWeightKg(resp: unknown): number | null {
  return firstValue(resp, "weightKg");
}

// --- top-level assembly -----------------------------------------------------

export function mapResponses(
  date: string,
  hrv: unknown,
  rhr: unknown,
  sleep: unknown,
  weight: unknown,
): VitalRecord {
  return {
    date,
    hrv_ms: extractHrv(hrv),
    rhr_bpm: extractRhr(rhr),
    sleep_hours: extractSleepHours(sleep),
    bodyweight_kg: extractWeightKg(weight),
  };
}
