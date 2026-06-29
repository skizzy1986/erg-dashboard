// mapper.ts — pure mapping of Google Health API `dataPoints.list` responses into VitalRecord.
// No side effects, no IO — unit-testable outside Deno.
//
// Response shape (camelCase), confirmed against live Fitbit/Health-Connect data:
//   { "dataPoints": [ { "dailyHeartRateVariability": { "averageHeartRateVariabilityMilliseconds": 31.8, ... } }, ... ] }
//   resting HR:  dataPoints[].dailyRestingHeartRate.beatsPerMinute   (string int64)
//   HRV (RMSSD): dataPoints[].dailyHeartRateVariability.averageHeartRateVariabilityMilliseconds (number, ms)
//   weight:      dataPoints[].weight.weightGrams                      (number, grams -> /1000 kg)
//   sleep:       dataPoints[].sleep.summary.minutesAsleep             (int64 minutes -> /60 hours)
// All extractors return null rather than throwing when the shape is missing/empty.

export type VitalRecord = {
  date: string;
  rhr_bpm: number | null;
  hrv_ms: number | null;
  sleep_hours: number | null;
  bodyweight_kg: number | null;
  steps_count: number | null;
  distance_m: number | null;
  active_minutes: number | null;
  calories_kcal: number | null;
};

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function dataPoints(resp: unknown): unknown[] {
  const r = asRecord(resp);
  return r && Array.isArray(r.dataPoints) ? (r.dataPoints as unknown[]) : [];
}

function num(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

// HRV -> hrv_ms (RMSSD, rounded). First data point carrying a value wins.
export function extractHrv(resp: unknown): number | null {
  for (const p of dataPoints(resp)) {
    const d = asRecord(asRecord(p)?.dailyHeartRateVariability);
    const n = d ? num(d.averageHeartRateVariabilityMilliseconds) : null;
    if (n != null) return Math.round(n);
  }
  return null;
}

// Resting HR -> rhr_bpm (rounded). beatsPerMinute arrives as a string.
export function extractRhr(resp: unknown): number | null {
  for (const p of dataPoints(resp)) {
    const d = asRecord(asRecord(p)?.dailyRestingHeartRate);
    const n = d ? num(d.beatsPerMinute) : null;
    if (n != null) return Math.round(n);
  }
  return null;
}

// Weight -> bodyweight_kg. weightGrams / 1000, 2 dp. First measurement wins.
export function extractWeightKg(resp: unknown): number | null {
  for (const p of dataPoints(resp)) {
    const w = asRecord(asRecord(p)?.weight);
    const g = w ? num(w.weightGrams) : null;
    if (g != null) return +(g / 1000).toFixed(2);
  }
  return null;
}

// Sleep -> sleep_hours. Sum minutesAsleep across sessions for the date, / 60, 2 dp.
export function extractSleepHours(resp: unknown): number | null {
  let totalMinutes = 0;
  let found = false;
  for (const p of dataPoints(resp)) {
    const s = asRecord(asRecord(p)?.sleep);
    const summary = s ? asRecord(s.summary) : null;
    const mins = summary ? num(summary.minutesAsleep) : null;
    if (mins != null && mins > 0) { totalMinutes += mins; found = true; }
  }
  if (!found || totalMinutes <= 0) return null;
  return +(totalMinutes / 60).toFixed(2);
}

export function extractSteps(resp: unknown): number | null {
  const pts = dataPoints(resp);
  if (!pts.length) return null;
  const total = pts.reduce((s, p) => {
    const r = asRecord(p);
    return s + (num(asRecord(r?.dailySteps)?.count) ?? 0);
  }, 0);
  return total > 0 ? Math.round(total) : null;
}

export function extractDistanceMeters(resp: unknown): number | null {
  const pts = dataPoints(resp);
  if (!pts.length) return null;
  const total = pts.reduce((s, p) => {
    const r = asRecord(p);
    return s + (num(asRecord(r?.dailyDistance)?.distanceMeters) ?? 0);
  }, 0);
  return total > 0 ? Math.round(total * 100) / 100 : null;
}

export function extractActiveMinutes(resp: unknown): number | null {
  const pts = dataPoints(resp);
  if (!pts.length) return null;
  const total = pts.reduce((s, p) => {
    const r = asRecord(p);
    const mins =
      num(asRecord(r?.dailyActiveMinutes)?.minutes) ??
      num(asRecord(r?.activeZoneMinutes)?.minutes) ??
      0;
    return s + mins;
  }, 0);
  return total > 0 ? Math.round(total) : null;
}

export function extractCaloriesKcal(resp: unknown): number | null {
  const pts = dataPoints(resp);
  if (!pts.length) return null;
  const total = pts.reduce((s, p) => {
    const r = asRecord(p);
    return s + (num(asRecord(r?.dailyCaloriesExpended)?.energyKilocalories) ?? 0);
  }, 0);
  return total > 0 ? Math.round(total) : null;
}

export function mapResponses(
  date: string,
  hrv: unknown,
  rhr: unknown,
  sleep: unknown,
  weight: unknown,
  stepsResp?: unknown,
  distanceResp?: unknown,
  activeMinResp?: unknown,
  caloriesResp?: unknown,
): VitalRecord {
  return {
    date,
    hrv_ms: extractHrv(hrv),
    rhr_bpm: extractRhr(rhr),
    sleep_hours: extractSleepHours(sleep),
    bodyweight_kg: extractWeightKg(weight),
    steps_count: extractSteps(stepsResp),
    distance_m: extractDistanceMeters(distanceResp),
    active_minutes: extractActiveMinutes(activeMinResp),
    calories_kcal: extractCaloriesKcal(caloriesResp),
  };
}
