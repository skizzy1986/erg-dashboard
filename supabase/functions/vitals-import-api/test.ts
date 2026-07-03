import { extractHrv, extractRhr, extractSleepHours, extractWeightKg, mapResponses } from "./mapper.ts";
import { checkCronSecret } from "./cronGuard.ts";

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

// ---------------------------------------------------------------------------
// Test 1: All four metrics present and well-formed
// ---------------------------------------------------------------------------

const rec1 = mapResponses("2026-06-25", hrvResp, rhrResp, sleepResp, weightResp);
check("all present: hrv_ms rounds to 39",         rec1.hrv_ms === 39,           rec1.hrv_ms);
check("all present: rhr_bpm parses string -> 56", rec1.rhr_bpm === 56,          rec1.rhr_bpm);
check("all present: sleep_hours 390min = 6.50",   rec1.sleep_hours === 6.50,    rec1.sleep_hours);
check("all present: weightGrams 95400 -> 95.4",   rec1.bodyweight_kg === 95.4,  rec1.bodyweight_kg);
check("all present: date preserved",              rec1.date === "2026-06-25",   rec1.date);

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

// ---------------------------------------------------------------------------
// Test 6: Per-extractor direct checks (real captured sample values)
// ---------------------------------------------------------------------------

check("extractHrv: 31.8 -> 32",   extractHrv({ dataPoints: [{ dailyHeartRateVariability: { averageHeartRateVariabilityMilliseconds: 31.8 } }] }) === 32, "hrv");
check("extractRhr: \"57\" -> 57",  extractRhr({ dataPoints: [{ dailyRestingHeartRate: { beatsPerMinute: "57" } }] }) === 57, "rhr");
check("extractWeightKg: 94500g -> 94.5", extractWeightKg({ dataPoints: [{ weight: { weightGrams: 94500 } }] }) === 94.5, "weight");
check("extractSleepHours: 450min -> 7.5", extractSleepHours({ dataPoints: [{ sleep: { summary: { minutesAsleep: 450 } } }] }) === 7.5, "sleep");
check("malformed shape -> null",   extractHrv({ foo: "bar" }) === null, "malformed");

// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// cronGuard: fail-closed, timing-safe CRON_SECRET check
// ---------------------------------------------------------------------------
const CRON_ENV = "CRON_SECRET";
const savedCronSecret = Deno.env.get(CRON_ENV);

const mockReq = (headerValue?: string) =>
  new Request("http://localhost/", {
    headers: headerValue === undefined ? {} : { "x-cron-secret": headerValue },
  });

// 1. secret unset entirely -> 401, regardless of header
Deno.env.delete(CRON_ENV);
check("guard: secret unset -> 401", checkCronSecret(mockReq("anything"))?.status === 401);

// 2. secret set to "" -> 401 (fail closed), even with a matching-looking header
Deno.env.set(CRON_ENV, "");
check("guard: secret empty, header empty -> 401", checkCronSecret(mockReq(""))?.status === 401);
check("guard: secret empty, header set -> 401", checkCronSecret(mockReq("whatever"))?.status === 401);

// From here, a real secret is configured for the remaining cases.
const REAL_SECRET = "s3cret-value-123-xyz";
Deno.env.set(CRON_ENV, REAL_SECRET);

// 3. header missing entirely -> 401
check("guard: header missing -> 401", checkCronSecret(mockReq(undefined))?.status === 401);

// 4. header present but empty -> 401
check("guard: header empty -> 401", checkCronSecret(mockReq(""))?.status === 401);

// 5. header wrong, same length as secret -> 401, must not throw
const wrongSameLen = "x".repeat(REAL_SECRET.length);
check("guard: header wrong (same length) -> 401", checkCronSecret(mockReq(wrongSameLen))?.status === 401);

// 6. header wrong, different length than secret -> 401, must not throw
//    (this is the case that breaks a naive timingSafeEqual(a, b) call
//    directly on unequal-length buffers)
check("guard: header wrong (different length) -> 401", checkCronSecret(mockReq("short"))?.status === 401);

// 7. header correct -> guard passes through (null), no regression
check("guard: header correct -> null (authorized)", checkCronSecret(mockReq(REAL_SECRET)) === null);

// 8. 401 body shape
const body401 = await checkCronSecret(mockReq("wrong"))!.json();
check("guard: 401 body is 'unauthorized'", body401.error === "unauthorized");

// restore prior env state
if (savedCronSecret === undefined) Deno.env.delete(CRON_ENV);
else Deno.env.set(CRON_ENV, savedCronSecret);

console.log("\nRESULT:", pass, "passed,", fail, "failed");
if (fail) Deno.exit(1);
