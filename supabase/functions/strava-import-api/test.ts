import { mapActivity, mapSportType } from "./mapper.ts";

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

// Fixtures shaped like real Strava Summary/DetailedActivity objects.
// Strava field paths/units: distance (metres, number), moving_time (seconds),
// average_watts (number), average_heartrate (number bpm), start_date (UTC ISO),
// start_date_local (local ISO — calendar day source), sport_type/type.

function detail(over: Record<string, unknown>): Record<string, unknown> {
  return {
    id: 12345,
    name: "Morning Session",
    distance: 5000,
    moving_time: 1200,
    average_watts: 180,
    average_heartrate: 150,
    start_date: "2026-06-25T22:10:05Z",
    start_date_local: "2026-06-26T06:10:05Z",
    sport_type: "Rowing",
    type: "Rowing",
    ...over,
  };
}

// ---------------------------------------------------------------------------
// Test 1: sport mapping — each accepted sport
// ---------------------------------------------------------------------------

check("mapSportType Rowing -> erg",          mapSportType({ sport_type: "Rowing" }) === "erg");
check("mapSportType Ride -> cycling",        mapSportType({ sport_type: "Ride" }) === "cycling");
check("mapSportType VirtualRide -> cycling", mapSportType({ sport_type: "VirtualRide" }) === "cycling");
check("mapSportType WeightTraining -> Strength", mapSportType({ sport_type: "WeightTraining" }) === "Strength");
check("mapSportType Workout -> Strength",    mapSportType({ sport_type: "Workout" }) === "Strength");

// falls back to `type` when sport_type absent
check("mapSportType falls back to type",     mapSportType({ type: "Rowing" }) === "erg");

// ---------------------------------------------------------------------------
// Test 2: skipped sports -> null
// ---------------------------------------------------------------------------

check("mapSportType Run -> null",     mapSportType({ sport_type: "Run" }) === null);
check("mapSportType Walk -> null",    mapSportType({ sport_type: "Walk" }) === null);
check("mapSportType Hike -> null",    mapSportType({ sport_type: "Hike" }) === null);
check("mapSportType Swim -> null",    mapSportType({ sport_type: "Swim" }) === null);
check("mapSportType unknown -> null", mapSportType({ sport_type: "Kitesurf" }) === null);
check("mapActivity Run -> null",      mapActivity(detail({ sport_type: "Run", type: "Run" })) === null);

// ---------------------------------------------------------------------------
// Test 3: full mapping of an accepted activity
// ---------------------------------------------------------------------------

const rec = mapActivity(detail({}))!;
check("mapActivity type erg",            rec.type === "erg", rec.type);
check("mapActivity id preserved",        rec.strava_activity_id === 12345, rec.strava_activity_id);
check("mapActivity label from name",     rec.label === "Morning Session", rec.label);
check("mapActivity duration 1200s -> 20",rec.duration === "20", rec.duration);
check("mapActivity avg_watts 180",       rec.avg_watts === 180, rec.avg_watts);
check("mapActivity avg_hr 150",          rec.avg_hr === 150, rec.avg_hr);
check("mapActivity distance_m 5000",     rec.distance_m === 5000, rec.distance_m);
check("mapActivity sport_type Rowing",   rec.sport_type === "Rowing", rec.sport_type);
check("mapActivity start_date UTC ISO",  rec.start_date === "2026-06-25T22:10:05Z", rec.start_date);

// date is the LOCAL calendar day (start_date_local), not the UTC day
check("mapActivity date from start_date_local", rec.date === "2026-06-26", rec.date);

// ---------------------------------------------------------------------------
// Test 4: missing optional fields -> null (not throw)
// ---------------------------------------------------------------------------

const recNoHr = mapActivity(detail({ average_heartrate: undefined }))!;
check("absent average_heartrate -> avg_hr null", recNoHr.avg_hr === null, recNoHr.avg_hr);

const recNoWatts = mapActivity(detail({ average_watts: undefined }))!;
check("absent average_watts -> avg_watts null", recNoWatts.avg_watts === null, recNoWatts.avg_watts);

const recNoDist = mapActivity(detail({ distance: undefined }))!;
check("absent distance -> distance_m null", recNoDist.distance_m === null, recNoDist.distance_m);

const recNullHr = mapActivity(detail({ average_heartrate: null }))!;
check("null average_heartrate -> avg_hr null", recNullHr.avg_hr === null, recNullHr.avg_hr);

// ---------------------------------------------------------------------------
// Test 5: rounding — duration and distance
// ---------------------------------------------------------------------------

const recDur1 = mapActivity(detail({ moving_time: 3661 }))!;
check("duration 3661s -> \"61\"", recDur1.duration === "61", recDur1.duration);

const recDur2 = mapActivity(detail({ moving_time: 90 }))!;
check("duration 90s -> \"2\"", recDur2.duration === "2", recDur2.duration);

const recDist = mapActivity(detail({ distance: 5234.7 }))!;
check("distance 5234.7 -> 5235", recDist.distance_m === 5235, recDist.distance_m);

// ---------------------------------------------------------------------------
// Test 6: malformed/empty input -> null, not throw
// ---------------------------------------------------------------------------

check("mapActivity null -> null",        mapActivity(null) === null);
check("mapActivity {} -> null",          mapActivity({}) === null);
check("mapActivity no id -> null",       mapActivity(detail({ id: undefined })) === null);
check("mapSportType null -> null",       mapSportType(null) === null);
check("mapSportType array -> null",      mapSportType([]) === null);

// ---------------------------------------------------------------------------

console.log("\nRESULT:", pass, "passed,", fail, "failed");
if (fail) Deno.exit(1);
