# Roadmap: candidate PRs

Ordered by how much each one improves trust in the numbers per unit of work. Each item lists the reason, scope and done criteria. Keep PRs small: one item per PR, and split the larger ones.

## 1. Pipeline hygiene (done, #402)
- **Why:** the `exec` chains with shared globals make every later PR slower and riskier.
- **Scope:** turn `pipeline/v3/*.py` into an importable package (`squat/`) with explicit inputs and outputs per stage, add a CLI (`python -m squat build|stage <name>`) and pin `requirements.txt`. Add a golden test that rebuilds `dist/squat.html` and compares hashes, plus a pytest per stage for shapes and key numbers (for example δ at the bottom is about +4.1°, mean drive speed about 0.61 m/s, peak force about 1.38×).
- **Done when:** the rebuild's decompressed data sha256 and parsed manifest match what `/squat` ships (the gzip stream is zlib-dependent, so not the HTML bytes; Gate 1, #402; stage pins exact on the reference machine, within tolerance elsewhere), `pytest` passes, and no script uses `exec`. **Done:** `squat/`, `tests/`, `.github/workflows/ci-pipeline.yml`.

## 2. Overlay the OpenCap lab validation set (measured bands)
- **Why:** this turns modelled curves into curves you can compare against measurements.
- **Scope:** a pipeline stage that reads the OpenCap `LabValidation_withoutVideos` squat trials (marker-based inverse kinematics `.mot`, inverse dynamics `.sto`, force plates and EMG). It segments reps into lowering, bottom and drive, time-normalises each phase onto the reference rep, and stores mean ± SD bands in `META.ref_bands`. The UI draws them as shaded bands on Joint angles, Joint moments, Force and EMG, labelled "bodyweight squats, n = …".
- **Done when:** the bands render on all three layouts, the legend states the source and load, and the EMG band shows lowering below driving for the vasti and glutes.

## 3. Harden the measured-rep importer
- **Why:** this is the part a coach will use with their own athletes.
- **Scope:**
  - Verify OpenCap sign conventions (`pelvis_tilt`, `lumbar_extension`) against a real file and fix the trunk-lean formula.
  - Choose left or right side and pick which rep to analyse.
  - Add force-plate CSV (ground force and centre of pressure) and bar-path CSV from video tracking (x, y per frame), which feed the bar-over-midfoot and whole-foot checks.
  - Export the summary as copyable text (artifacts cannot download files).
- **Done when:** every currently "Not in the measured file" check can be computed from at least one supported file type, using the `samples/` fixtures.

## 4. Kinetics upgrade
- **Why:** quasi-static kinetics scaled by vertical acceleration underestimates inertial effects in fast or bouncy reps.
- **Scope:** Newton–Euler inverse dynamics on the sagittal chain with de Leva inertias, horizontal ground force, and centre of pressure from dynamics. Keep the quasi-static result as a comparison series.
- **Done when:** moments match the current values within 5% for the slow rep, and peak values for a faster rep are documented.

## 5. Muscle mechanics from OpenSim
- **Why:** the muscle lengths come from skinning curves, with known artefacts (vasti past about 100° knee flexion, deep rotators).
- **Scope:** compute musculotendon lengths and moment arms with the OpenSim API (Rajagopal + Lai model) over the rep kinematics. Optionally run static optimisation for activations and replace the heuristic in `act3.py`, keeping the heuristic as a fallback.
- **Done when:** `len[]` is monotonic where anatomy says it should be, and activations are documented against the v2 EMG calibration sources.

## 6. Variants: low-bar, front squat, stance and anthropometry
- **Why:** coaching is comparative, so show how bar position and proportions change lean, knee travel and the hip-to-knee ratio.
- **Scope:** presets with a bar seat position, grip, trunk solve (bar over midfoot) and an optional femur-to-torso scale. Reference targets per variant come from Glassbrook and Wretenberg (low-bar hip-to-knee ratio about 2.3).
- **Done when:** a preset switcher appears, and the form check targets change per variant with citations.

## 7. Fault library and side-by-side
- **Why:** coaches teach from contrasts.
- **Scope:** kinematic perturbations for knee valgus, pelvis tuck at depth, hips rising first, heel lift and bar drifting forward. A ghost overlay of the ideal rep and the form check flagging each fault.
- **Done when:** each fault fails exactly the checks it should, and the guide links each fault to its cue.

## 8. Load and tempo controls
- **Scope:** a %1RM slider that sets mean drive speed from the Sánchez-Medina table, deepens the sticking dip near 1RM, and scales moments with bar mass. An eccentric tempo control.
- **Done when:** at 1RM the mean drive speed is about 0.32 m/s and the sticking region is clearly visible.

## 9. Grip width and shoulder trade-off
- **Scope:** a grip-width slider with a small in-browser solver (or precomputed table) showing shoulder external rotation, elbow flexion and wrist deviation as the grip narrows. This makes "widen the grip if rotation is limited" visible.

## 10. Accessibility and performance
- **Scope:** a data table view for each chart, roving tabindex on tab lists, form-check rows reachable as list buttons, decoding in a Web Worker, and a smaller payload (int8 colours, fewer curve samples).
