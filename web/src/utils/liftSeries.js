import { toLogDate } from './dateFormat.js';

// Same Epley formula as StrengthLogger's local e1rm(); that file is excluded
// from coverage, so it keeps its own copy.
export function epley1rm(weightKg, reps) {
  const w = Number(weightKg);
  const r = Number(reps);
  if (!(w > 0) || !(r > 0)) return null;
  return Math.round(w * (1 + r / 30));
}

function isScoreable(set) {
  return (
    set.completed === true &&
    !set.is_warmup &&
    set.hold_seconds == null &&
    epley1rm(set.weight_kg, set.reps) != null
  );
}

export function buildLiftSeries(workouts) {
  const lifts = {};
  let setCount = 0;
  let scoredCount = 0;

  const ordered = [...(workouts ?? [])].sort((a, b) =>
    String(a.workout_date).localeCompare(String(b.workout_date))
  );

  for (const w of ordered) {
    const best = {};
    for (const set of w.strength_sets ?? []) {
      setCount += 1;
      if (!isScoreable(set)) continue;
      scoredCount += 1;
      const e1rm = epley1rm(set.weight_kg, set.reps);
      if (best[set.exercise_name] == null || e1rm > best[set.exercise_name]) {
        best[set.exercise_name] = e1rm;
      }
    }
    const date = toLogDate(w.workout_date);
    for (const [name, e1rm] of Object.entries(best)) {
      (lifts[name] ??= []).push({ date, e1rm });
    }
  }

  return { lifts, setCount, scoredCount };
}
