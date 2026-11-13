import { describe, it, expect } from 'vitest';
import { epley1rm, buildLiftSeries } from '../liftSeries.js';

const set = (over) => ({
  exercise_name: 'Lift A',
  weight_kg: 30,
  reps: 3,
  is_warmup: false,
  completed: true,
  hold_seconds: null,
  ...over,
});

describe('epley1rm', () => {
  it('applies weight × (1 + reps/30), rounded', () => {
    expect(epley1rm(30, 3)).toBe(33);
    expect(epley1rm('30', '3')).toBe(33);
  });

  it('returns null when weight or reps is missing, zero or negative', () => {
    expect(epley1rm(null, 5)).toBeNull();
    expect(epley1rm(30, null)).toBeNull();
    expect(epley1rm(0, 5)).toBeNull();
    expect(epley1rm(30, 0)).toBeNull();
    expect(epley1rm(-10, 5)).toBeNull();
    expect(epley1rm(undefined, undefined)).toBeNull();
  });
});

describe('buildLiftSeries', () => {
  it('handles no workouts', () => {
    expect(buildLiftSeries([])).toEqual({
      lifts: {},
      setCount: 0,
      scoredCount: 0,
    });
    expect(buildLiftSeries(undefined)).toEqual({
      lifts: {},
      setCount: 0,
      scoredCount: 0,
    });
  });

  it('counts but does not score a warm-up without weight and an incomplete working set', () => {
    const out = buildLiftSeries([
      {
        workout_date: '2001-01-02',
        strength_sets: [
          set({
            exercise_name: 'Barbell Squat',
            is_warmup: true,
            weight_kg: null,
            reps: null,
          }),
          set({
            exercise_name: 'Barbell Squat',
            completed: false,
            weight_kg: null,
          }),
        ],
      },
    ]);
    expect(out).toEqual({ lifts: {}, setCount: 2, scoredCount: 0 });
  });

  it('keeps the best e1RM per exercise per workout, in chronological order', () => {
    const out = buildLiftSeries([
      {
        workout_date: '2001-01-09',
        strength_sets: [set({ weight_kg: 40, reps: 3 })],
      },
      {
        workout_date: '2001-01-02',
        strength_sets: [
          set({ weight_kg: 30, reps: 3 }),
          set({ weight_kg: 30, reps: 6 }),
          set({ weight_kg: 30, reps: 1 }),
          set({ exercise_name: 'Lift B', weight_kg: 15, reps: 15 }),
        ],
      },
    ]);
    expect(out.setCount).toBe(5);
    expect(out.scoredCount).toBe(5);
    expect(out.lifts['Lift A']).toEqual([
      { date: '1/2/01', e1rm: 36 },
      { date: '1/9/01', e1rm: 44 },
    ]);
    expect(out.lifts['Lift B']).toEqual([{ date: '1/2/01', e1rm: 23 }]);
  });

  it('keeps any exercise name, with no name filtering', () => {
    const out = buildLiftSeries([
      {
        workout_date: '2001-01-02',
        strength_sets: [
          set({ exercise_name: 'Barbell Squat' }),
          set({ exercise_name: 'Some Unlisted Movement' }),
        ],
      },
    ]);
    expect(Object.keys(out.lifts)).toEqual([
      'Barbell Squat',
      'Some Unlisted Movement',
    ]);
  });

  it('excludes timed hold sets and workouts without sets', () => {
    const out = buildLiftSeries([
      {
        workout_date: '2001-01-02',
        strength_sets: [set({ exercise_name: 'Hold', hold_seconds: 20 })],
      },
      { workout_date: '2001-01-03', strength_sets: null },
    ]);
    expect(out).toEqual({ lifts: {}, setCount: 1, scoredCount: 0 });
  });
});
