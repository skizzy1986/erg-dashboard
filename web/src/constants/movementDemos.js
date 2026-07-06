// Curated movement-demo data for the 3D figure in MovementDemoModal.
// Keyed by slug (see utils/movementSlug.js), not the Supabase exercises.id —
// coverage here is intentionally a small curated subset of the ~870-row
// exercise library, scoped to what actually appears in STRENGTH_TEMPLATES
// (see constants/exercises.js). Anything not in this object falls back to
// the "demo coming soon" message in MovementDemoModal.
//
// Muscle names must match the vocabulary already used for the primary/
// secondary heatmap coloring: quadriceps, hamstrings, glutes, calves, chest,
// back, lats, shoulders, biceps, triceps, abdominals, forearms.
//
// pose values are per-joint rotation degrees applied to MovementFigure3D's
// mannequin — populated per movement once the pilot's 3D figure is built
// (see plan step 3).
//
// 'back-squat' below is a PLACEHOLDER — rough sample pose/cue data added
// only so the figure/rotation/phase-switching can be reviewed live in the
// app before the real pilot set (Back Squat, RDL, Bench Press) is authored
// and this entry is replaced with reviewed, accurate data.
export const MOVEMENT_DEMOS = {
  'back-squat': {
    name: 'Back Squat',
    primaryMuscles: ['quadriceps', 'glutes'],
    secondaryMuscles: ['hamstrings', 'back'],
    phases: [
      {
        label: 'Set-up',
        cues: [
          'Bar on traps, not neck',
          'Brace core, chest tall',
          'Feet shoulder width',
        ],
        primaryMuscles: ['abdominals'],
        secondaryMuscles: ['back'],
        pose: {},
      },
      {
        label: 'Eccentric',
        cues: [
          'Sit back and down',
          'Knees track over toes',
          'Control the descent',
        ],
        primaryMuscles: ['quadriceps'],
        secondaryMuscles: ['glutes', 'hamstrings'],
        pose: { torso: 8, hipL: 45, hipR: 45, kneeL: 70, kneeR: 70 },
      },
      {
        label: 'Concentric',
        cues: [
          'Drive through the floor',
          'Explosive hip extension',
          'Chest stays tall',
        ],
        primaryMuscles: ['glutes', 'quadriceps'],
        secondaryMuscles: ['hamstrings'],
        pose: { torso: 4, hipL: 20, hipR: 20, kneeL: 30, kneeR: 30 },
      },
    ],
  },
};
