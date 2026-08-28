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
  hasUsableDeviceWatts,
  buildLabel,
  chooseAdoptionCandidate,
  distanceTolerance,
  formatDuration,
  isEligible,
  localTimeHHMM,
  mapActivityToSession,
  needsDetailFetch,
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
import { runImport } from "./importer.ts";

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
// Adoption overwrites avg_watts whenever the device-watts flag is set, so the
// flag alone is not a safe gate: a payload claiming device watts with no numeric
// average_watts would write NULL over a value the adopted row already had.
check("TC-04 usable-watts gate true when flag AND number present",
  hasUsableDeviceWatts(act({ has_device_watts: true, average_watts: 197 })) === true);
check("TC-04 USABLE-WATTS GATE FALSE WHEN FLAG SET BUT VALUE MISSING",
  hasUsableDeviceWatts(act({ has_device_watts: true, average_watts: null })) === false);
check("TC-04 usable-watts gate false when value is not a number",
  hasUsableDeviceWatts(act({ has_device_watts: true, average_watts: undefined })) === false);
check("TC-04 usable-watts gate false when no device watts at all",
  hasUsableDeviceWatts(act({ has_device_watts: false, average_watts: 197 })) === false);

const noHr = act({ has_heartrate: false, average_heartrate: 150 });
check("TC-04 has_heartrate false -> avg_hr null", mapActivityToSession(noHr).avg_hr === null,
  mapActivityToSession(noHr).avg_hr);
check("TC-04 has_heartrate true but no value -> null",
  avgHrOrNull(act({ has_heartrate: true, average_heartrate: null })) === null);
// Nothing anywhere may derive watts from pace as a substitute.
check("TC-04 no estimate substituted for missing power",
  mapActivityToSession(act({ has_device_watts: false, average_watts: 210, distance: 5000, moving_time: 1200 }))
    .avg_watts === null);

// needsDetailFetch — the gate that decides whether a summary is worth writing
// at all. The SummaryActivity from /athlete/activities does not reliably carry
// power or heart rate (verified: the list payload for 19859099686 had neither,
// the detail payload had both), and a session imported without them scores 0 in
// sessionLoad(), so it would contribute nothing to CTL/ATL/TSB.
check("TC-04 a summary with no watts and no HR needs detail",
  needsDetailFetch(act({ average_watts: undefined, has_device_watts: undefined,
    average_heartrate: undefined, has_heartrate: undefined })) === true);
check("TC-04 a summary with HR but no device watts still needs detail",
  needsDetailFetch(act({ average_watts: undefined, has_device_watts: undefined })) === true);
check("TC-04 a summary with device watts but no HR still needs detail",
  needsDetailFetch(act({ average_heartrate: undefined, has_heartrate: undefined })) === true);
check("TC-04 a summary carrying BOTH needs no detail fetch",
  needsDetailFetch(rowing) === false && needsDetailFetch(virtualRide) === false);
check("TC-04 a summary missing distance/moving_time/date needs detail",
  needsDetailFetch(act({ distance: undefined })) === true &&
  needsDetailFetch(act({ moving_time: undefined })) === true &&
  needsDetailFetch(act({ start_date_local: undefined })) === true);
// A read spent on a sport we discard is a read taken from one that counts.
for (const sport of ["WeightTraining", "Run", "Walk", "Ride"]) {
  check(`TC-04 ${sport} never costs a detail fetch`,
    needsDetailFetch(act({ sport_type: sport, average_watts: undefined,
      has_device_watts: undefined, has_heartrate: undefined })) === false);
}

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

// ---------------------------------------------------------------------------
// runImport — the orchestration itself.
//
// Everything above this line is a pure function. runImport is not, and until
// TC-16 it had no test at all: 600-odd lines carrying six of the nine
// acceptance criteria, exercised for the first time only against Scott's real
// Strava account and his real sessions table.
//
// It takes injectable `supa`, `now` and `budget` because it was designed to be
// driven this way. The two fakes below are the whole harness:
//
//   makeDb()     — a Supabase client implementing exactly the surface
//                  importer.ts uses (.from().select()/.update()/.delete() with
//                  chained filters, and .rpc()), backed by a tiny in-memory
//                  sessions table, recording every call in order.
//   installStrava() — globalThis.fetch, so the REAL client.ts runs: its URL
//                  building, its rate-limit header parsing and its error
//                  classes are under test too, and no network is touched.
//
// Call ORDER is recorded, not just call counts, because two of the defects
// these tests exist to pin (the cursor written before the rows, the watermark
// moved past unwritten activities) are ordering bugs that any count-based
// assertion passes straight through.
// ---------------------------------------------------------------------------
console.log("\nTC-16..25 runImport");

// Sentry must stay a no-op: captureFunctionError with a DSN set would try to
// reach the network from inside a test that has no permission to.
const savedDsn = Deno.env.get("SENTRY_DSN");
Deno.env.delete("SENTRY_DSN");

const USER = "11111111-2222-3333-4444-555555555555";
const epochOf = (iso: string): number => Math.floor(Date.parse(iso) / 1000);
const NOW_MS = Date.parse("2026-08-28T00:00:00Z");

type FakeRow = Record<string, unknown>;
type LoggedCall = { table: string; op: string; cols?: string; payload?: unknown };

type SessionRow = {
  id: number;
  strava_activity_id: number | null;
  date_iso: string | null;
  type: string | null;
  distance_m: number | null;
  duration: string | null;
  source: string;
};

type DbOpts = {
  sync?: FakeRow | null;
  tokens?: FakeRow | null;
  sessions?: SessionRow[];
  /** Return an error object to make this write fail; undefined to let it through. */
  rpcFails?: (name: string, args: FakeRow) => { code: string } | undefined;
};

function makeDb(opts: DbOpts) {
  const log: LoggedCall[] = [];
  const syncPatches: FakeRow[] = [];
  const rpcCalls: { name: string; args: FakeRow }[] = [];
  const state = {
    sync: opts.sync === undefined ? null : opts.sync ? { ...opts.sync } : null,
    tokens: opts.tokens === undefined ? null : opts.tokens ? { ...opts.tokens } : null,
    sessions: (opts.sessions ?? []).map((s) => ({ ...s })),
  };
  let nextId = 900;

  const settle = (rec: LoggedCall, filters: [string, unknown[]][]) => {
    if (rec.table === "strava_sync_state") {
      if (rec.op === "select") return { data: state.sync, error: null };
      if (rec.op === "update") {
        const patch = rec.payload as FakeRow;
        syncPatches.push(patch);
        if (state.sync) Object.assign(state.sync, patch);
        return { data: null, error: null };
      }
    }
    if (rec.table === "strava_tokens") {
      if (rec.op === "select") return { data: state.tokens, error: null };
      if (rec.op === "delete") {
        state.tokens = null;
        return { data: null, error: null };
      }
      if (rec.op === "update") {
        // The compare-and-swap: only the worker that presented the stored
        // refresh token may write the rotation.
        const cas = filters.find((f) => f[0] === "eq" && f[1][0] === "refresh_token");
        const expected = cas ? cas[1][1] : undefined;
        if (!state.tokens || state.tokens.refresh_token !== expected) {
          return { data: [], error: null };
        }
        Object.assign(state.tokens, rec.payload as FakeRow);
        return { data: [{ user_id: USER }], error: null };
      }
    }
    if (rec.table === "sessions" && rec.op === "select") {
      // Two different reads, told apart the same way importer.ts asks for them.
      if (String(rec.cols).includes("date_iso")) {
        return {
          data: state.sessions
            .filter((s) => s.strava_activity_id == null && s.distance_m != null)
            .map((s) => ({ id: s.id, date_iso: s.date_iso, type: s.type, distance_m: s.distance_m })),
          error: null,
        };
      }
      const wanted = filters.find((f) => f[0] === "in")?.[1][1] as number[] | undefined;
      return {
        data: state.sessions
          .filter((s) => s.strava_activity_id != null && (wanted ?? []).includes(s.strava_activity_id))
          .map((s) => ({ id: s.id, strava_activity_id: s.strava_activity_id })),
        error: null,
      };
    }
    return { data: null, error: null };
  };

  const builder = (table: string, op: string, payload?: unknown, cols?: string) => {
    const rec: LoggedCall = { table, op, payload, cols };
    log.push(rec);
    const filters: [string, unknown[]][] = [];
    // deno-lint-ignore no-explicit-any
    const self: any = {
      select: (c?: string) => {
        rec.cols = c;
        return self;
      },
      maybeSingle: () => Promise.resolve(settle(rec, filters)),
      single: () => Promise.resolve(settle(rec, filters)),
      // deno-lint-ignore no-explicit-any
      then: (ok: any, bad: any) => Promise.resolve(settle(rec, filters)).then(ok, bad),
    };
    for (const m of ["eq", "in", "is", "gte", "lte", "not", "neq", "order", "limit"]) {
      self[m] = (...args: unknown[]) => {
        filters.push([m, args]);
        return self;
      };
    }
    return self;
  };

  const rpc = (name: string, args: FakeRow) => {
    log.push({ table: "rpc", op: name, payload: args });
    rpcCalls.push({ name, args });
    const failure = opts.rpcFails?.(name, args);
    if (failure) return Promise.resolve({ data: null, error: failure });

    if (name === "upsert_strava_session") {
      const aid = Number(args.p_activity_id);
      const existing = state.sessions.find((s) => s.strava_activity_id === aid);
      if (existing) {
        // Models migration 012's DO UPDATE, source guard included: duration and
        // distance_m are refreshed only on rows this importer inserted.
        if (existing.source === "strava") {
          existing.duration = args.p_duration as string;
          existing.distance_m = args.p_distance_m as number;
        }
        return Promise.resolve({ data: [{ session_id: existing.id, action: "updated" }], error: null });
      }
      const row: SessionRow = {
        id: nextId++,
        strava_activity_id: aid,
        date_iso: null,
        type: args.p_type as string,
        distance_m: args.p_distance_m as number,
        duration: args.p_duration as string,
        source: "strava",
      };
      state.sessions.push(row);
      return Promise.resolve({ data: [{ session_id: row.id, action: "inserted" }], error: null });
    }
    if (name === "adopt_strava_session") {
      const row = state.sessions.find((s) => s.id === Number(args.p_session_id));
      if (!row || row.strava_activity_id != null) {
        return Promise.resolve({ data: [{ session_id: args.p_session_id, action: "adopt_lost_race" }], error: null });
      }
      row.strava_activity_id = Number(args.p_activity_id);
      return Promise.resolve({ data: [{ session_id: row.id, action: "adopted" }], error: null });
    }
    return Promise.resolve({ data: null, error: null });
  };

  const supa = {
    from: (table: string) => ({
      select: (cols?: string) => builder(table, "select", undefined, cols),
      update: (payload: FakeRow) => builder(table, "update", payload),
      delete: () => builder(table, "delete"),
      insert: (payload: unknown) => builder(table, "insert", payload),
    }),
    rpc,
  };

  return {
    supa,
    log,
    rpcCalls,
    syncPatches,
    state,
    writes: () => log.filter((c) => c.op === "update" || c.op === "delete" || c.op === "insert"),
    lastSyncPatch: () => syncPatches[syncPatches.length - 1],
    indexOf: (pred: (c: LoggedCall) => boolean) => log.findIndex(pred),
    lastIndexOf: (pred: (c: LoggedCall) => boolean) => {
      for (let i = log.length - 1; i >= 0; i--) if (pred(log[i])) return i;
      return -1;
    },
  };
}

// --- the fake Strava HTTP layer -------------------------------------------
// globalThis.fetch, so the real client.ts runs against it.

type StravaStub = {
  activities: StravaActivity[];
  detail?: Record<number, StravaActivity | number>;
  /** 'ok' | 'invalid_grant' | number (an HTTP status) */
  token?: "ok" | "invalid_grant" | number;
  /** Per list call, a status to return instead of 200. */
  listStatus?: (call: number) => number | undefined;
  usage?: string;
  limit?: string;
};

function installStrava(stub: StravaStub) {
  const real = globalThis.fetch;
  const listCalls: { after: number | null; before: number | null; page: number }[] = [];
  const detailCalls: number[] = [];
  const epoch = (a: StravaActivity) => Math.floor(Date.parse(String(a.start_date)) / 1000);
  const headers = {
    "content-type": "application/json",
    "x-readratelimit-limit": stub.limit ?? "100,1000",
    "x-readratelimit-usage": stub.usage ?? "1,1",
  };

  globalThis.fetch = ((input: string | URL | Request, init?: RequestInit) => {
    const href = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(href);

    if (url.href.startsWith("https://www.strava.com/oauth/token")) {
      const mode = stub.token ?? "ok";
      if (mode === "invalid_grant") {
        return Promise.resolve(
          new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400, headers }),
        );
      }
      if (typeof mode === "number") {
        return Promise.resolve(new Response("{}", { status: mode, headers }));
      }
      return Promise.resolve(
        new Response(
          JSON.stringify({
            access_token: "fresh-access",
            refresh_token: "fresh-refresh",
            expires_at: Math.floor(NOW_MS / 1000) + 21600,
            athlete_id: 7,
          }),
          { status: 200, headers },
        ),
      );
    }

    if (url.pathname === "/api/v3/athlete/activities") {
      const after = url.searchParams.has("after") ? Number(url.searchParams.get("after")) : null;
      const before = url.searchParams.has("before") ? Number(url.searchParams.get("before")) : null;
      const page = Number(url.searchParams.get("page") ?? 1);
      const perPage = Number(url.searchParams.get("per_page") ?? 30);
      listCalls.push({ after, before, page });

      const status = stub.listStatus?.(listCalls.length);
      if (status) return Promise.resolve(new Response("[]", { status, headers }));

      // Strava orders /athlete/activities newest-first.
      let pool = stub.activities.slice().sort((x, y) => epoch(y) - epoch(x));
      if (after != null) pool = pool.filter((a) => epoch(a) > after);
      if (before != null) pool = pool.filter((a) => epoch(a) < before);
      const slice = pool.slice((page - 1) * perPage, page * perPage);
      return Promise.resolve(new Response(JSON.stringify(slice), { status: 200, headers }));
    }

    const m = url.pathname.match(/^\/api\/v3\/activities\/(\d+)$/);
    if (m) {
      const id = Number(m[1]);
      detailCalls.push(id);
      const d = stub.detail?.[id];
      if (typeof d === "number") return Promise.resolve(new Response("{}", { status: d, headers }));
      if (!d) return Promise.resolve(new Response("{}", { status: 404, headers }));
      return Promise.resolve(new Response(JSON.stringify(d), { status: 200, headers }));
    }

    return Promise.resolve(new Response("{}", { status: 404, headers }));
  }) as typeof fetch;

  return {
    listCalls,
    detailCalls,
    restore: () => {
      globalThis.fetch = real;
    },
  };
}

// --- fixtures --------------------------------------------------------------

const freshTokens = {
  athlete_id: 7,
  access_token: "live-access",
  refresh_token: "live-refresh",
  expires_at: new Date(NOW_MS + 6 * 3600_000).toISOString(),
  scope: "activity:read_all",
};

const syncRow = (over: FakeRow = {}): FakeRow => ({
  user_id: USER,
  connected: true,
  backfill_from: BACKFILL_FROM,
  backfill_complete: true,
  backfill_cursor_before: null,
  incremental_after: epochOf("2026-08-01T00:00:00Z"),
  imported_total: 0,
  adopted_total: 0,
  skipped_total: 0,
  failed_total: 0,
  ambiguous_activity_ids: [],
  rate_limit_resets_at: null,
  ...over,
});

/** A list-payload summary: everything a SummaryActivity really carries. */
const summary = (id: number, localIso: string, over: Partial<StravaActivity> = {}): StravaActivity => ({
  id,
  name: `Row ${id}`,
  sport_type: "Rowing",
  start_date: `${localIso.slice(0, 19)}Z`,
  start_date_local: localIso,
  distance: 5657.2,
  moving_time: 1560,
  ...over,
});

/** The same activity as /activities/:id returns it — with power and HR. */
const detailed = (s: StravaActivity, over: Partial<StravaActivity> = {}): StravaActivity => ({
  ...s,
  average_watts: 135.706,
  has_device_watts: true,
  average_heartrate: 124.475,
  has_heartrate: true,
  ...over,
});

/** A summary that already carries power and HR, so no detail fetch is needed. */
const fullSummary = (id: number, localIso: string, over: Partial<StravaActivity> = {}): StravaActivity =>
  detailed(summary(id, localIso), over);

// deno-lint-ignore no-explicit-any
const run = (db: any, over: Record<string, unknown> = {}, opts: Record<string, unknown> = {}) =>
  runImport(
    {
      supa: db.supa,
      clientId: "cid",
      clientSecret: "csecret",
      backfillFrom: BACKFILL_FROM,
      now: () => NOW_MS,
      ...over,
      // deno-lint-ignore no-explicit-any
    } as any,
    // deno-lint-ignore no-explicit-any
    { userId: USER, mode: "cron", dryRun: false, ...opts } as any,
  );

// ---------------------------------------------------------------------------
// TC-16 — a dry run writes NOTHING
// ---------------------------------------------------------------------------
{
  const a1 = summary(1001, "2026-08-22T21:02:23");
  const a2 = summary(1002, "2026-08-23T06:10:00");
  const db = makeDb({ sync: syncRow(), tokens: { ...freshTokens } });
  const net = installStrava({
    activities: [a1, a2],
    detail: { 1001: detailed(a1), 1002: detailed(a2) },
  });
  const r = await run(db, {}, { dryRun: true });
  net.restore();

  check("TC-16 dry run sees both activities", r.imported === 2, r);
  check("TC-16 dry run makes ZERO writes of any kind", db.writes().length === 0, db.writes());
  check("TC-16 dry run calls no RPC", db.rpcCalls.length === 0, db.rpcCalls);
  check("TC-16 dry run writes no sync state", db.syncPatches.length === 0, db.syncPatches);
  check(
    "TC-16 dry run does not move the incremental cursor",
    db.state.sync.incremental_after === epochOf("2026-08-01T00:00:00Z"),
    db.state.sync.incremental_after,
  );
  check("TC-16 dry run still fetched detail (it is a read)", net.detailCalls.length === 2, net.detailCalls);
  check("TC-16 dry run creates no session rows", db.state.sessions.length === 0, db.state.sessions);
}

// ---------------------------------------------------------------------------
// TC-17 — nothing to do
// ---------------------------------------------------------------------------
{
  const db = makeDb({ sync: syncRow(), tokens: { ...freshTokens } });
  const net = installStrava({ activities: [] });
  const r = await run(db);
  net.restore();

  check("TC-17 empty account -> noop", r.status === "noop", r);
  check("TC-17 empty account writes no rows", db.rpcCalls.length === 0, db.rpcCalls);
  check(
    "TC-17 empty account does not move the cursor",
    db.lastSyncPatch().incremental_after === epochOf("2026-08-01T00:00:00Z"),
    db.lastSyncPatch(),
  );
  check("TC-17 no detail fetches", net.detailCalls.length === 0, net.detailCalls);
}
{
  // Ineligible activities are the opposite case, and the invariant is the
  // other way round: the watermark MUST advance over them or a week of
  // WeightTraining is re-listed for ever.
  const w = summary(1201, "2026-08-20T07:00:00", { sport_type: "WeightTraining" });
  const db = makeDb({ sync: syncRow(), tokens: { ...freshTokens } });
  const net = installStrava({ activities: [w] });
  const r = await run(db);
  net.restore();

  check("TC-17 ineligible-only -> noop", r.status === "noop" && r.imported === 0, r);
  check("TC-17 ineligible-only costs no detail fetch", net.detailCalls.length === 0, net.detailCalls);
  check(
    "TC-17 watermark still advances over ineligible activities",
    db.lastSyncPatch().incremental_after === epochOf("2026-08-20T07:00:00Z"),
    db.lastSyncPatch().incremental_after,
  );
}

// ---------------------------------------------------------------------------
// TC-18 — one failing activity does not take the others down (criterion 7)
// ---------------------------------------------------------------------------
{
  const acts = [
    fullSummary(1301, "2026-08-20T06:00:00"),
    fullSummary(1302, "2026-08-21T06:00:00"),
    fullSummary(1303, "2026-08-22T06:00:00"),
  ];
  const db = makeDb({
    sync: syncRow(),
    tokens: { ...freshTokens },
    rpcFails: (name, args) =>
      name === "upsert_strava_session" && Number(args.p_activity_id) === 1302
        ? { code: "23505" }
        : undefined,
  });
  const net = installStrava({ activities: acts });
  const r = await run(db);
  net.restore();

  check("TC-18 the other two are written", r.imported === 2, r);
  check("TC-18 failed count is exactly 1", r.failed === 1, r);
  check("TC-18 run ends partial", r.status === "partial", r);
  check("TC-18 partial is not ok", r.ok === false, r);
  check("TC-18 error code is db_write_failed", r.errorCode === "db_write_failed", r);
  check(
    "TC-18 the failure is reported per activity",
    r.decisions.filter((d) => d.action === "failed").map((d) => d.activityId).join() === "1302",
    r.decisions,
  );
  check("TC-18 two rows exist", db.state.sessions.length === 2, db.state.sessions);
}

// ---------------------------------------------------------------------------
// TC-19 — a dry run must never delete the tokens (D4)
// ---------------------------------------------------------------------------
{
  const stale = { ...freshTokens, expires_at: new Date(NOW_MS - 60_000).toISOString() };
  const db = makeDb({ sync: syncRow(), tokens: stale });
  const net = installStrava({ activities: [], token: "invalid_grant" });
  const r = await run(db, {}, { dryRun: true });
  net.restore();

  check("TC-19 dry run against a revoked token reports auth_failed", r.status === "auth_failed", r);
  check("TC-19 dry run does NOT delete the token row", db.state.tokens !== null, db.state.tokens);
  check(
    "TC-19 dry run issues no delete at all",
    db.log.filter((c) => c.op === "delete").length === 0,
    db.log,
  );
  check("TC-19 dry run does not disconnect in sync state", db.syncPatches.length === 0, db.syncPatches);
}
{
  // The real run is the control: a genuinely revoked connection still gets
  // torn down, so TC-19 is proving dryRun suppression, not a broken path.
  const stale = { ...freshTokens, expires_at: new Date(NOW_MS - 60_000).toISOString() };
  const db = makeDb({ sync: syncRow(), tokens: stale });
  const net = installStrava({ activities: [], token: "invalid_grant" });
  const r = await run(db);
  net.restore();

  check("TC-19 a REAL run does delete a revoked token row", db.state.tokens === null, db.state.tokens);
  check("TC-19 a REAL run marks the sync state disconnected",
    r.status === "auth_failed" && db.lastSyncPatch().connected === false, db.lastSyncPatch());
}

// ---------------------------------------------------------------------------
// TC-20 — re-import of a linked activity is one upsert, never a second row
//         (criterion 2 — the idempotence guarantee)
// ---------------------------------------------------------------------------
{
  const first = fullSummary(1401, "2026-08-20T06:00:00", { name: "Morning Row" });
  const db = makeDb({ sync: syncRow(), tokens: { ...freshTokens } });
  const net1 = installStrava({ activities: [first] });
  const r1 = await run(db);
  net1.restore();
  check("TC-20 first run inserts", r1.imported === 1 && db.state.sessions.length === 1, r1);

  // Second run: renamed activity, different power, and the watermark has moved
  // past it — so re-list it explicitly, which is what a backfill overlap or a
  // manual Sync does.
  const renamed = fullSummary(1401, "2026-08-20T06:00:00", {
    name: "Threshold pieces",
    average_watts: 201.4,
  });
  db.syncPatches.length = 0;
  db.rpcCalls.length = 0;
  db.state.sync.incremental_after = epochOf("2026-08-01T00:00:00Z");
  const net2 = installStrava({ activities: [renamed] });
  const r2 = await run(db);
  net2.restore();

  check("TC-20 second run makes exactly one RPC call", db.rpcCalls.length === 1, db.rpcCalls);
  check("TC-20 and it is the upsert, not an adopt", db.rpcCalls[0].name === "upsert_strava_session", db.rpcCalls);
  check("TC-20 counted as an update, not an import", r2.updated === 1 && r2.imported === 0, r2);
  check("TC-20 still exactly one session row", db.state.sessions.length === 1, db.state.sessions);
  check("TC-20 the changed label is still sent (the RPC decides what to keep)",
    String(db.rpcCalls[0].args.p_label).startsWith("Threshold pieces"), db.rpcCalls[0].args);
}

// ---------------------------------------------------------------------------
// TC-21 — an adopted row is not duplicated on the next run (criterion 3)
// ---------------------------------------------------------------------------
{
  const a = fullSummary(1501, "2026-08-20T06:00:00");
  const legacy: SessionRow = {
    id: 42,
    strava_activity_id: null,
    date_iso: "2026-08-20",
    type: "Z2 Aerobic",
    distance_m: 5659,
    duration: "26min",
    source: "portal",
  };
  const db = makeDb({ sync: syncRow(), tokens: { ...freshTokens }, sessions: [legacy] });
  const net1 = installStrava({ activities: [a] });
  const r1 = await run(db);
  net1.restore();

  check("TC-21 run 1 adopts rather than inserts", r1.adopted === 1 && r1.imported === 0, r1);
  check("TC-21 run 1 leaves exactly one session row", db.state.sessions.length === 1, db.state.sessions);
  check("TC-21 run 1 links the legacy row", db.state.sessions[0].id === 42, db.state.sessions);

  db.rpcCalls.length = 0;
  db.state.sync.incremental_after = epochOf("2026-08-01T00:00:00Z");
  const net2 = installStrava({ activities: [a] });
  const r2 = await run(db);
  net2.restore();

  check("TC-21 run 2 does not duplicate", db.state.sessions.length === 1, db.state.sessions);
  check("TC-21 run 2 is an update, not an insert or a second adopt",
    r2.updated === 1 && r2.imported === 0 && r2.adopted === 0, r2);
  check("TC-21 run 2 makes exactly one RPC call", db.rpcCalls.length === 1, db.rpcCalls);
  check("TC-21 the adopted row keeps the duration Scott filed",
    db.state.sessions[0].duration === "26min", db.state.sessions[0]);
}

// ---------------------------------------------------------------------------
// TC-22 — the detail fetch, and what happens when the budget runs out (D1)
// ---------------------------------------------------------------------------
{
  // The whole point of D1: a summary carries no watts, so without a detail
  // fetch avg_watts is null and sessionLoad() scores the session 0.
  const s = summary(1601, "2026-08-22T21:02:23");
  const db = makeDb({ sync: syncRow(), tokens: { ...freshTokens } });
  const net = installStrava({ activities: [s], detail: { 1601: detailed(s) } });
  const r = await run(db);
  net.restore();

  check("TC-22 a power-less summary triggers a detail fetch", net.detailCalls.join() === "1601", net.detailCalls);
  check("TC-22 the imported row carries device watts", db.rpcCalls[0].args.p_avg_watts === 136, db.rpcCalls[0].args);
  check("TC-22 and heart rate", db.rpcCalls[0].args.p_avg_hr === 124, db.rpcCalls[0].args);
  check("TC-22 nothing deferred", r.deferred === 0 && r.status === "ok", r);
}
{
  // A summary that already carries both must NOT spend a read.
  const db = makeDb({ sync: syncRow(), tokens: { ...freshTokens } });
  const net = installStrava({ activities: [fullSummary(1602, "2026-08-22T21:02:23")] });
  await run(db);
  net.restore();
  check("TC-22 a complete summary costs no detail fetch", net.detailCalls.length === 0, net.detailCalls);
}
{
  // An ineligible-by-summary activity must not have a read spent on it either.
  const short = summary(1603, "2026-08-22T21:02:23", { moving_time: 40, distance: 90 });
  const db = makeDb({ sync: syncRow(), tokens: { ...freshTokens } });
  const net = installStrava({ activities: [short], detail: { 1603: detailed(short) } });
  await run(db);
  net.restore();
  check("TC-22 a fragment costs no detail fetch", net.detailCalls.length === 0, net.detailCalls);
}
{
  // Budget exhausted mid-chunk: the activities whose detail was never fetched
  // are DEFERRED, not written with a null avg_watts, and the watermark is held
  // below them so the next run re-lists them.
  const acts = [
    summary(1701, "2026-08-20T06:00:00"),
    summary(1702, "2026-08-21T06:00:00"),
    summary(1703, "2026-08-22T06:00:00"),
  ];
  const detail: Record<number, StravaActivity> = {};
  for (const a of acts) detail[a.id] = detailed(a);
  const db = makeDb({ sync: syncRow(), tokens: { ...freshTokens } });
  const net = installStrava({ activities: acts, detail });
  // 1 list call + 2 detail fetches, then the budget is spent.
  const r = await run(db, { budget: { maxCalls: 3, maxElapsedMs: 60_000 } });
  net.restore();

  const oldest = epochOf("2026-08-20T06:00:00Z");
  check("TC-22 budget stop: two written, one deferred",
    r.imported === 2 && r.deferred === 1, r);
  check("TC-22 budget stop: the deferred activity is NOT written",
    db.rpcCalls.every((c) => Number(c.args.p_activity_id) !== 1701), db.rpcCalls);
  check("TC-22 budget stop: no row has a null avg_watts",
    db.rpcCalls.every((c) => typeof c.args.p_avg_watts === "number"), db.rpcCalls);
  check("TC-22 budget stop: the deferral is reported",
    r.decisions.some((d) => d.activityId === 1701 && String(d.detail).startsWith("deferred:")),
    r.decisions);
  check("TC-22 budget stop: stopReason recorded", r.stopReason === "calls", r);
  check("TC-22 budget stop: the watermark is held BELOW the deferred activity",
    db.lastSyncPatch().incremental_after === oldest - 1, db.lastSyncPatch().incremental_after);
  check("TC-22 budget stop: a deferral is not a skip",
    r.skipped === 0 && r.failed === 0, r);
}
{
  // A deferral found by the BACKFILL pass must RAISE backfill_cursor_before
  // ABOVE the activity. The backfill walks backwards with `before=cursor`, and
  // Strava's `before` is exclusive, so the next run lists epoch < cursor: the
  // only way to re-list a deferred activity at epoch e is a cursor > e.
  //
  // Sentry Seer flagged the Math.max on PR #324 as a CRITICAL bug and proposed
  // Math.min. That would pin the cursor at the oldest-seen epoch, which is
  // BELOW the deferred activity, so `before=cursor` would never list it again
  // — causing exactly the permanent skip the report warned about. This test
  // fails under Math.min, which is why it exists.
  const a = summary(1901, "2026-07-10T06:00:00");
  const e = epochOf("2026-07-10T06:00:00Z");
  const db = makeDb({
    // incremental_after above the activity puts it on the backfill side of the
    // `e > startingIncrementalAfter` test in holdCursorFor.
    sync: syncRow({
      backfill_complete: false,
      backfill_cursor_before: null,
      incremental_after: e + 10_000,
    }),
    tokens: { ...freshTokens },
  });
  const net = installStrava({ activities: [a], detail: { 1901: 500 } });
  const r = await run(db);
  net.restore();

  check("TC-22 backfill deferral: deferred, not written",
    r.deferred === 1 && r.imported === 0, r);
  check("TC-22 BACKFILL DEFERRAL: CURSOR RAISED ABOVE THE ACTIVITY (Math.min fails this)",
    db.lastSyncPatch().backfill_cursor_before === e + 1,
    db.lastSyncPatch().backfill_cursor_before);
  check("TC-22 backfill deferral: a cursor > e re-lists it under exclusive `before`",
    (db.lastSyncPatch().backfill_cursor_before as number) > e, db.lastSyncPatch());
  check("TC-22 backfill deferral: backfill is not marked complete",
    db.lastSyncPatch().backfill_complete === false, db.lastSyncPatch());
}
{
  // Same guarantee when the detail fetch itself fails.
  const a = summary(1801, "2026-08-22T06:00:00");
  const db = makeDb({ sync: syncRow(), tokens: { ...freshTokens } });
  const net = installStrava({ activities: [a], detail: { 1801: 500 } });
  const r = await run(db);
  net.restore();

  check("TC-22 detail 500 -> nothing written", db.rpcCalls.length === 0 && r.imported === 0, db.rpcCalls);
  check("TC-22 detail 500 -> deferred", r.deferred === 1, r);
  check("TC-22 detail 500 -> watermark held below it",
    db.lastSyncPatch().incremental_after === epochOf("2026-08-22T06:00:00Z") - 1,
    db.lastSyncPatch().incremental_after);
}

// ---------------------------------------------------------------------------
// TC-23 — the backfill cursor never moves ahead of the rows it describes (D2)
// ---------------------------------------------------------------------------
{
  const acts = [
    fullSummary(1901, "2026-06-20T06:00:00"),
    fullSummary(1902, "2026-06-21T06:00:00"),
    fullSummary(1903, "2026-06-22T06:00:00"),
    // Older than STRAVA_BACKFILL_FROM: this is what terminates the walk.
    fullSummary(1904, "2026-06-10T06:00:00"),
  ];
  const db = makeDb({
    sync: syncRow({
      backfill_complete: false,
      backfill_cursor_before: null,
      incremental_after: epochOf("2026-08-25T00:00:00Z"),
    }),
    tokens: { ...freshTokens },
  });
  const net = installStrava({ activities: acts });
  const r = await run(db);
  net.restore();

  const firstSyncWrite = db.indexOf((c: LoggedCall) => c.table === "strava_sync_state" && c.op === "update");
  const lastRowWrite = db.lastIndexOf((c: LoggedCall) => c.table === "rpc");

  check("TC-23 the backfill imported the three in-window activities", r.imported === 3, r);
  check("TC-23 sync state is written EXACTLY once per run",
    db.syncPatches.length === 1, db.syncPatches);
  check("TC-23 the cursor is written AFTER every row it describes",
    firstSyncWrite > lastRowWrite && lastRowWrite >= 0, { firstSyncWrite, lastRowWrite });
  check("TC-23 no cursor-only write escapes mid-walk",
    db.syncPatches.every((p: FakeRow) => "last_run_at" in p), db.syncPatches);
  check("TC-23 the backfill is marked complete once the floor is reached",
    db.lastSyncPatch().backfill_complete === true, db.lastSyncPatch());
}
{
  // The zero-eligible path must persist the cursor too, or a chunk that walked
  // a page of nothing but WeightTraining throws that walk away every run.
  const db = makeDb({
    sync: syncRow({
      backfill_complete: false,
      backfill_cursor_before: null,
      incremental_after: epochOf("2026-08-25T00:00:00Z"),
    }),
    tokens: { ...freshTokens },
  });
  const net = installStrava({
    activities: [summary(1951, "2026-06-20T06:00:00", { sport_type: "WeightTraining" })],
  });
  await run(db);
  net.restore();
  check("TC-23 zero-eligible run still persists the backfill cursor",
    typeof db.lastSyncPatch().backfill_cursor_before === "number", db.lastSyncPatch());
}

// ---------------------------------------------------------------------------
// TC-24 — multi-page incremental skips nothing (D3)
// ---------------------------------------------------------------------------
{
  // 150 activities forces a second page at PER_PAGE = 100. They are Runs so the
  // pass costs no detail fetches; every one still produces a decision, which is
  // how we prove all 150 were listed.
  const many: StravaActivity[] = [];
  for (let i = 0; i < 150; i++) {
    const day = new Date(Date.UTC(2026, 7, 1, 0, 0, 0) + i * 3600_000).toISOString().slice(0, 19);
    many.push(summary(2000 + i, day, { sport_type: "Run" }));
  }
  const db = makeDb({
    sync: syncRow({ incremental_after: epochOf("2026-07-31T00:00:00Z") }),
    tokens: { ...freshTokens },
  });
  const net = installStrava({ activities: many });
  const r = await run(db);
  net.restore();

  const seenIds = new Set(r.decisions.map((d) => d.activityId));
  const missing = many.filter((a) => !seenIds.has(a.id)).map((a) => a.id);

  check("TC-24 more than one page was requested", net.listCalls.length >= 2, net.listCalls);
  check("TC-24 `after` is held FIXED across pages",
    new Set(net.listCalls.map((c) => c.after)).size === 1, net.listCalls);
  check("TC-24 only `page` advances",
    net.listCalls.map((c) => c.page).join() === net.listCalls.map((_c, i) => i + 1).join(),
    net.listCalls);
  check("TC-24 every one of the 150 activities was seen", missing.length === 0, missing);
  check("TC-24 the watermark lands on the newest, not on page 1's oldest",
    db.lastSyncPatch().incremental_after === Math.max(...many.map((a) => epochOf(String(a.start_date)))),
    db.lastSyncPatch().incremental_after);
}

// ---------------------------------------------------------------------------
// TC-25 — status precedence: rate_limited > partial > error > noop > ok
// ---------------------------------------------------------------------------
{
  // rate_limited outranks a run that wrote rows successfully.
  const db = makeDb({
    sync: syncRow({ backfill_complete: false, backfill_cursor_before: null }),
    tokens: { ...freshTokens },
  });
  const net = installStrava({
    activities: [fullSummary(2201, "2026-08-20T06:00:00")],
    // call 1 is the incremental list; call 2 is the first backfill page.
    listStatus: (n) => (n === 2 ? 429 : undefined),
  });
  const r = await run(db);
  net.restore();
  check("TC-25 rate_limited outranks a successful write",
    r.status === "rate_limited" && r.imported === 1, r);
  check("TC-25 rate_limited sets the error code", r.errorCode === "rate_limited", r);
  check("TC-25 rate_limited arms the quarter-hour hold",
    typeof db.lastSyncPatch().rate_limit_resets_at === "string", db.lastSyncPatch());
}
{
  // A run held off by a previous 429 returns before touching anything.
  const db = makeDb({
    sync: syncRow({ rate_limit_resets_at: new Date(NOW_MS + 300_000).toISOString() }),
    tokens: { ...freshTokens },
  });
  const net = installStrava({ activities: [fullSummary(2202, "2026-08-20T06:00:00")] });
  const r = await run(db);
  net.restore();
  check("TC-25 an armed rate-limit hold short-circuits the run",
    r.status === "rate_limited" && net.listCalls.length === 0, { r, listCalls: net.listCalls });
}
{
  // Every write fails: error, not partial.
  const db = makeDb({
    sync: syncRow(),
    tokens: { ...freshTokens },
    rpcFails: () => ({ code: "42501" }),
  });
  const net = installStrava({ activities: [fullSummary(2203, "2026-08-20T06:00:00")] });
  const r = await run(db);
  net.restore();
  check("TC-25 all writes failing -> error, not partial", r.status === "error" && r.failed === 1, r);
}
{
  // Eligible but nothing written and nothing failed -> noop. Two candidate
  // rows inside tolerance is ambiguous, and ambiguity writes nothing.
  const a = fullSummary(2204, "2026-08-20T06:00:00");
  const twin = (id: number): SessionRow => ({
    id,
    strava_activity_id: null,
    date_iso: "2026-08-20",
    type: "erg",
    distance_m: 5657,
    duration: "26:00",
    source: "portal",
  });
  const db = makeDb({
    sync: syncRow(),
    tokens: { ...freshTokens },
    sessions: [twin(51), twin(52)],
  });
  const net = installStrava({ activities: [a] });
  const r = await run(db);
  net.restore();
  check("TC-25 ambiguous-only run -> noop", r.status === "noop", r);
  check("TC-25 ambiguity writes nothing", db.rpcCalls.length === 0, db.rpcCalls);
  check("TC-25 ambiguity is recorded for a human", r.ambiguousActivityIds.join() === "2204", r);
  check("TC-25 noop is still ok", r.ok === true, r);
}
{
  // A disconnected user is a noop before any network call at all.
  const db = makeDb({ sync: syncRow({ connected: false }), tokens: { ...freshTokens } });
  const net = installStrava({ activities: [fullSummary(2205, "2026-08-20T06:00:00")] });
  const r = await run(db);
  net.restore();
  check("TC-25 disconnected -> noop with no calls",
    r.status === "noop" && net.listCalls.length === 0 && db.writes().length === 0, r);
}
{
  // And the plain happy path is 'ok'.
  const db = makeDb({ sync: syncRow(), tokens: { ...freshTokens } });
  const net = installStrava({ activities: [fullSummary(2206, "2026-08-20T06:00:00")] });
  const r = await run(db);
  net.restore();
  check("TC-25 a clean run -> ok", r.status === "ok" && r.ok === true, r);
  check("TC-25 counters are carried forward, not reset",
    db.lastSyncPatch().imported_total === 1, db.lastSyncPatch());
}

if (savedDsn === undefined) Deno.env.delete("SENTRY_DSN");
else Deno.env.set("SENTRY_DSN", savedDsn);

console.log("\nRESULT:", pass, "passed,", fail, "failed");
if (fail) Deno.exit(1);
