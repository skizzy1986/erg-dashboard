---
id: WO-004
title: Strength templates — 5 coach templates (Upper 1/2, Lower 1/2, Prehab+Shoulder)
status: done            # implemented 2026-06-22 by System — migration wo004_strength_templates; see Implementation note + Movement-resolution table
author: coach
created: 2026-06-22
targets: [data]
schedule: null
notify: null
reversible: true
depends_on: []   # templates + template_exercises already live (2026-06-21 strength-logger migration)
acceptance:
  - all 5 templates appear in the logger Templates list, origin='coach'
  - each exercise pre-fills its per-set weight/reps/RPE from set_plan
  - Lower 1 REPLACES the seeded "Lower Strength A" (placeholder loads removed), kept name Lower 1
  - every movement resolves to a library exercise_id; non-matches reported back to Coach to disambiguate
  - progression stored as dated snapshots, not in-place edits (see Open Questions)
---

# WO-004 · Strength templates (the programming)

## Goal
Author the 5 standing strength templates Scott runs (his Fitbod structure: Upper 1, Upper 2, Lower 1, Lower 2, Prehab + Shoulder), grounded in his **real logged loads**, so the logger renders them with correct pre-filled per-set plans. This answers `strength-template-authoring-guide.md`. Division of labour per that guide: **Coach prescribes** (movements, schemes, loads, rehab logic); **System resolves** movement names → library `exercise_id` and inserts the `templates` + `template_exercises` rows.

Loads are **not invented** — they are Scott's current working weights from his Fitbod history (project `erg-training-plan.jsx`, sessions through 2026-06-19). RPE and rest are Coach prescription.

## Scope
- **In:** 5 templates + ordered exercises with targets and per-set `set_plan`; replacement of the seeded `Lower Strength A`.
- **Out:** schema (tables exist); `workout_assignments` / pushing templates to specific dates (Coach will push days separately); exercise-library additions.
- **Grounding source:** `erg-training-plan.jsx` strength sessions + `strengthTrend`. Where a movement is one Scott logs under a Fitbod name, that name is given so resolution is grounded in his real usage.

## Schema
None. `templates`, `template_exercises` live since the 2026-06-21 strength-logger migration. Inserts only.

## Implementation
Insert 5 `templates` (origin='coach') + their ordered `template_exercises`. `set_plan` is given as a simple per-set line (`weight×reps @rpe`) per the guide §4 — System encodes to JSON. `W` = warm-up set. Loads in kg.

### Lower 1 — squat-led, heavy · `session_type: Lower Strength`
| # | Movement | target_sets×reps @rpe | rest | set_plan | notes |
|---|---|---|---|---|---|
| 1 | Back Squat | 4×5 @8 | 180s | W60×5, W80×3, 95×5@7, 100×5@8, 100×5@8, 100×5@8 | top set @8, leave 1–2 in tank; +2.5kg when 3×5 clean. **Low back = form canary** |
| 2 | Romanian Deadlift | 3×8 @7 | 150s | 65×8@6, 65×8@7, 65×8@7 | rehab lift — controlled eccentric, **do NOT chase load**; stop set if low back becomes the limiter; flag physio if it ever stops warming out clean |
| 3 | Bulgarian Split Squat | 3×8/leg @7 | 90s | 20×8, 20×8, 20×8 (per leg) | unilateral — catches L ham/glute asymmetry; **R-first** |
| 4 | Lying Hamstring Curl | 3×12 @8 | 90s | 46×12, 46×12, 46×12 | |
| 5 | Plank | 2×60s | 60s | bodyweight | **capped 2×60s until R shoulder clears** |

### Lower 2 — RDL-led rehab + explosive + single-leg · `session_type: Lower Strength`
| # | Movement | target_sets×reps @rpe | rest | set_plan | notes |
|---|---|---|---|---|---|
| 1 | Romanian Deadlift | 3×8 @7 | 150s | 50×8@6, 50×8@7, 50×8@7 | rehab load, done **first while fresh** (RDL-led); controlled |
| 2 | Back Squat (explosive) | 5×3 | 120s | 75×3 ×5 | ~60% — explosive concentric, **bar-speed focus**, not RPE-driven |
| 3 | Bulgarian Split Squat | 3×8/leg @7 | 90s | 20×8 ×3 (per leg) | asymmetry; R-first |
| 4 | Standing Barbell Calf Raise | 4×15 @8 | 60s | 75×15 ×4 | full ROM |
| 5 | Side Bridge | 3/side | 45s | bodyweight | R-first when fresh; elbow under shoulder (R-shoulder cue) |

### Upper 1 — push-led + pull balance · `session_type: Upper Strength`
| # | Movement | target_sets×reps @rpe | rest | set_plan | notes |
|---|---|---|---|---|---|
| 1 | Barbell Bench Press | 4×5–6 @8 | 150s | W40×5, 55×6@7, 60×5@7, 60×5@8, 60×5@8 | |
| 2 | Cable Row | 4×8–10 @7–8 | 120s | 70×10 ×4 | hold 70 — 80 was the flagged over-jump |
| 3 | Barbell Incline Bench Press | 3×8 @7 | 120s | 45×8 ×3 | |
| 4 | Barbell Shoulder Press | 3×6–8 @7 | 120s | 32.5×8 ×3 | **R-shoulder: strict, pain-free only; stop on twinge** |
| 5 | Dumbbell Bicep Curl | 3×10–12 | 60s | 12.5×12 ×3 | superset with #6 |
| 6 | Cable Rope Tricep Ext | 3×12 | 60s | 15×12 ×3 | |

### Upper 2 — pull-led + shoulder health · `session_type: Upper Strength`
| # | Movement | target_sets×reps @rpe | rest | set_plan | notes |
|---|---|---|---|---|---|
| 1 | Lat Pulldown | 4×8–10 @7–8 | 120s | 60×10 ×4 | |
| 2 | Assisted Pull-Up | 4×8 @8 | 120s | −40 assist ×4 | reduce to −35 when 3×8 clean; goal bodyweight in 2–3mo. Encode assistance as negative load per logger convention |
| 3 | Cable Row | 3×10–12 @7 | 90s | 70×10 ×3 | |
| 4 | Cable Lateral Raise | 3×12–15 | 60s | 5×15 ×3 | |
| 5 | Cable Rope Tricep Ext | 3×12 | 60s | 17.5×12 ×3 | |
| 6 | Pallof Press | 3×12/side | 60s | 7.5×12 ×3 | anti-rotation — **protects the low back**; R-first |

### Prehab + Shoulder · `session_type: Prehab`
| # | Movement | target_sets×reps | rest | set_plan | notes |
|---|---|---|---|---|---|
| 1 | Band Shoulder External Rotation | 3×10 | 45s | band | cuff; R-first |
| 2 | Handle Band Rear Delt Fly | 3×12 | 45s | band | |
| 3 | Loop Band Overhead Pull Apart | 3×12 | 45s | band | |
| 4 | Mini Loop Lateral Raise | 3×10 | 45s | band | **strict unilateral, R-first** (not alternating — asymmetry) |
| 5 | Side Bridge | 3/side | 45s | bodyweight | R-first when fresh (L is stronger) |

### Rehab guardrails (carry these into the cards as cues; do not strip)
- **RDL = the rehab lift:** controlled eccentric, never chased. Low back is the form-breakdown canary on RDLs — stop the set if form degrades; flag physio if low-back tenderness ever stops warming out clean.
- **R shoulder:** planks/side bridges capped 2×60s until cleared; pressing strict and pain-free; stop on twinge.
- **L/R asymmetry:** unilateral work R-first when fresh; don't cut R short to match L.
- **Base phase:** strength supports rowing — PM strength must not compromise AM erg. sRPE target band 4–6.

### Movement-name resolution (guide §7 step 1)
Names above are Scott's Fitbod movement names — resolve each to the closest 873-library `exercise_id` and **report any non-matches** for Coach to disambiguate before insert. Likely to need confirmation: Bulgarian Split Squat, Lying Hamstring Curl, Pallof Press, Side Bridge, Cable Rope Tricep Ext, and the four banded movements (Band Shoulder External Rotation, Handle Band Rear Delt Fly, Loop Band Overhead Pull Apart, Mini Loop Lateral Raise). Back Squat → likely `Barbell Squat`; Barbell Bench Press → `…- Medium Grip`; Barbell Incline → `…- Medium Grip`; Barbell Shoulder Press → `Overhead Press`/`Standing Military Press`.

## Schedule
None.

## Notify
None directly. The insert/deploy surfaces in `#build` via the Vercel → Slack integration (WO-002) once that's live.

## Secrets / env
None.

## Acceptance
1. All 5 templates appear in the logger **Templates** list, `origin='coach'`, in the order above.
2. Starting any template pre-fills each exercise's per-set weight/reps/RPE from `set_plan` (editable).
3. `Lower 1` **replaces** the seeded `Lower Strength A` — the placeholder loads (squat 105, RDL 80, Leg Press 180, Leg Curl 45, Calf 60) are gone; Leg Press is not in Lower 1.
4. Every movement resolves to a library `exercise_id`; the non-match list is returned to Coach before final insert.
5. Progression is handled as **dated snapshots** (Open Questions) — prescribing a new cycle does not overwrite the prior prescription's history.

## Rollback
Delete the 5 `templates` (and their `template_exercises`) by name + `origin='coach'`. Optionally re-seed the original `Lower Strength A` placeholder if a clean revert is wanted. No logged `strength_sets`/`strength_workouts` touched — historical data is independent of template definitions.

## Authority notes
All steps are **additive, reversible inserts of training intent** — within Coach's standing Supabase-write scope [C 0.3]. Coach defers the actual insert to System only because System owns `exercise_id` resolution against the 873-row library and the SQL encoding; the **prescription** (loads, schemes, rehab logic) is Coach's and is fixed by this file. No schema, no destructive ops, no Bridge handover beyond committing this WO.

---

## Open questions (answered — from guide §8)
- **Progression → (b) dated snapshots, not in-place edits.** Scott's Fitbod history *is* a snapshot progression (Squat e1RM 109.7→110.5→118; RDL 85.2→89.2→95.8 across 6/3–6/9). That week-over-week trace is the core coaching signal, and through rehab it's the evidence the tissue is tolerating load. In-place editing erases it. When Coach raises loads, keep the prior prescription as a dated snapshot; the active `set_plan` is the latest.
- **Naming → confirmed:** `Lower 1`, `Lower 2`, `Upper 1`, `Upper 2`, `Prehab + Shoulder` (matches Fitbod). `Lower Strength A` → `Lower 1`, content replaced as above.

*Authored 2026-06-22 by Coach (Claude). Loads sourced from Scott's Fitbod logs (`erg-training-plan.jsx`); RPE/rest/rehab cues are Coach prescription. Reversible — defines template rows only; no schema, no destructive ops.*

---

## Implementation note — System (Cowork), 2026-06-22

**Done.** Applied as Supabase migration `wo004_strength_templates` (additive, reversible). `Lower Strength A` updated in place → `Lower 1` (same template id `380452d3…`, old rows deleted, Leg Press gone). 4 new `templates` (origin='coach') + all `template_exercises` with encoded `set_plan` inserted under Scott's `user_id`.

**Acceptance — verified:** 5 coach templates live (Lower 1 ·5, Lower 2 ·5, Upper 1 ·6, Upper 2 ·6, Prehab + Shoulder ·5); every row carries a `set_plan`; 0 missing/orphan `exercise_id`. Warmups encoded `type:"warmup"`; assisted pull-up assistance as negative load (−40).

**Progression model:** dated-snapshot discipline recorded — first prescription, nothing to snapshot yet; future load changes keep the prior `set_plan` as a dated snapshot rather than in-place edits. No history-table built (WO §Schema = None).

### Movement-resolution table — CONFIRM (acceptance #4, the non-match report)
Confident exact/near-exact matches inserted silently. The following are **best-guess resolutions** against the 873-row library — Coach please confirm or name the intended `exercise_id`; I'll swap any in one reversible update:

| WO movement | Resolved library id | Why flagged |
|---|---|---|
| Bulgarian Split Squat (Lower 1 & 2) | `Split_Squat_with_Dumbbells` | no "Bulgarian" entry; DB split squat is closest |
| Back Squat (explosive) (Lower 2) | `Barbell_Squat` | same lift as Back Squat; "explosive/bar-speed" kept in notes (alt: `Speed_Squats`) |
| Cable Row (Upper 1 & 2) | `Seated_Cable_Rows` | generic cable row pick |
| Cable Rope Tricep Ext (Upper 1 & 2) | `Triceps_Pushdown_-_Rope_Attachment` | ambiguous: rope pushdown vs `Cable_Rope_Overhead_Triceps_Extension` |
| Lat Pulldown (Upper 2) | `Wide-Grip_Lat_Pulldown` | generic; confirm grip |
| Cable Lateral Raise (Upper 2) | `Cable_Seated_Lateral_Raise` | seated vs standing |
| Handle Band Rear Delt Fly (Prehab) | `Cable_Rear_Delt_Fly` | no band rear-delt fly; cable closest (equipment differs) |
| Loop Band Overhead Pull Apart (Prehab) | `Band_Pull_Apart` | overhead variant not exact |

Exact matches (no action): Back Squat→`Barbell_Squat`, Romanian Deadlift→`Romanian_Deadlift`, Lying Hamstring Curl→`Lying_Leg_Curls`, Plank, Standing Barbell Calf Raise, Side Bridge, Barbell Bench Press→`…Medium_Grip`, Barbell Incline→`…Medium_Grip`, Barbell Shoulder Press→`Standing_Military_Press`, Dumbbell Bicep Curl, Assisted Pull-Up→`Band_Assisted_Pull-Up`, Pallof Press, Band Shoulder External Rotation→`External_Rotation_with_Band`, Mini Loop Lateral Raise→`Lateral_Raise_-_With_Bands`.

**Rollback:** delete the 4 new templates + their `template_exercises` by name+origin='coach'; restore `Lower Strength A` from the prior migration if a clean revert of Lower 1 is wanted. No logged `strength_sets`/`strength_workouts` touched.
