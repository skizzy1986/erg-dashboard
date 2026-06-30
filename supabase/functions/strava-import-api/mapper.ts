// mapper.ts — pure mapping of Strava activity objects into StravaSessionRecord.
// No side effects, no IO — unit-testable outside Deno (mirrors vitals mapper.ts).
// All extractors return null rather than throwing when a field is missing/malformed.
//
// Sport mapping (sport_type ?? type):
//   Rowing               -> 'erg'      (lowercase)
//   Ride, VirtualRide    -> 'cycling'  (lowercase)
//   WeightTraining, Workout -> 'Strength' (capitalised)
//   anything else (Run, Walk, Hike, Swim, …) -> null (skipped, no detail fetch)

export type StravaSessionRecord = {
  strava_activity_id: number;
  date: string;
  type: string;
  label: string | null;
  duration: string;
  avg_watts: number | null;
  avg_hr: number | null;
  distance_m: number | null;
  sport_type: string | null;
  start_date: string | null;
};

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function num(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : null;
}

export function mapSportType(activity: unknown): string | null {
  const a = asRecord(activity);
  if (!a) return null;
  const sport = str(a.sport_type) ?? str(a.type);
  switch (sport) {
    case "Rowing":
      return "erg";
    case "Ride":
    case "VirtualRide":
      return "cycling";
    case "WeightTraining":
    case "Workout":
      return "Strength";
    default:
      return null;
  }
}

export function mapActivity(detailedActivity: unknown): StravaSessionRecord | null {
  const type = mapSportType(detailedActivity);
  if (type === null) return null;

  const a = asRecord(detailedActivity);
  if (!a) return null;

  const id = num(a.id);
  if (id == null) return null;

  const startLocal = str(a.start_date_local);
  const date = startLocal ? startLocal.slice(0, 10) : "";

  const movingTime = num(a.moving_time) ?? 0;
  const duration = String(Math.round(movingTime / 60));

  const distance = num(a.distance);
  const distance_m = distance != null ? Math.round(distance) : null;

  const watts = num(a.average_watts);
  const avg_watts = watts != null ? Math.round(watts) : null;

  const hr = num(a.average_heartrate);
  const avg_hr = hr != null ? Math.round(hr) : null;

  return {
    strava_activity_id: id,
    date,
    type,
    label: str(a.name),
    duration,
    avg_watts,
    avg_hr,
    distance_m,
    sport_type: str(a.sport_type) ?? str(a.type),
    start_date: str(a.start_date),
  };
}
