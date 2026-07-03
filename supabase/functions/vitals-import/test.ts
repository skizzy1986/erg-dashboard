import { buildRecords, isoDate } from "./parser.ts";
import { checkCronSecret } from "./cronGuard.ts";

// Three separate CSVs mirroring the real Health Data Export tab structure.
// Includes the 6/18 sleep double-row and Concept2 vitals rows with blank HRV/RHR.

const vitalsCsv = [
  "Date,Source(s),Timezone,Heart rate min (bpm),Heart rate max (bpm),Heart rate avg (bpm),Heart rate variability min (ms),Heart rate variability max (ms),Heart rate variability avg (ms),Oxygen saturation min (%),Oxygen saturation max (%),Oxygen saturation avg (%),Respiratory rate min (breaths/min),Respiratory rate max (breaths/min),Respiratory rate avg (breaths/min),Resting heart rate min (bpm),Resting heart rate max (bpm),Resting heart rate avg (bpm),Blood pressure (mmHg),Blood glucose (mmol/L),Body temperature (°C)",
  "2026-06-14,com.fitbit.FitbitMobile,Australia/Perth,45,124,67.53,11.70,44.70,25.20,,,,15.40,15.40,15.40,57.00,57.00,57.00,,,",
  "2026-06-14,com.concept2.ergdata,Australia/Perth,71,129,116.45,,,,,,,,,,,,,,,",
  "2026-06-18,com.fitbit.FitbitMobile,Australia/Perth,44,122,66.38,11.40,52.30,30.20,,,,16.60,16.60,16.60,56.00,56.00,56.00,,,",
  "2026-06-20,com.fitbit.FitbitMobile,Australia/Perth,43,78,49.15,22.10,46.50,31.95,,,,16.20,16.20,16.20,56.00,56.00,56.00,,,",
  "2026-06-22,com.fitbit.FitbitMobile,Australia/Perth,46,91,53.57,13.20,47.90,23.08,,,,10.20,10.20,10.20,58.00,58.00,58.00,,,",
].join("\n");

const sleepCsv = [
  "Date,Source(s),Timezone,Start Time,End Time,Light Sleep (min),Deep Sleep (min),REM Sleep (min),Awake (min)",
  "2026-06-14,com.fitbit.FitbitMobile,Australia/Perth,2026-06-13 23:06:00,2026-06-14 08:15:00,308,66,126,36",
  "2026-06-18,com.fitbit.FitbitMobile,Australia/Perth,2026-06-17 23:50:00,2026-06-18 09:02:00,238,45,74,181",
  "2026-06-18,com.fitbit.FitbitMobile,Australia/Perth,2026-06-17 23:50:00,2026-06-18 09:22:00,244,41,74,198",
  "2026-06-22,com.fitbit.FitbitMobile,Australia/Perth,2026-06-21 20:37:00,2026-06-22 08:34:00,393,83,158,65",
].join("\n");

const weightCsv = [
  "Date/Time,Source(s),Timezone,Weight (kg),Body Fat (%),Bone mass (kg),Height (m),Lean body mass (kg)",
  "2026-06-14 00:00:00,com.sbs.diet,Australia/Perth,95.00,,,,",
  "2026-06-18 00:00:00,com.sbs.diet,Australia/Perth,95.00,,,,",
  "2026-06-22 00:00:00,com.sbs.diet,Australia/Perth,94.50,,,,",
].join("\n");

const recs = buildRecords(vitalsCsv, sleepCsv, weightCsv);
const byDate: Record<string, any> = {};
for (const r of recs) byDate[r.date] = r;

let pass = 0, fail = 0;
const check = (n: string, c: boolean) => { if (c) { pass++; console.log("  PASS", n); } else { fail++; console.log("  FAIL", n, "->", JSON.stringify(byDate)); } };

// 6/14: full row
check("6/14 hrv rounded 25", byDate["2026-06-14"].hrv_ms === 25);
check("6/14 rhr 57", byDate["2026-06-14"].rhr_bpm === 57);
check("6/14 sleep (308+66+126)/60=8.33", byDate["2026-06-14"].sleep_hours === 8.33);
check("6/14 weight 95", byDate["2026-06-14"].bodyweight_kg === 95);
// Concept2 row must NOT clobber HRV/RHR with blanks
check("6/14 hrv survived Concept2 blank row", byDate["2026-06-14"].hrv_ms === 25);
// 6/18: sleep double-row -> max(357,359)=359 -> 5.98
check("6/18 sleep double-row -> max 359/60=5.98", byDate["2026-06-18"].sleep_hours === 5.98);
check("6/18 hrv 30", byDate["2026-06-18"].hrv_ms === 30);
check("6/18 weight 95", byDate["2026-06-18"].bodyweight_kg === 95);
// 6/20: vitals only, no sleep/weight -> nulls preserved
check("6/20 rhr 56", byDate["2026-06-20"].rhr_bpm === 56);
check("6/20 sleep null (no sleep row)", byDate["2026-06-20"].sleep_hours === null);
check("6/20 weight null (no weight row)", byDate["2026-06-20"].bodyweight_kg === null);
// 6/22
check("6/22 hrv 23", byDate["2026-06-22"].hrv_ms === 23);
check("6/22 sleep (393+83+158)/60=10.57", byDate["2026-06-22"].sleep_hours === 10.57);
check("6/22 weight 94.5", byDate["2026-06-22"].bodyweight_kg === 94.5);
// activity/nutrition ignored: no stray dates, exactly the 5 we expect
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
