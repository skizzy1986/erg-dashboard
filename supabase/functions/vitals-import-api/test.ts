import { extractHrv, extractRhr, extractSleepHours, extractWeightKg, extractSteps, extractDistanceMeters, extractActiveMinutes, extractCaloriesKcal, mapResponses } from "./mapper.ts";

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

// Fixtures shaped like real Google Health `dataPoints.list` responses (camelCase JSON).
// Field paths/units confirmed against live Fitbit/Health-Connect data:
//   HRV averageHeartRateVariabilityMilliseconds (number), RHR beatsPerMinute (STRING),
//   weight weightGrams (number), sleep summary.minutesAsleep (number minutes).

const hrvResp = { dataPoints: [{ dailyHeartRateVariability: { averageHeartRateVariabilityMilliseconds: 38.7 } }] };
const rhrResp = { dataPoints: [{ dailyRestingHeartRate: { beatsPerMinute: "56" } }] };
const sleepResp = { dataPoints: [{ sleep: { summary: { minutesAsleep: 390 } } }] };
const weightResp = { dataPoints: [{ weight: { weightGrams: 95400 } }] };
const stepsResp = { dataPoints: [{ dailySteps: { count: 8421 } }] };
const distanceResp = { dataPoints: [{ dailyDistance: { distanceMeters: 8234.5 } }] };
const activeMinResp = { dataPoints: [{ dailyActiveMinutes: { minutes: 45 } }] };
const caloriesResp = { dataPoints: [{ dailyCaloriesExpended: { energyKilocalories: 2350.7 } }] };

// ---------------------------------------------------------------------------
// Test 1: All eight metrics present and well-formed
// ---------------------------------------------------------------------------

const rec1 = mapResponses("2026-06-25", hrvResp, rhrResp, sleepResp, weightResp, stepsResp, distanceResp, activeMinResp, caloriesResp);
check("all present: hrv_ms rounds to 39",         rec1.hrv_ms === 39,           rec1.hrv_ms);
check("all present: rhr_bpm parses string -> 56", rec1.rhr_bpm === 56,          rec1.rhr_bpm);
check("all present: sleep_hours 390min = 6.50",   rec1.sleep_hours === 6.50,    rec1.sleep_hours);
check("all present: weightGrams 95400 -> 95.4",   rec1.bodyweight_kg === 95.4,  rec1.bodyweight_kg);
check("all present: date preserved",              rec1.date === "2026-06-25",   rec1.date);
check("all present: steps_count = 8421",          rec1.steps_count === 8421,    rec1.steps_count);
check("all present: distance_m = 8234.5",         rec1.distance_m === 8234.5,   rec1.distance_m);
check("all present: active_minutes = 45",         rec1.active_minutes === 45,   rec1.active_minutes);
check("all present: calories_kcal = 2351",        rec1.calories_kcal === 2351,  rec1.calories_kcal);

// ---------------------------------------------------------------------------
// Test 2: HRV response empty (null) → hrv_ms null, others unaffected
// ---------------------------------------------------------------------------

const rec2 = mapResponses("2026-06-25", null, rhrResp, sleepResp, weightResp);
check("hrv null: hrv_ms is null",           rec2.hrv_ms === null,         rec2.hrv_ms);
check("hrv null: rhr_bpm still 56",         rec2.rhr_bpm === 56,          rec2.rhr_bpm);
check("hrv null: sleep_hours still 6.50",   rec2.sleep_hours === 6.50,    rec2.sleep_hours);
check("hrv null: bodyweight_kg still 95.4", rec2.bodyweight_kg === 95.4,  rec2.bodyweight_kg);

// Empty dataPoints array → null.
const rec2b = mapResponses("2026-06-25", { dataPoints: [] }, rhrResp, sleepResp, weightResp);
check("hrv empty dataPoints: hrv_ms is null", rec2b.hrv_ms === null, rec2b.hrv_ms);

// ---------------------------------------------------------------------------
// Test 3: Sleep sums minutesAsleep across multiple sessions (e.g. nap + night)
// ---------------------------------------------------------------------------

const sleepTwoSessions = {
  dataPoints: [
    { sleep: { summary: { minutesAsleep: 360 } } },
    { sleep: { summary: { minutesAsleep: 30 } } },
  ],
};
const rec3 = mapResponses("2026-06-25", hrvResp, rhrResp, sleepTwoSessions, weightResp);
check("sleep two sessions: 390min = 6.50", rec3.sleep_hours === 6.50, rec3.sleep_hours);

// Sleep with zero asleep minutes → null.
const sleepZero = { dataPoints: [{ sleep: { summary: { minutesAsleep: 0 } } }] };
const rec3b = mapResponses("2026-06-25", hrvResp, rhrResp, sleepZero, weightResp);
check("sleep zero minutes: sleep_hours is null", rec3b.sleep_hours === null, rec3b.sleep_hours);

// ---------------------------------------------------------------------------
// Test 4: Weight response absent (null) → bodyweight_kg null
// ---------------------------------------------------------------------------

const rec4 = mapResponses("2026-06-25", hrvResp, rhrResp, sleepResp, null);
check("weight null: bodyweight_kg is null",     rec4.bodyweight_kg === null, rec4.bodyweight_kg);
check("weight null: hrv_ms still 39",           rec4.hrv_ms === 39,          rec4.hrv_ms);
check("weight null: rhr_bpm still 56",          rec4.rhr_bpm === 56,         rec4.rhr_bpm);
check("weight null: sleep_hours still 6.50",    rec4.sleep_hours === 6.50,   rec4.sleep_hours);

// ---------------------------------------------------------------------------
// Test 5: All four responses absent (null) → all metric fields null
// ---------------------------------------------------------------------------

const rec5 = mapResponses("2026-06-25", null, null, null, null);
check("all null: hrv_ms is null",         rec5.hrv_ms === null,         rec5.hrv_ms);
check("all null: rhr_bpm is null",        rec5.rhr_bpm === null,        rec5.rhr_bpm);
check("all null: sleep_hours is null",    rec5.sleep_hours === null,     rec5.sleep_hours);
check("all null: bodyweight_kg is null",  rec5.bodyweight_kg === null,   rec5.bodyweight_kg);
check("all null: date preserved",         rec5.date === "2026-06-25",    rec5.date);
check("all null: steps_count is null",    rec5.steps_count === null,     rec5.steps_count);
check("all null: distance_m is null",     rec5.distance_m === null,      rec5.distance_m);
check("all null: active_minutes is null", rec5.active_minutes === null,  rec5.active_minutes);
check("all null: calories_kcal is null",  rec5.calories_kcal === null,   rec5.calories_kcal);

// ---------------------------------------------------------------------------
// Test 6: Per-extractor direct checks (real captured sample values)
// ---------------------------------------------------------------------------

check("extractHrv: 31.8 -> 32",   extractHrv({ dataPoints: [{ dailyHeartRateVariability: { averageHeartRateVariabilityMilliseconds: 31.8 } }] }) === 32, "hrv");
check("extractRhr: \"57\" -> 57",  extractRhr({ dataPoints: [{ dailyRestingHeartRate: { beatsPerMinute: "57" } }] }) === 57, "rhr");
check("extractWeightKg: 94500g -> 94.5", extractWeightKg({ dataPoints: [{ weight: { weightGrams: 94500 } }] }) === 94.5, "weight");
check("extractSleepHours: 450min -> 7.5", extractSleepHours({ dataPoints: [{ sleep: { summary: { minutesAsleep: 450 } } }] }) === 7.5, "sleep");
check("malformed shape -> null",   extractHrv({ foo: "bar" }) === null, "malformed");

// ── extractSteps ─────────────────────────────────────────────────────────────
const steps1 = extractSteps({ dataPoints: [{ dailySteps: { count: 8421 } }] });
check("extractSteps: single data point", steps1 === 8421, steps1);
const steps2 = extractSteps({ dataPoints: [{ dailySteps: { count: 5000 } }, { dailySteps: { count: 3000 } }] });
check("extractSteps: sums multiple data points", steps2 === 8000, steps2);
const stepsNull = extractSteps(null);
check("extractSteps: null response", stepsNull === null, stepsNull);
const stepsEmpty = extractSteps({ dataPoints: [] });
check("extractSteps: empty dataPoints", stepsEmpty === null, stepsEmpty);
const stepsMalformed = extractSteps({ foo: "bar" });
check("extractSteps: malformed shape", stepsMalformed === null, stepsMalformed);

// ── extractDistanceMeters ─────────────────────────────────────────────────────
const dist1 = extractDistanceMeters({ dataPoints: [{ dailyDistance: { distanceMeters: 8234.5 } }] });
check("extractDistanceMeters: single data point", dist1 === 8234.5, dist1);
const dist2 = extractDistanceMeters({ dataPoints: [{ dailyDistance: { distanceMeters: 4000.123 } }, { dailyDistance: { distanceMeters: 4000.444 } }] });
check("extractDistanceMeters: sums multiple data points", dist2 === 8000.57, dist2);
const distRound = extractDistanceMeters({ dataPoints: [{ dailyDistance: { distanceMeters: 8234.567 } }] });
check("extractDistanceMeters: rounds to 2dp", distRound === 8234.57, distRound);
const distNull = extractDistanceMeters(null);
check("extractDistanceMeters: null response", distNull === null, distNull);
const distEmpty = extractDistanceMeters({ dataPoints: [] });
check("extractDistanceMeters: empty dataPoints", distEmpty === null, distEmpty);
const distMalformed = extractDistanceMeters({ foo: "bar" });
check("extractDistanceMeters: malformed shape", distMalformed === null, distMalformed);

// ── extractActiveMinutes ──────────────────────────────────────────────────────
const active1 = extractActiveMinutes({ dataPoints: [{ dailyActiveMinutes: { minutes: 45 } }] });
check("extractActiveMinutes: dailyActiveMinutes field", active1 === 45, active1);
const active2 = extractActiveMinutes({ dataPoints: [{ activeZoneMinutes: { minutes: 32 } }] });
check("extractActiveMinutes: activeZoneMinutes fallback", active2 === 32, active2);
const active3 = extractActiveMinutes({ dataPoints: [{ dailyActiveMinutes: { minutes: 20 } }, { dailyActiveMinutes: { minutes: 25 } }] });
check("extractActiveMinutes: sums multiple data points", active3 === 45, active3);
const activeMalformed = extractActiveMinutes({ foo: "bar" });
check("extractActiveMinutes: malformed shape", activeMalformed === null, activeMalformed);
const activeNull = extractActiveMinutes(null);
check("extractActiveMinutes: null response", activeNull === null, activeNull);
const activeEmpty = extractActiveMinutes({ dataPoints: [] });
check("extractActiveMinutes: empty dataPoints", activeEmpty === null, activeEmpty);

// ── extractCaloriesKcal ───────────────────────────────────────────────────────
const cal1 = extractCaloriesKcal({ dataPoints: [{ dailyCaloriesExpended: { energyKilocalories: 2350.7 } }] });
check("extractCaloriesKcal: single data point", cal1 === 2351, cal1);
const cal2 = extractCaloriesKcal({ dataPoints: [{ dailyCaloriesExpended: { energyKilocalories: 1200 } }, { dailyCaloriesExpended: { energyKilocalories: 1150.9 } }] });
check("extractCaloriesKcal: sums multiple data points", cal2 === 2351, cal2);
const calNull = extractCaloriesKcal(null);
check("extractCaloriesKcal: null response", calNull === null, calNull);
const calEmpty = extractCaloriesKcal({ dataPoints: [] });
check("extractCaloriesKcal: empty dataPoints", calEmpty === null, calEmpty);
const calMalformed = extractCaloriesKcal({ foo: "bar" });
check("extractCaloriesKcal: malformed shape", calMalformed === null, calMalformed);

// ---------------------------------------------------------------------------

console.log("\nRESULT:", pass, "passed,", fail, "failed");
if (fail) Deno.exit(1);
