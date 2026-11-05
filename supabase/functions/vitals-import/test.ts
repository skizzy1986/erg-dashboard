import { buildRecords, isoDate } from "./parser.ts";
import { checkCronSecret } from "./cronGuard.ts";

// Three separate CSVs mirroring the Health Data Export tab structure. Every value
// is SYNTHETIC (round example numbers, example dates, a generic UTC+8 zone) —
// the parser never reads the Timezone column. Covers a sleep double-row and a
// Concept2 vitals row with blank HRV/RHR.

const TZ = "Asia/Singapore";

const vitalsCsv = [
  "Date,Source(s),Timezone,Heart rate min (bpm),Heart rate max (bpm),Heart rate avg (bpm),Heart rate variability min (ms),Heart rate variability max (ms),Heart rate variability avg (ms),Oxygen saturation min (%),Oxygen saturation max (%),Oxygen saturation avg (%),Respiratory rate min (breaths/min),Respiratory rate max (breaths/min),Respiratory rate avg (breaths/min),Resting heart rate min (bpm),Resting heart rate max (bpm),Resting heart rate avg (bpm),Blood pressure (mmHg),Blood glucose (mmol/L),Body temperature (°C)",
  `2026-01-01,com.fitbit.FitbitMobile,${TZ},50,100,70.00,10.00,60.00,40.40,,,,15.00,15.00,15.00,60.00,60.00,60.00,,,`,
  `2026-01-01,com.concept2.ergdata,${TZ},90,150,120.00,,,,,,,,,,,,,,,`,
  `2026-01-02,com.fitbit.FitbitMobile,${TZ},50,100,70.00,10.00,60.00,50.00,,,,15.00,15.00,15.00,61.00,61.00,61.00,,,`,
  `2026-01-03,com.fitbit.FitbitMobile,${TZ},50,100,70.00,10.00,60.00,45.00,,,,15.00,15.00,15.00,62.00,62.00,62.00,,,`,
  `2026-01-04,com.fitbit.FitbitMobile,${TZ},50,100,70.00,10.00,60.00,35.40,,,,15.00,15.00,15.00,60.00,60.00,60.00,,,`,
].join("\n");

const sleepCsv = [
  "Date,Source(s),Timezone,Start Time,End Time,Light Sleep (min),Deep Sleep (min),REM Sleep (min),Awake (min)",
  `2026-01-01,com.fitbit.FitbitMobile,${TZ},2025-12-31 23:00:00,2026-01-01 08:00:00,300,60,120,60`,
  `2026-01-02,com.fitbit.FitbitMobile,${TZ},2026-01-01 23:00:00,2026-01-02 06:30:00,240,60,60,90`,
  `2026-01-02,com.fitbit.FitbitMobile,${TZ},2026-01-01 23:00:00,2026-01-02 07:00:00,240,60,90,90`,
  `2026-01-04,com.fitbit.FitbitMobile,${TZ},2026-01-03 21:00:00,2026-01-04 08:00:00,360,90,150,60`,
].join("\n");

const weightCsv = [
  "Date/Time,Source(s),Timezone,Weight (kg),Body Fat (%),Bone mass (kg),Height (m),Lean body mass (kg)",
  `2026-01-01 00:00:00,com.sbs.diet,${TZ},80.00,,,,`,
  `2026-01-02 00:00:00,com.sbs.diet,${TZ},80.00,,,,`,
  `2026-01-04 00:00:00,com.sbs.diet,${TZ},79.50,,,,`,
].join("\n");

const recs = buildRecords(vitalsCsv, sleepCsv, weightCsv);
const byDate: Record<string, any> = {};
for (const r of recs) byDate[r.date] = r;

let pass = 0, fail = 0;
const check = (n: string, c: boolean) => { if (c) { pass++; console.log("  PASS", n); } else { fail++; console.log("  FAIL", n, "->", JSON.stringify(byDate)); } };

// 1/1: full row
check("1/1 hrv rounded 40", byDate["2026-01-01"].hrv_ms === 40);
check("1/1 rhr 60", byDate["2026-01-01"].rhr_bpm === 60);
check("1/1 sleep (300+60+120)/60=8", byDate["2026-01-01"].sleep_hours === 8);
check("1/1 weight 80", byDate["2026-01-01"].bodyweight_kg === 80);
// Concept2 row must NOT clobber HRV/RHR with blanks
check("1/1 hrv survived Concept2 blank row", byDate["2026-01-01"].hrv_ms === 40);
// 1/2: sleep double-row -> max(360,390)=390 -> 6.5
check("1/2 sleep double-row -> max 390/60=6.5", byDate["2026-01-02"].sleep_hours === 6.5);
check("1/2 hrv 50", byDate["2026-01-02"].hrv_ms === 50);
check("1/2 weight 80", byDate["2026-01-02"].bodyweight_kg === 80);
// 1/3: vitals only, no sleep/weight -> nulls preserved
check("1/3 rhr 62", byDate["2026-01-03"].rhr_bpm === 62);
check("1/3 sleep null (no sleep row)", byDate["2026-01-03"].sleep_hours === null);
check("1/3 weight null (no weight row)", byDate["2026-01-03"].bodyweight_kg === null);
// 1/4
check("1/4 hrv rounded 35", byDate["2026-01-04"].hrv_ms === 35);
check("1/4 sleep (360+90+150)/60=10", byDate["2026-01-04"].sleep_hours === 10);
check("1/4 weight 79.5", byDate["2026-01-04"].bodyweight_kg === 79.5);
// activity/nutrition ignored: no stray dates, exactly the 4 we expect
check("only expected dates present (4)", recs.length === 4);

// isoDate handles both formats
check("isoDate YYYY-MM-DD passthrough", isoDate("2026-06-14") === "2026-06-14");
check("isoDate DD/MM/YYYY converts to ISO", isoDate("14/06/2026") === "2026-06-14");
check("isoDate with timestamp suffix", isoDate("2026-06-14 00:00:00") === "2026-06-14");
check("isoDate null on garbage", isoDate("not-a-date") === null);

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
