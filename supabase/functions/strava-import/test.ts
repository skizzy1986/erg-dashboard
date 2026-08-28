// strava-import test suite. Same hand-rolled harness as vitals-import/test.ts
// and vitals-import-api/test.ts, and run the same way — `deno run --allow-env
// strava-import/test.ts`, NOT `deno test`. These are assertion scripts, not
// Deno.test() cases; `deno test` reports a misleading "0 passed" while still
// honouring the Deno.exit(1) below.
//
// Everything under test is pure. There is no network, no database and no
// dependence on the machine's clock or timezone — which is the point: the three
// things most likely to go silently wrong in this feature (the log date, the
// dedupe decision, and the refresh-token rotation) are exactly the three that
// are cheapest to get right here and most expensive to discover in production.
import {
  avgHrOrNull,
  avgWattsOrNull,
  buildLabel,
  chooseAdoptionCandidate,
  distanceTolerance,
  formatDuration,
  isEligible,
  localTimeHHMM,
  mapActivityToSession,
  toLogDateFromLocal,
  typeFamily,
  type AdoptionCandidate,
  type StravaActivity,
} from "./mapper.ts";
import {
  advanceBackfillCursor,
  advanceIncrementalWatermark,
  nextQuarterHour,
  shouldStopChunk,
} from "./state.ts";
import { EMPTY_RATE_LIMIT, parseRateLimit, StravaAuthError, StravaHttpError, type StravaTokens } from "./client.ts";
import { getFreshAccessToken, type RotatedTokens, type StoredTokens, type TokenStore } from "./tokens.ts";
import { checkCronSecret } from "../_shared/cronGuard.ts";

let pass = 0, fail = 0;
const check = (name: string, cond: boolean, actual?: unknown) => {
  if (cond) {
    pass++;
    console.log("  PASS", name);
  } else {
    fail++;
    console.log("  FAIL", name, "->", JSON.stringify(actual));
  }
};

const BACKFILL_FROM = "2026-06-14"; // Scott's Gate 2 decision

// ---------------------------------------------------------------------------
// Fixtures — real activities from Scott's account.
// ---------------------------------------------------------------------------

const rowing: StravaActivity = {
  id: 19859099686,
  name: "Afternoon Rowing",
  sport_type: "Rowing",
  start_date: "2026-08-22T13:02:23Z",
  start_date_local: "2026-08-22T21:02:23",
  distance: 5657.2,
  moving_time: 1560,
  average_watts: 135.706,
  has_device_watts: true,
  average_heartrate: 124.475,
  has_heartrate: true,
};

const virtualRide: StravaActivity = {
  id: 19032543769,
  name: "Zwift Watopia",
  sport_type: "VirtualRide",
  start_date: "2026-06-22T16:43:49Z",
  start_date_local: "2026-06-23T00:43:49",
  distance: 32207.6,
  moving_time: 3616,
  average_watts: 197.42,
  has_device_watts: true,
  average_heartrate: 158.506,
  has_heartrate: true,
};

const act = (over: Partial<StravaActivity>): StravaActivity => ({ ...rowing, ...over });

// ---------------------------------------------------------------------------
// TC-01 — sport_type is an ALLOW-list
// ---------------------------------------------------------------------------
console.log("\nTC-01 eligibility allow-list");

check("TC-01 Rowing accepted", isEligible(rowing, BACKFILL_FROM).eligible === true);
check("TC-01 VirtualRide accepted", isEligible(virtualRide, BACKFILL_FROM).eligible === true);
for (const sport of ["WeightTraining", "Ride", "Walk", "Workout", "Run", "Yoga", "Rowing "]) {
  const v = isEligible(act({ sport_type: sport }), BACKFILL_FROM);
  check(`TC-01 ${sport} rejected as sport_type`, v.eligible === false && v.reason === "sport_type", v);
}
check(
  "TC-01 before backfill_from rejected",
  isEligible(act({ start_date_local: "2026-06-13T06:00:00" }), BACKFILL_FROM).reason ===
    "before_backfill_from",
);
check(
  "TC-01 on backfill_from accepted (boundary is inclusive)",
  isEligible(act({ start_date_local: "2026-06-14T06:00:00" }), BACKFILL_FROM).eligible === true,
);

// ---------------------------------------------------------------------------
// TC-02 — the duration and distance floors
// ---------------------------------------------------------------------------
console.log("\nTC-02 fragment floors");

for (const secs of [23, 16, 72, 4, 119]) {
  const v = isEligible(act({ moving_time: secs }), BACKFILL_FROM);
  check(`TC-02 ${secs}s fragment rejected`, v.eligible === false && v.reason === "moving_time", v);
}
for (const metres of [9, 40, 53, 155, 199]) {
  const v = isEligible(act({ distance: metres, moving_time: 600 }), BACKFILL_FROM);
  check(`TC-02 ${metres}m fragment rejected`, v.eligible === false && v.reason === "distance", v);
}
// The floors exist to drop bumped-PM5 fragments, NOT short hard efforts.
const cpTest = act({ name: "CP Test", moving_time: 240, distance: 1080 });
check("TC-02 CP Test (240 s / 1080 m) ACCEPTED", isEligible(cpTest, BACKFILL_FROM).eligible === true,
  isEligible(cpTest, BACKFILL_FROM));
check("TC-02 exactly 120 s accepted", isEligible(act({ moving_time: 120 }), BACKFILL_FROM).eligible === true);
check("TC-02 exactly 200 m accepted",
  isEligible(act({ distance: 200, moving_time: 600 }), BACKFILL_FROM).eligible === true);

// ---------------------------------------------------------------------------
// TC-03 — the full mapping contract on a real activity
// ---------------------------------------------------------------------------
console.log("\nTC-03 mapActivityToSession on activity 19859099686");

const mapped = mapActivityToSession(rowing);
check("TC-03 date 8/22/26",        mapped.date === "8/22/26",        mapped.date);
check("TC-03 type erg",            mapped.type === "erg",            mapped.type);
check("TC-03 duration 26:00",      mapped.duration === "26:00",      mapped.duration);
check("TC-03 distance_m 5657",     mapped.distance_m === 5657,       mapped.distance_m);
check("TC-03 avg_watts 136",       mapped.avg_watts === 136,         mapped.avg_watts);
check("TC-03 avg_hr 124",          mapped.avg_hr === 124,            mapped.avg_hr);
check("TC-03 status completed",    mapped.status === "completed",    mapped.status);
check("TC-03 source strava",       mapped.source === "strava",       mapped.source);
check("TC-03 activity id carried", mapped.strava_activity_id === 19859099686, mapped.strava_activity_id);

const mappedRide = mapActivityToSession(virtualRide);
check("TC-03 VirtualRide type cycling",  mappedRide.type === "cycling",       mappedRide.type);
check("TC-03 VirtualRide date 6/23/26",  mappedRide.date === "6/23/26",       mappedRide.date);
check("TC-03 VirtualRide duration 60:16", mappedRide.duration === "60:16",    mappedRide.duration);
check("TC-03 VirtualRide distance 32208", mappedRide.distance_m === 32208,    mappedRide.distance_m);
check("TC-03 VirtualRide watts 197",      mappedRide.avg_watts === 197,       mappedRide.avg_watts);

// These lower-case spellings are what normType() in web/src/utils/formatting.js
// recognises. 'Rowing' / 'VirtualRide' would render as colourless unknowns.
check("TC-03 type is never Strava's own spelling",
  mapped.type !== "Rowing" && mappedRide.type !== "VirtualRide");

// The mapper must not invent Scott's fields.
const mappedKeys = Object.keys(mapped).sort().join(",");
check("TC-03 no srpe/coach_note/prs/exercises/coach_flag/benchmark_key written",
  !/srpe|coach_note|prs|exercises|coach_flag|benchmark_key/.test(mappedKeys), mappedKeys);

// ---------------------------------------------------------------------------
// TC-04 — no estimated power, no invented heart rate
// ---------------------------------------------------------------------------
console.log("\nTC-04 device watts and heart rate are never estimated");

const noDevice = act({ has_device_watts: false, average_watts: 210 });
check("TC-04 has_device_watts false -> avg_watts null", mapActivityToSession(noDevice).avg_watts === null,
  mapActivityToSession(noDevice).avg_watts);
const absentFlag = act({ has_device_watts: undefined, device_watts: undefined, average_watts: 210 });
check("TC-04 flag absent -> avg_watts null", avgWattsOrNull(absentFlag) === null, avgWattsOrNull(absentFlag));
check("TC-04 device_watts spelling also accepted",
  avgWattsOrNull(act({ has_device_watts: undefined, device_watts: true, average_watts: 210 })) === 210);
const noHr = act({ has_heartrate: false, average_heartrate: 150 });
check("TC-04 has_heartrate false -> avg_hr null", mapActivityToSession(noHr).avg_hr === null,
  mapActivityToSession(noHr).avg_hr);
check("TC-04 has_heartrate true but no value -> null",
  avgHrOrNull(act({ has_heartrate: true, average_heartrate: null })) === null);
// Nothing anywhere may derive watts from pace as a substitute.
check("TC-04 no estimate substituted for missing power",
  mapActivityToSession(act({ has_device_watts: false, average_watts: 210, distance: 5000, moving_time: 1200 }))
    .avg_watts === null);

// ---------------------------------------------------------------------------
// TC-05 — same-day, same-name activities get distinct, watt-free labels
// ---------------------------------------------------------------------------
console.log("\nTC-05 labels");

const morning = act({ id: 1, name: "Row", start_date_local: "2026-08-22T05:14:00" });
const evening = act({ id: 2, name: "Row", start_date_local: "2026-08-22T18:47:00" });
const lm = buildLabel(morning), le = buildLabel(evening);
check("TC-05 same day + same name -> distinct labels", lm !== le, [lm, le]);
check("TC-05 morning label", lm === "Row 05:14", lm);
check("TC-05 evening label", le === "Row 18:47", le);
for (const l of [lm, le, buildLabel(rowing)]) {
  // A watts figure in the label is exactly what breaks dedupe today: the label
  // changes whenever the power does, so one session reads as two.
  check(`TC-05 label carries no watts figure: ${l}`, !/\d+\s*w\b/i.test(l) && !/watt/i.test(l), l);
}
check("TC-05 blank name falls back to sport type",
  buildLabel(act({ name: "   ", start_date_local: "2026-08-22T21:02:23" })) === "Strava Rowing 21:02",
  buildLabel(act({ name: "   " })));
const longName = "x".repeat(400);
const longLabel = buildLabel(act({ name: longName, start_date_local: "2026-08-22T21:02:23" }));
check("TC-05 long label truncated to 120", longLabel.length <= 120, longLabel.length);
check("TC-05 truncation keeps the time suffix (what keeps same-day labels distinct)",
  longLabel.endsWith(" 21:02"), longLabel.slice(-10));

// ---------------------------------------------------------------------------
// TC-06 — buildLabel is deterministic
// ---------------------------------------------------------------------------
console.log("\nTC-06 label determinism");

check("TC-06 byte-identical across two calls", buildLabel(rowing) === buildLabel(rowing));
check("TC-06 byte-identical across two equal inputs",
  buildLabel(rowing) === buildLabel({ ...rowing }));
check("TC-06 unaffected by power changing",
  buildLabel(rowing) === buildLabel(act({ average_watts: 999, has_device_watts: false })));

// ---------------------------------------------------------------------------
// TC-07 — the adoption pass picks the right existing session
// ---------------------------------------------------------------------------
console.log("\nTC-07 chooseAdoptionCandidate");

check("TC-07 typeFamily maps the five real spellings",
  typeFamily("erg") === "erg" && typeFamily("Z2 Aerobic") === "erg" && typeFamily("Rowing") === "erg" &&
  typeFamily("Cycling") === "cycling" && typeFamily("bike") === "cycling" && typeFamily("Ride") === "cycling",
);
check("TC-07 typeFamily rejects strength", typeFamily("Upper Strength") === null, typeFamily("Upper Strength"));

// Real pair, 8/6: activity 13620 m vs a hand-filed 13618 m (2 m apart).
const a86 = act({ id: 86, distance: 13620, start_date_local: "2026-08-06T05:30:00" });
const c86: AdoptionCandidate = { id: 861, date_iso: "2026-08-06", type: "Z2 Aerobic", distance_m: 13618 };
const d86 = chooseAdoptionCandidate(a86, [c86]);
check("TC-07 2 m apart -> adopt", d86.decision === "adopt" && d86.sessionId === 861, d86);

// Real pair, 7/3: activity 10192.2 m vs a hand-filed 10187 m (5.2 m apart).
const a73 = act({ id: 73, distance: 10192.2, start_date_local: "2026-07-03T05:30:00" });
const c73: AdoptionCandidate = { id: 731, date_iso: "2026-07-03", type: "erg", distance_m: 10187 };
const d73 = chooseAdoptionCandidate(a73, [c73]);
check("TC-07 5.2 m apart -> adopt", d73.decision === "adopt" && d73.sessionId === 731, d73);

// The +/-1 day window: four real rows are filed a day off the local date.
const dayBefore = chooseAdoptionCandidate(a86, [{ ...c86, date_iso: "2026-08-05" }]);
check("TC-07 candidate one day EARLIER -> adopt", dayBefore.decision === "adopt", dayBefore);
const dayAfter = chooseAdoptionCandidate(a86, [{ ...c86, date_iso: "2026-08-07" }]);
check("TC-07 candidate one day LATER -> adopt", dayAfter.decision === "adopt", dayAfter);
const twoDays = chooseAdoptionCandidate(a86, [{ ...c86, date_iso: "2026-08-08" }]);
check("TC-07 candidate two days out -> insert", twoDays.decision === "insert", twoDays);

check("TC-07 no candidates -> insert", chooseAdoptionCandidate(a86, []).decision === "insert");
check("TC-07 wrong family -> insert",
  chooseAdoptionCandidate(a86, [{ ...c86, type: "Cycling" }]).decision === "insert");
check("TC-07 null distance candidate ignored -> insert",
  chooseAdoptionCandidate(a86, [{ ...c86, distance_m: null }]).decision === "insert");
check("TC-07 outside tolerance -> insert",
  chooseAdoptionCandidate(a86, [{ ...c86, distance_m: 13620 - 200 }]).decision === "insert");
check("TC-07 tolerance floor is 5 m for short pieces", distanceTolerance(500) === 5, distanceTolerance(500));
check("TC-07 tolerance is 0.5% above the floor", distanceTolerance(13620) === 68.1, distanceTolerance(13620));
// A cycling activity must not adopt a rowing session of the same distance.
const aRide = act({ id: 99, sport_type: "VirtualRide", distance: 13620, start_date_local: "2026-08-06T05:30:00" });
check("TC-07 cycling activity ignores erg candidate",
  chooseAdoptionCandidate(aRide, [c86]).decision === "insert");

// ---------------------------------------------------------------------------
// TC-08 — two plausible candidates means do nothing at all
// ---------------------------------------------------------------------------
console.log("\nTC-08 ambiguity is never resolved by guessing");

const twoInTolerance = chooseAdoptionCandidate(a86, [
  c86,
  { id: 862, date_iso: "2026-08-06", type: "erg", distance_m: 13621 },
]);
check("TC-08 two candidates -> ambiguous", twoInTolerance.decision === "ambiguous", twoInTolerance);
check("TC-08 ambiguous never carries a sessionId",
  !("sessionId" in twoInTolerance), twoInTolerance);
check("TC-08 both matches reported for the human to resolve",
  twoInTolerance.matches.length === 2, twoInTolerance.matches.length);
const threeCandidates = chooseAdoptionCandidate(a86, [
  c86,
  { id: 862, date_iso: "2026-08-05", type: "erg", distance_m: 13619 },
  { id: 863, date_iso: "2026-08-07", type: "Z2 Aerobic", distance_m: 13620 },
]);
check("TC-08 three candidates -> ambiguous", threeCandidates.decision === "ambiguous", threeCandidates);
// One in tolerance and one out is NOT ambiguous — the out-of-tolerance row is
// simply not a match.
const oneIn = chooseAdoptionCandidate(a86, [c86, { id: 864, date_iso: "2026-08-06", type: "erg", distance_m: 9000 }]);
check("TC-08 one in tolerance, one far out -> adopt", oneIn.decision === "adopt", oneIn);

// ---------------------------------------------------------------------------
// TC-09 — the log date is derived by slicing, never by constructing a Date
// ---------------------------------------------------------------------------
console.log("\nTC-09 timezone-free log date");

check("TC-09 21:02 local -> 8/22/26", toLogDateFromLocal("2026-08-22T21:02:23") === "8/22/26",
  toLogDateFromLocal("2026-08-22T21:02:23"));
// These are the cases a `new Date(local)` implementation gets wrong: Deno runs
// in UTC, so an evening Perth session (UTC+8) would roll back a day and an
// early-morning one would not, misfiling sessions into the wrong training week.
check("TC-09 23:59 local stays on its own day", toLogDateFromLocal("2026-08-22T23:59:59") === "8/22/26");
check("TC-09 00:00 local stays on its own day", toLogDateFromLocal("2026-08-23T00:00:00") === "8/23/26");
check("TC-09 04:45 local (5am erg) stays put", toLogDateFromLocal("2026-06-14T04:45:00") === "6/14/26");
check("TC-09 month and day are UNPADDED", toLogDateFromLocal("2026-01-05T06:00:00") === "1/5/26",
  toLogDateFromLocal("2026-01-05T06:00:00"));
check("TC-09 two-digit year", toLogDateFromLocal("2026-12-31T22:00:00") === "12/31/26");
check("TC-09 result is independent of the process timezone",
  toLogDateFromLocal("2026-08-22T21:02:23") === "8/22/26" &&
  toLogDateFromLocal("2026-08-22T21:02:23") === mapActivityToSession(rowing).date);
check("TC-09 localTimeHHMM slices chars 11-16", localTimeHHMM("2026-08-22T21:02:23") === "21:02",
  localTimeHHMM("2026-08-22T21:02:23"));
// Direct evidence the implementation does not go through Date: a stamp Date
// would reject entirely still slices correctly.
check("TC-09 an unparseable-by-Date stamp still slices",
  toLogDateFromLocal("2026-02-30T10:00:00") === "2/30/26",
  toLogDateFromLocal("2026-02-30T10:00:00"));

// ---------------------------------------------------------------------------
// TC-10 — duration formatting
// ---------------------------------------------------------------------------
console.log("\nTC-10 formatDuration");

check("TC-10 1560 -> 26:00", formatDuration(1560) === "26:00", formatDuration(1560));
check("TC-10 2469 -> 41:09", formatDuration(2469) === "41:09", formatDuration(2469));
check("TC-10 4647 -> 77:27", formatDuration(4647) === "77:27", formatDuration(4647));
check("TC-10 seconds are zero padded", formatDuration(61) === "1:01", formatDuration(61));
check("TC-10 minutes are NOT zero padded", formatDuration(540) === "9:00", formatDuration(540));
check("TC-10 0 -> 0:00", formatDuration(0) === "0:00", formatDuration(0));
check("TC-10 240 (CP Test) -> 4:00", formatDuration(240) === "4:00", formatDuration(240));

// ---------------------------------------------------------------------------
// TC-11 — the backfill cursor only ever moves backwards
// ---------------------------------------------------------------------------
console.log("\nTC-11 backfill cursor monotonicity");

let cursor: number | null = 1_800_000_000;
const pages = [
  [1_799_000_000, 1_798_500_000, 1_799_500_000],
  [1_798_000_000, 1_797_000_000],
  [1_796_000_000],
];
let monotonic = true;
for (const page of pages) {
  const next = advanceBackfillCursor(cursor, page);
  if (next == null || cursor == null || next >= cursor) monotonic = false;
  cursor = next;
}
check("TC-11 cursor strictly decreases across pages", monotonic && cursor === 1_796_000_000, cursor);
check("TC-11 picks the OLDEST activity on the page",
  advanceBackfillCursor(1_800_000_000, [1_799_000_000, 1_798_500_000]) === 1_798_500_000);
// The terminator: a page whose activities all sit at or after the cursor would
// otherwise re-list for ever.
check("TC-11 page not older than cursor still steps back",
  advanceBackfillCursor(1_800_000_000, [1_800_000_000, 1_800_500_000]) === 1_799_999_999);
check("TC-11 empty page still steps back",
  advanceBackfillCursor(1_800_000_000, []) === 1_799_999_999);
check("TC-11 null cursor seeds from the page", advanceBackfillCursor(null, [1_700_000_000]) === 1_700_000_000);
check("TC-11 NaN timestamps ignored",
  advanceBackfillCursor(1_800_000_000, [NaN, 1_799_000_000]) === 1_799_000_000);

// The incremental watermark moves the other way, over EVERYTHING seen — a week
// of nothing but WeightTraining must still advance it.
check("TC-11 incremental watermark advances forwards",
  advanceIncrementalWatermark(1_700_000_000, [1_700_500_000, 1_700_200_000]) === 1_700_500_000);
check("TC-11 incremental watermark never goes backwards",
  advanceIncrementalWatermark(1_700_000_000, [1_699_000_000]) === 1_700_000_000);
check("TC-11 incremental watermark unchanged on an empty page",
  advanceIncrementalWatermark(1_700_000_000, []) === 1_700_000_000);

// ---------------------------------------------------------------------------
// TC-12 — the three stop conditions are independent
// ---------------------------------------------------------------------------
console.log("\nTC-12 shouldStopChunk");

const budget = { maxCalls: 50, maxElapsedMs: 20_000 };
const noLimit = EMPTY_RATE_LIMIT;

check("TC-12 fresh run does not stop", shouldStopChunk(0, 0, noLimit, budget).stop === false);
check("TC-12 49 calls does not stop", shouldStopChunk(49, 0, noLimit, budget).stop === false);
const byCalls = shouldStopChunk(50, 0, noLimit, budget);
check("TC-12 50 calls stops on 'calls'", byCalls.stop && byCalls.reason === "calls", byCalls);
const byTime = shouldStopChunk(0, 20_000, noLimit, budget);
check("TC-12 20 s stops on 'elapsed'", byTime.stop && byTime.reason === "elapsed", byTime);
check("TC-12 19.9 s does not stop", shouldStopChunk(0, 19_999, noLimit, budget).stop === false);

const at80 = { ...EMPTY_RATE_LIMIT, shortLimit: 200, shortUsage: 160, source: "read" as const };
const at79 = { ...EMPTY_RATE_LIMIT, shortLimit: 200, shortUsage: 159, source: "read" as const };
const byQuota = shouldStopChunk(0, 0, at80, budget);
check("TC-12 80% of the 15-minute quota stops on 'rate_limit'",
  byQuota.stop && byQuota.reason === "rate_limit", byQuota);
check("TC-12 just under 80% does not stop", shouldStopChunk(0, 0, at79, budget).stop === false);
check("TC-12 absent rate-limit headers never stop the run",
  shouldStopChunk(0, 0, noLimit, budget).stop === false);
check("TC-12 quota trips even with calls and time to spare",
  shouldStopChunk(1, 10, at80, budget).reason === "rate_limit");

// The ceiling is read from the response, not hardcoded.
const rl = parseRateLimit(new Headers({ "X-RateLimit-Limit": "200,2000", "X-RateLimit-Usage": "57,913" }));
check("TC-12 parseRateLimit reads limit/usage pairs",
  rl.shortLimit === 200 && rl.dailyLimit === 2000 && rl.shortUsage === 57 && rl.dailyUsage === 913, rl);
check("TC-12 parseRateLimit prefers the read-specific headers",
  parseRateLimit(new Headers({
    "X-RateLimit-Limit": "200,2000",
    "X-ReadRateLimit-Limit": "100,1000",
    "X-ReadRateLimit-Usage": "90,500",
  })).source === "read");
check("TC-12 parseRateLimit tolerates missing headers",
  parseRateLimit(new Headers({})).shortLimit === null);
// A quota read from headers must actually drive the stop decision.
check("TC-12 a header-derived 90/100 stops the chunk",
  shouldStopChunk(0, 0, parseRateLimit(new Headers({
    "X-ReadRateLimit-Limit": "100,1000",
    "X-ReadRateLimit-Usage": "90,500",
  })), budget).reason === "rate_limit");

check("TC-12 nextQuarterHour rounds up to :15",
  nextQuarterHour(Date.parse("2026-08-22T10:07:31Z")) === Date.parse("2026-08-22T10:15:00Z"));
check("TC-12 nextQuarterHour on an exact boundary returns the NEXT one",
  nextQuarterHour(Date.parse("2026-08-22T10:15:00Z")) === Date.parse("2026-08-22T10:30:00Z"));
check("TC-12 nextQuarterHour crosses the hour",
  nextQuarterHour(Date.parse("2026-08-22T10:52:00Z")) === Date.parse("2026-08-22T11:00:00Z"));

// ---------------------------------------------------------------------------
// TC-13 / TC-14 — refresh token rotation
// ---------------------------------------------------------------------------
console.log("\nTC-13/14 refresh token rotation and revocation");

const NOW = Date.parse("2026-08-28T00:00:00Z");
const EXPIRED = new Date(NOW - 60_000).toISOString();
const VALID = new Date(NOW + 6 * 3600_000).toISOString();

function makeStore(initial: StoredTokens | null) {
  let row: StoredTokens | null = initial ? { ...initial } : null;
  const calls = { read: 0, rotate: 0, rotateRejected: 0, remove: 0 };
  const store: TokenStore = {
    read: (_u: string) => {
      calls.read++;
      return Promise.resolve(row ? { ...row } : null);
    },
    // Mirrors the real CAS: writes ONLY when the stored refresh token still
    // equals the one presented.
    rotate: (_u: string, expected: string, next: RotatedTokens) => {
      calls.rotate++;
      if (!row || row.refresh_token !== expected) {
        calls.rotateRejected++;
        return Promise.resolve(false);
      }
      row = { ...row, ...next };
      return Promise.resolve(true);
    },
    remove: (_u: string) => {
      calls.remove++;
      row = null;
      return Promise.resolve();
    },
  };
  return { store, calls, current: () => row, set: (r: StoredTokens | null) => { row = r; } };
}

const seed: StoredTokens = {
  athlete_id: 4242,
  access_token: "A1",
  refresh_token: "R1",
  expires_at: EXPIRED,
  scope: "activity:read_all",
};
const tokenResponse = (access: string, refresh: string): StravaTokens => ({
  access_token: access,
  refresh_token: refresh,
  expires_at: Math.floor((NOW + 6 * 3600_000) / 1000),
  athlete_id: 4242,
  scope: "activity:read_all",
});

// A still-valid token is used as is — no refresh, no write.
{
  const s = makeStore({ ...seed, expires_at: VALID });
  const r = await getFreshAccessToken(s.store, () => {
    throw new Error("must not refresh a still-valid token");
  }, "u", NOW);
  check("TC-13 valid token reused without refreshing",
    r.status === "ok" && r.accessToken === "A1" && r.rotated === false && s.calls.rotate === 0, r);
}

// TC-13: the rotated refresh token is persisted, and used on the NEXT refresh.
{
  const s = makeStore(seed);
  const presented: string[] = [];
  const refresh = (rt: string) => {
    presented.push(rt);
    return Promise.resolve(tokenResponse(`A${presented.length + 1}`, `R${presented.length + 1}`));
  };

  const r1 = await getFreshAccessToken(s.store, refresh, "u", NOW);
  check("TC-13 refresh returns the new access token",
    r1.status === "ok" && r1.accessToken === "A2" && r1.rotated === true, r1);
  check("TC-13 ROTATED REFRESH TOKEN IS PERSISTED", s.current()?.refresh_token === "R2",
    s.current()?.refresh_token);
  check("TC-13 stored access token replaced too", s.current()?.access_token === "A2");
  check("TC-13 CAS presented the token it had read", presented[0] === "R1", presented);

  // Force another refresh; the rotated token must be the one presented.
  s.set({ ...(s.current() as StoredTokens), expires_at: EXPIRED });
  const r2 = await getFreshAccessToken(s.store, refresh, "u", NOW);
  check("TC-13 NEXT REFRESH USES THE ROTATED TOKEN", presented[1] === "R2", presented);
  check("TC-13 second rotation persisted", s.current()?.refresh_token === "R3" && r2.status === "ok",
    s.current()?.refresh_token);
  check("TC-13 row never deleted on a healthy rotation", s.calls.remove === 0);
}

// TC-13 (race): the CAS loses, so the winner's stored token is used and the
// winner's rotation is NOT overwritten.
{
  const s = makeStore(seed);
  const refresh = (_rt: string) => {
    // Another worker rotates while our HTTP call is in flight.
    s.set({ ...seed, access_token: "WINNER", refresh_token: "RW", expires_at: VALID });
    return Promise.resolve(tokenResponse("LOSER", "RL"));
  };
  const r = await getFreshAccessToken(s.store, refresh, "u", NOW);
  check("TC-13 CAS rejected when another worker rotated first", s.calls.rotateRejected === 1, s.calls);
  check("TC-13 loser uses the winner's access token",
    r.status === "ok" && r.accessToken === "WINNER" && r.rotated === false, r);
  check("TC-13 winner's refresh token NOT overwritten", s.current()?.refresh_token === "RW",
    s.current()?.refresh_token);
}

// TC-14: one invalid_grant is a lost race, not a revocation.
{
  const s = makeStore(seed);
  let attempts = 0;
  const refresh = (rt: string) => {
    attempts++;
    if (attempts === 1) {
      // The winner already rotated R1 out; our presented token is dead.
      s.set({ ...seed, refresh_token: "R2", access_token: "A2" });
      return Promise.reject(new StravaAuthError("invalid_grant"));
    }
    check("TC-14 retry presents the FRESHLY READ token", rt === "R2", rt);
    return Promise.resolve(tokenResponse("A3", "R3"));
  };
  const r = await getFreshAccessToken(s.store, refresh, "u", NOW);
  check("TC-14 single invalid_grant RETRIES rather than deleting",
    r.status === "ok" && attempts === 2 && s.calls.remove === 0, { r, attempts, calls: s.calls });
  check("TC-14 the retry's rotation is persisted", s.current()?.refresh_token === "R3",
    s.current()?.refresh_token);
}

// TC-14: two consecutive invalid_grants IS a revocation.
{
  const s = makeStore(seed);
  let attempts = 0;
  const refresh = (_rt: string) => {
    attempts++;
    return Promise.reject(new StravaAuthError("invalid_grant"));
  };
  const r = await getFreshAccessToken(s.store, refresh, "u", NOW);
  check("TC-14 two consecutive invalid_grants -> auth_failed", r.status === "auth_failed", r);
  check("TC-14 exactly two attempts, not more", attempts === 2, attempts);
  check("TC-14 the row is deleted only then", s.calls.remove === 1 && s.current() === null, s.calls);
}

// A 5xx or a network fault must never destroy the connection.
{
  const s = makeStore(seed);
  const r = await getFreshAccessToken(s.store, () => Promise.reject(new StravaHttpError(503, "token refresh")),
    "u", NOW);
  check("TC-14 non-auth failure -> refresh_failed", r.status === "refresh_failed", r);
  check("TC-14 non-auth failure NEVER deletes the row", s.calls.remove === 0 && s.current() !== null, s.calls);
}
{
  const s = makeStore(null);
  const r = await getFreshAccessToken(s.store, () => Promise.reject(new Error("unused")), "u", NOW);
  check("TC-14 no stored row -> not_connected", r.status === "not_connected", r);
}
{
  const s = makeStore({ ...seed, expires_at: "not-a-date" });
  let attempts = 0;
  const r = await getFreshAccessToken(s.store, (_rt) => {
    attempts++;
    return Promise.resolve(tokenResponse("A9", "R9"));
  }, "u", NOW);
  check("TC-14 unparseable expiry refreshes rather than assuming valid",
    attempts === 1 && r.status === "ok", { attempts, r });
}

// ---------------------------------------------------------------------------
// TC-15 — the cron guard, re-verified for the copy in _shared/
// ---------------------------------------------------------------------------
console.log("\nTC-15 cron guard");

const CRON_ENV = "STRAVA_CRON_SECRET";
const saved = Deno.env.get(CRON_ENV);
const savedShared = Deno.env.get("CRON_SECRET");

const mockReq = (headerValue?: string) =>
  new Request("http://localhost/", {
    headers: headerValue === undefined ? {} : { "x-cron-secret": headerValue },
  });

// 1. secret unset entirely -> 401, regardless of header
Deno.env.delete(CRON_ENV);
check("TC-15 secret unset -> 401", checkCronSecret(mockReq("anything"), CRON_ENV)?.status === 401);

// 2. secret set to "" -> 401 (fail closed), even with a matching-looking header
Deno.env.set(CRON_ENV, "");
check("TC-15 secret empty, header empty -> 401", checkCronSecret(mockReq(""), CRON_ENV)?.status === 401);
check("TC-15 secret empty, header set -> 401", checkCronSecret(mockReq("whatever"), CRON_ENV)?.status === 401);

const REAL_SECRET = "s3cret-value-123-xyz";
Deno.env.set(CRON_ENV, REAL_SECRET);

// 3. header missing entirely -> 401
check("TC-15 header missing -> 401", checkCronSecret(mockReq(undefined), CRON_ENV)?.status === 401);

// 4. header present but empty -> 401
check("TC-15 header empty -> 401", checkCronSecret(mockReq(""), CRON_ENV)?.status === 401);

// 5. header wrong, same length as secret -> 401, must not throw
check("TC-15 header wrong (same length) -> 401",
  checkCronSecret(mockReq("x".repeat(REAL_SECRET.length)), CRON_ENV)?.status === 401);

// 6. header wrong, different length -> 401 (the case that breaks a naive
//    timingSafeEqual call on unequal-length buffers)
check("TC-15 header wrong (different length) -> 401",
  checkCronSecret(mockReq("short"), CRON_ENV)?.status === 401);

// 7. header correct -> passes through
check("TC-15 header correct -> null (authorized)", checkCronSecret(mockReq(REAL_SECRET), CRON_ENV) === null);

// 8. 401 body shape unchanged
check("TC-15 401 body is 'unauthorized'",
  (await checkCronSecret(mockReq("wrong"), CRON_ENV)!.json()).error === "unauthorized");

// 9. the Strava secret is a SEPARATE blast radius from the shared CRON_SECRET.
Deno.env.set("CRON_SECRET", "the-vitals-secret");
check("TC-15 the vitals CRON_SECRET does NOT authorize strava-import",
  checkCronSecret(mockReq("the-vitals-secret"), CRON_ENV)?.status === 401);
check("TC-15 default env var still works for the vitals callers",
  checkCronSecret(mockReq("the-vitals-secret")) === null);

// restore prior env state
if (saved === undefined) Deno.env.delete(CRON_ENV); else Deno.env.set(CRON_ENV, saved);
if (savedShared === undefined) Deno.env.delete("CRON_SECRET"); else Deno.env.set("CRON_SECRET", savedShared);

console.log("\nRESULT:", pass, "passed,", fail, "failed");
if (fail) Deno.exit(1);
