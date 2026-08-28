// mapper.ts — every decision about what a Strava activity BECOMES, as pure
// functions. No IO, no Supabase, no fetch, no Date-of-now. That is what makes
// the risky parts of #54 — the log date, the dedupe label, and the adoption
// choice — testable without a network or a database, and it is where the test
// coverage for this feature lives.

// ---------------------------------------------------------------------------
// Eligibility constants
// ---------------------------------------------------------------------------

// ALLOW-LIST, never a deny-list. Scott's Strava account also contains Ride,
// Walk, Workout and WeightTraining. A deny-list would silently start importing
// whatever new sport_type Strava adds next, and strength in particular is
// already logged in far richer detail through the strength subsystem — a thin
// Strava duplicate of it would corrupt the load model, not enrich it.
export const ELIGIBLE_SPORT_TYPES = ["Rowing", "VirtualRide"] as const;
export type EligibleSportType = (typeof ELIGIBLE_SPORT_TYPES)[number];

// These two spellings are load-bearing and must stay lower case exactly as
// written. normType() in web/src/utils/formatting.js maps 'erg' -> 'Z2 Aerobic'
// and 'cycling' -> 'Cycling'; it has no 'Rowing' or 'VirtualRide' branch, so
// storing Strava's own names would render every imported session as a
// colourless unknown in the Log and the calendar.
export const SPORT_TYPE_TO_SESSION_TYPE: Record<EligibleSportType, "erg" | "cycling"> = {
  Rowing: "erg",
  VirtualRide: "cycling",
};

// Floors chosen against the real account, not picked round:
//   120 s keeps the 240 s CP Test while dropping the 4 s / 16 s / 23 s / 72 s
//   fragments Strava records when the PM5 or Zwift is bumped;
//   200 m drops the 9 m / 40 m / 53 m / 155 m fragments from the same cause.
// Both floors must hold — a 300 s, 30 m warm-up drift is still not a session.
export const MIN_MOVING_TIME_S = 120;
export const MIN_DISTANCE_M = 200;

// Distance agreement for the adoption pass. Derived from real pairs that are
// the same training filed twice: 8/6 13618 m vs 13620 m (2 m apart) and 7/3
// 10187 m vs 10192.2 m (5.2 m apart). The 5 m floor is what catches the short
// sessions where 0.5% is under a metre.
export const ADOPTION_DISTANCE_FLOOR_M = 5;
export const ADOPTION_DISTANCE_FRACTION = 0.005;

// Four real rows carry a hand-filed date one day off the activity's local date
// (logged after midnight, or filed the next morning).
export const ADOPTION_DAY_WINDOW = 1;

export const LABEL_MAX_LEN = 120;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** The subset of Strava's SummaryActivity this importer reads. */
export type StravaActivity = {
  id: number;
  name?: string | null;
  sport_type?: string | null;
  type?: string | null;
  start_date?: string | null;
  start_date_local?: string | null;
  distance?: number | null;
  moving_time?: number | null;
  average_watts?: number | null;
  /** DetailedActivity spells it device_watts; some payloads carry has_device_watts. */
  device_watts?: boolean | null;
  has_device_watts?: boolean | null;
  average_heartrate?: number | null;
  has_heartrate?: boolean | null;
};

export type SessionDraft = {
  strava_activity_id: number;
  date: string;
  type: "erg" | "cycling";
  label: string;
  duration: string;
  distance_m: number;
  avg_watts: number | null;
  avg_hr: number | null;
  status: "completed";
  source: "strava";
};

export type IneligibleReason =
  | "malformed"
  | "sport_type"
  | "before_backfill_from"
  | "moving_time"
  | "distance";

export type Eligibility =
  | { eligible: true; reason: null }
  | { eligible: false; reason: IneligibleReason };

export type AdoptionCandidate = {
  id: number;
  date_iso: string | null;
  type: string | null;
  distance_m: number | null;
};

export type AdoptionDecision =
  | { decision: "insert"; matches: AdoptionCandidate[] }
  | { decision: "adopt"; sessionId: number; matches: AdoptionCandidate[] }
  | { decision: "ambiguous"; matches: AdoptionCandidate[] };

// ---------------------------------------------------------------------------
// Dates and times — string slicing only
// ---------------------------------------------------------------------------

/**
 * The activity's local calendar day, as the ISO prefix Strava already gives us.
 *
 * start_date_local is "2026-08-22T21:02:23" — a LOCAL wall-clock stamp with no
 * timezone marker. Slicing is the whole implementation on purpose.
 */
export function localDateISO(startDateLocal: string): string {
  return String(startDateLocal).slice(0, 10);
}

/**
 * "2026-08-22T21:02:23" -> "8/22/26", the unpadded M/D/YY that sessions.date
 * uses (and that sessions.date_iso is generated from).
 *
 * NEVER `new Date(startDateLocal)`. Deno runs in UTC. Constructing a Date from
 * a timezone-less local string makes the runtime guess a zone, and then reading
 * calendar fields off it shifts the day for every session Scott rows after
 * 08:00 Perth time — which is most of them. That is a silent off-by-one that
 * would misfile sessions into the wrong training week and quietly corrupt every
 * CTL/ATL/TSB figure downstream. String slicing has no zone to get wrong.
 */
export function toLogDateFromLocal(startDateLocal: string): string {
  const iso = localDateISO(startDateLocal);
  const [y, m, d] = iso.split("-");
  return `${Number(m)}/${Number(d)}/${y.slice(2)}`;
}

/** "2026-08-22T21:02:23" -> "21:02". Characters 11-16, no parsing. */
export function localTimeHHMM(startDateLocal: string): string {
  return String(startDateLocal).slice(11, 16);
}

/**
 * Whole days between two "YYYY-MM-DD" strings, sign discarded.
 * Date.UTC over integers we parsed ourselves is deterministic — unlike parsing
 * a timezone-less string, which is the thing toLogDateFromLocal avoids.
 */
export function daysApartISO(a: string, b: string): number {
  const toUTC = (s: string): number => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.abs(Math.round((toUTC(a) - toUTC(b)) / 86400000));
}

/** Seconds -> "m:ss" / "mm:ss" / "mmm:ss": minutes unpadded, seconds always two digits. */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Field extraction
// ---------------------------------------------------------------------------

/**
 * True only when Strava says the power came from a meter.
 *
 * Both spellings are accepted because Strava is not consistent: DetailedActivity
 * documents `device_watts`, and some payloads carry `has_device_watts`. Absent
 * or false means Strava ESTIMATED the power from speed, and an estimate must
 * never reach avg_watts — CP is calibrated off that column, so a fabricated
 * figure does not just look wrong, it moves the training zones.
 */
export function hasDeviceWatts(a: StravaActivity): boolean {
  return a.has_device_watts === true || a.device_watts === true;
}

export function avgWattsOrNull(a: StravaActivity): number | null {
  if (!hasDeviceWatts(a)) return null;
  return typeof a.average_watts === "number" ? Math.round(a.average_watts) : null;
}

/**
 * Adoption overwrites avg_watts whenever the device-watts flag is set, so the
 * flag alone is not enough: a payload that claims device watts but carries no
 * numeric average_watts would write NULL over a value the row already had.
 * Adoption asks this instead, so a malformed payload leaves the row untouched.
 */
export function hasUsableDeviceWatts(a: StravaActivity): boolean {
  return hasDeviceWatts(a) && typeof a.average_watts === "number";
}

export function avgHrOrNull(a: StravaActivity): number | null {
  if (a.has_heartrate !== true) return null;
  return typeof a.average_heartrate === "number" ? Math.round(a.average_heartrate) : null;
}

/**
 * "<name> HH:MM", truncated to 120 characters.
 *
 * The label MUST NOT embed a watts figure. That is precisely what breaks dedupe
 * today: a label carrying power changes whenever the power does, so the same
 * session filed twice reads as two different sessions.
 *
 * The time suffix is what keeps two activities on the same day distinct, so
 * when a name is long enough to need truncating it is the NAME that gets cut,
 * never the time. Truncating the whole string instead would silently merge two
 * long-named same-day sessions into one label — and, with
 * sessions_date_label_key, turn the second import into a 23505.
 */
export function buildLabel(a: StravaActivity): string {
  const time = localTimeHHMM(String(a.start_date_local ?? ""));
  const raw = String(a.name ?? "").trim();
  const base = raw || `Strava ${a.sport_type ?? "activity"}`;
  const room = LABEL_MAX_LEN - (time.length + 1);
  return `${base.slice(0, room).trimEnd()} ${time}`;
}

// ---------------------------------------------------------------------------
// Eligibility
// ---------------------------------------------------------------------------

/**
 * `backfillFrom` is an ISO "YYYY-MM-DD". The comparison is a lexical string
 * compare of two ISO dates, which is the same ordering as a calendar compare
 * and needs no parsing.
 */
export function isEligible(a: StravaActivity, backfillFrom: string): Eligibility {
  if (
    typeof a.id !== "number" ||
    typeof a.start_date_local !== "string" ||
    a.start_date_local.length < 16 ||
    typeof a.moving_time !== "number" ||
    typeof a.distance !== "number"
  ) {
    return { eligible: false, reason: "malformed" };
  }
  if (!(ELIGIBLE_SPORT_TYPES as readonly string[]).includes(String(a.sport_type))) {
    return { eligible: false, reason: "sport_type" };
  }
  if (localDateISO(a.start_date_local) < backfillFrom) {
    return { eligible: false, reason: "before_backfill_from" };
  }
  if (a.moving_time < MIN_MOVING_TIME_S) return { eligible: false, reason: "moving_time" };
  if (a.distance < MIN_DISTANCE_M) return { eligible: false, reason: "distance" };
  return { eligible: true, reason: null };
}

// ---------------------------------------------------------------------------
// Mapping
// ---------------------------------------------------------------------------

/**
 * The full mapping contract. Note what is absent and must stay absent: srpe,
 * coach_note, prs, exercises, coach_flag and benchmark_key are Scott's, not
 * Strava's, and the importer has no business inventing any of them.
 */
export function mapActivityToSession(a: StravaActivity): SessionDraft {
  const sport = String(a.sport_type) as EligibleSportType;
  return {
    strava_activity_id: a.id,
    date: toLogDateFromLocal(String(a.start_date_local)),
    type: SPORT_TYPE_TO_SESSION_TYPE[sport],
    label: buildLabel(a),
    duration: formatDuration(Number(a.moving_time)),
    distance_m: Math.round(Number(a.distance)),
    avg_watts: avgWattsOrNull(a),
    avg_hr: avgHrOrNull(a),
    status: "completed",
    source: "strava",
  };
}

// ---------------------------------------------------------------------------
// Adoption
// ---------------------------------------------------------------------------

/**
 * Which family an EXISTING session's free-text `type` belongs to.
 * Existing rows carry 'erg', 'Z2 Aerobic', 'Cycling', 'bike', 'Ride', ... —
 * ten weeks of history written by five different sources.
 */
export function typeFamily(type: string | null | undefined): "erg" | "cycling" | null {
  const t = String(type ?? "").toLowerCase().trim();
  if (!t) return null;
  if (t.includes("erg") || t.includes("row") || t === "z2 aerobic") return "erg";
  if (t.includes("cycl") || t.includes("bike") || t.includes("ride")) return "cycling";
  return null;
}

export function distanceTolerance(targetMetres: number): number {
  return Math.max(ADOPTION_DISTANCE_FLOOR_M, ADOPTION_DISTANCE_FRACTION * targetMetres);
}

/**
 * Decide whether this activity is already in the table under another source.
 *
 * This is the single most consequential function in the feature. Roughly twenty
 * sessions were filed by hand or by Coach (source portal / coach / coach_plan /
 * claude_csv / concept2) and are the SAME training as a Strava activity.
 * Importing those again would double ten weeks of CTL, ATL and TSB.
 *
 * Two or more candidates inside tolerance returns 'ambiguous' and the caller
 * writes NOTHING. Guessing between two plausible rows is worse than a visible
 * unresolved item: a wrong adoption silently rewrites the power on a session
 * that was not that session, and nothing downstream would ever flag it.
 */
export function chooseAdoptionCandidate(
  activity: StravaActivity,
  candidates: AdoptionCandidate[],
): AdoptionDecision {
  const target = Math.round(Number(activity.distance));
  const tol = distanceTolerance(target);
  const family = SPORT_TYPE_TO_SESSION_TYPE[String(activity.sport_type) as EligibleSportType];
  const activityDate = localDateISO(String(activity.start_date_local));

  const matches = candidates.filter((c) => {
    if (c.distance_m == null) return false;
    if (typeFamily(c.type) !== family) return false;
    // Defence in depth: the candidate query already applies the +/-1 day window
    // server-side, but a caller that widened it must not silently widen what
    // counts as the same session.
    if (!c.date_iso || daysApartISO(c.date_iso, activityDate) > ADOPTION_DAY_WINDOW) return false;
    return Math.abs(c.distance_m - target) <= tol;
  });

  if (matches.length === 1) return { decision: "adopt", sessionId: matches[0].id, matches };
  if (matches.length === 0) return { decision: "insert", matches };
  return { decision: "ambiguous", matches };
}
