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
// (see plan step 3). Left empty here so the pipeline (modal, fallback,
// slug matching) can be wired and verified before any pose data exists.
export const MOVEMENT_DEMOS = {};
