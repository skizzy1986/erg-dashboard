import { extractHrv, extractRhr, extractSleepHours, extractWeightKg, mapResponses } from "./mapper.ts";

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

// ---------------------------------------------------------------------------
// Test 1: All four metrics present and well-formed
// ---------------------------------------------------------------------------

const hrvResp = {
  point: [{ value: [{ rmssd: 38.7 }] }],
};
const rhrResp = {
  point: [{ value: [{ beatsPerMinute: 56.0 }] }],
};
const sleepResp = {
  point: [
    {
      value: [
        { stage: "light",  durationMinutes: 240 },
        { stage: "deep",   durationMinutes: 60  },
        { stage: "rem",    durationMinutes: 90  },
        { stage: "Awake",  durationMinutes: 45  },
      ],
    },
  ],
};
const weightResp = {
  point: [{ value: [{ weightKg: 95.4 }] }],
};

const rec1 = mapResponses("2026-06-25", hrvResp, rhrResp, sleepResp, weightResp);
check("all present: hrv_ms rounds to 39",         rec1.hrv_ms === 39,           rec1.hrv_ms);
check("all present: rhr_bpm rounds to 56",        rec1.rhr_bpm === 56,          rec1.rhr_bpm);
check("all present: sleep_hours 390min = 6.50",   rec1.sleep_hours === 6.50,    rec1.sleep_hours);
check("all present: bodyweight_kg 95.4",          rec1.bodyweight_kg === 95.4,  rec1.bodyweight_kg);
check("all present: date preserved",              rec1.date === "2026-06-25",   rec1.date);

// ---------------------------------------------------------------------------
// Test 2: HRV response empty (null) → hrv_ms null, others unaffected
// ---------------------------------------------------------------------------

const rec2 = mapResponses("2026-06-25", null, rhrResp, sleepResp, weightResp);
check("hrv null: hrv_ms is null",           rec2.hrv_ms === null,         rec2.hrv_ms);
check("hrv null: rhr_bpm still 56",         rec2.rhr_bpm === 56,          rec2.rhr_bpm);
check("hrv null: sleep_hours still 6.50",   rec2.sleep_hours === 6.50,    rec2.sleep_hours);
check("hrv null: bodyweight_kg still 95.4", rec2.bodyweight_kg === 95.4,  rec2.bodyweight_kg);

// Also verify with an empty-points object (no points array).
const rec2b = mapResponses("2026-06-25", { point: [] }, rhrResp, sleepResp, weightResp);
check("hrv empty points: hrv_ms is null", rec2b.hrv_ms === null, rec2b.hrv_ms);

// ---------------------------------------------------------------------------
// Test 3: Sleep with only Awake stage entries → sleep_hours null
// ---------------------------------------------------------------------------

const sleepOnlyAwake = {
  point: [
    {
      value: [
        { stage: "Awake", durationMinutes: 120 },
        { stage: "awake", durationMinutes: 30  },
      ],
    },
  ],
};
const rec3 = mapResponses("2026-06-25", hrvResp, rhrResp, sleepOnlyAwake, weightResp);
check("sleep only-Awake: sleep_hours is null", rec3.sleep_hours === null, rec3.sleep_hours);

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

console.log("\nRESULT:", pass, "passed,", fail, "failed");
if (fail) Deno.exit(1);
