# SplitIQ `/squat` — Research & Engineering Brief

**Scope:** High-bar back squat 3D coaching model (three.js), `/squat` tool in the `erg-dashboard` repo
**Status:** v1 built from literature only. v2 to integrate OpenCap measured data and tighten source traceability.
**Principle:** Every displayed value must trace to a public source. No hand-tuned angles.

---

## 1. Objective

Bring the model as close as publicly available research allows to a **loaded high-bar barbell back squat**, to a standard credible for biomechanics and sport-science use.

---

## 2. Data strategy (hybrid)

No large open, raw, time-series 3D mocap dataset of **loaded high-bar back squats** has been identified. Barbell studies mostly publish summary values (peak angles, ROM, bar velocity), and raw data is typically available only on request. The approach is therefore:

| Layer | Source | Provides |
|---|---|---|
| Curve **shape** and coordination | OpenCap LabValidation (marker mocap, bodyweight squats, n=10) | Time-series hip/knee/ankle/pelvis/lumbar angles, joint sequencing, between-subject variability |
| Curve **targets** (calibration) | Barbell literature (Wretenberg 1996, Glassbrook 2017/2019, Giustino 2024) | High-bar peak angles at bottom position, load-dependent changes, bar kinematics |
| Rig geometry | Lai-Arnold high-flexion OpenSim model; subject-scaled `.osim` from OpenCap | Joint axes, segment lengths, valid deep-flexion behaviour |

**Known limitation (must be shown in Method and limits):** OpenCap squats are bodyweight. Trunk inclination, depth tendency and upper-body position under a bar come from literature, not measured curves. Upper-body accuracy of OpenCap is also substantially lower than lower-body accuracy (published overhead-squat validation: lower-body RMSE ~5°, upper-body ~37°). Use OpenCap for lower-limb pattern only.

---

## 3. OpenCap LabValidation — extraction pipeline

Dataset: https://simtk.org/projects/opencap (downloaded locally; folder structure to be confirmed on inspection).

### 3.1 Files to locate per subject
| Extension | Content | Use |
|---|---|---|
| `.mot` (IK folder, **Mocap** version) | Inverse kinematics joint angles | Primary input — ground truth |
| `.mot` (IK folder, **Video** version) | Video-derived IK | Later: quantify phone-capture error vs mocap |
| `.osim` | Subject-scaled model (XML) | Segment lengths, joint offsets, axis definitions |
| `.trc` | Marker trajectories | Validation overlays, bar-path proxy |
| force / ID `.mot`/`.sto` | GRF, joint moments | Future kinetics |

Use squat trials only (e.g. `squats1`...). Use the **Mocap** IK as ground truth.

### 3.2 Reading `.mot`
Tab-delimited text with header ending at the line `endheader`. Check `inDegrees=yes`.

```python
import pandas as pd

def read_mot(path):
    with open(path) as f:
        for i, line in enumerate(f):
            if line.strip().lower() == "endheader":
                break
    return pd.read_csv(path, sep="\t", skiprows=i + 1)
```

Columns of interest: `time`, `pelvis_tilt`, `pelvis_tx/ty/tz`, `hip_flexion_r/l`, `hip_adduction_r/l`, `hip_rotation_r/l`, `knee_angle_r/l`, `ankle_angle_r/l`, `lumbar_extension`. Rotations in degrees, translations in metres.

### 3.3 Processing steps
1. **Segment reps:** local minima of `pelvis_ty` = bottom of rep; split stand → bottom → stand.
2. **Time-normalise** each rep to 101 samples (0–100% cycle).
3. **Aggregate:** mean ± SD per joint across reps and subjects.
4. **Calibrate:** scale/offset lower-limb curves so bottom-position peaks match high-bar literature targets (Section 4). Keep the uncalibrated curves for audit.
5. **Export JSON** for three.js: per joint, 101 samples, radians, with `source` and `calibrated: true/false` metadata.

### 3.4 three.js mapping
- OpenSim and three.js are both Y-up; still verify each joint's rotation axes and order from `<CustomJoint>` → `<SpatialTransform>` in the `.osim`.
- Segment lengths from `.osim` body/joint offsets, not artistic proportions.
- Wrong axis order produces plausible but incorrect poses — covered by tests (Section 7).

---

## 4. Calibration sources (barbell-specific, public)

- **Glassbrook DJ et al. — "The high-bar and low-bar back-squats: a biomechanical analysis", JSCR** (open full text, AUT repository: https://openrepository.aut.ac.nz/items/dfd50d9d-184a-470b-a677-0039c63c55bd/full). High-bar vs powerlifters: hip angles 16–21% larger, knee angles 10–12% smaller; high-bar suited to a more upright torso.
- **Glassbrook DJ — MSc thesis, AUT** (https://openrepository.aut.ac.nz/handle/10292/9819). Quantitative literature review — aggregator of HBBS values across studies.
- **Giustino V et al. 2024 — "Kinematic analysis of the back squat at different load intensities in powerlifters and weightlifters", Front Sports Act Living, doi:10.3389/fspor.2024.1454309** (CC BY). Hip/knee/ankle angles and bar kinematics at 60–100% 1RM; hip relative angle at max flexion decreases as load increases. Use for load-dependent behaviour.
- **Lai-Arnold high-flexion model** (https://simtk.org/projects/model-high-flex/). Older Gait2392-type models are flagged as potentially inaccurate at high knee flexion.
- **ARED squat simulation (SimTK: https://simtk.org/home/aredsimulation)**. Loaded shoulder-bar squat on a spaceflight device — cross-check only, not primary.

**Action:** build a referenced parameter table — bottom-position hip, knee, ankle, trunk (high-bar), mean ± SD, population, load %, source.

---

## 5. Audit of current source list (v1)

### 5.1 Scientific weak points
| # | Issue | Action |
|---|---|---|
| 13 | EMG "activation formulas" pooled from 4 studies with differing electrode placement, normalisation (MVIC vs peak dynamic) and loads. EMG amplitude ≠ muscle force. | Label as indicative, or replace with joint-moment-based muscle demand / Bryanton et al. 2012 (relative muscular effort vs depth and load). |
| 9 | "Mode factor 0.62" attributed to Enoka 1996. The principle (lower eccentric activation at equal load) is supported; a single constant is not given by a review. | Document derivation in Method and limits, or replace with a sourced value. |
| 11 | Only ISB Part II (Wu 2005, upper limb) cited. Lower-limb and spine conventions — the core of the tool — have no source. | Add **Wu G et al. 2002, ISB Part I (ankle, hip, spine), J Biomech 35:543–548**. |

### 5.2 Citation hygiene
- **#5** conflates three works: the 2017 JSCR review (Glassbrook, Helms, Brown, Storey, 31(9):2618–2634), the AUT MSc thesis (different title, earlier date), and the experimental HBBS/LBBS JSCR paper. Split into separate entries; verify dates.
- **#3, #4** have no authors — add.
- **#13** — give full citations for each EMG study.

### 5.3 Additions
- Fry AC, Smith JC, Schilling BK 2003 (JSCR) — knee position effects on hip/knee torques; supports "knee past toe line" check.
- Schoenfeld BJ 2010 (JSCR) — squat kinematics/kinetics review.
- Escamilla RF 2001 (MSSE) — knee biomechanics of the dynamic squat.
- Bryanton MA et al. 2012 (JSCR) — relative muscular effort vs depth and load.
- Giustino 2024 (above).

*Bryanton, Fry and Wu 2002 details are from memory — verify volume/pages before publishing.*

### 5.4 Checks
- **#14 Scherpereel 2023 (Sci Data):** confirm whether squats are loaded or bodyweight before using as a curve replacement.
- **Orphan targets:** every displayed target must map to a source number. Example needing confirmation: "Centre of pressure 48% → 31% of foot". Run a full target→source audit.

---

## 6. Data model (movement-agnostic)

Build `/squat` as one config so future movements are new configs, not new tools.

```
movement:
  skeleton:          joint definitions (ISB), axes, segment lengths
  reference_curves:  per joint, 101 samples, mean ± SD, source, calibrated flag
  phases:            descent / bottom / sticking region / ascent (boundaries)
  targets:           per metric: value, tolerance, source_id
  faults:            per fault: detection rule, threshold, severity, source_id
  cues:              per fault: coaching cue text
sources:             id, full citation, URL, licence, used_for
```

Industrial analogue: joints = instrument tags, reference curves = design curve, fault thresholds = alarm limits (H/HH), cues = alarm response procedures, pose input = field transmitters.

---

## 7. Verification

- **Kinematics unit tests:** fixture poses with known angles (e.g. thigh parallel) → expected joint angle values within tolerance. Run on every change.
- **Data pipeline tests:** reading a known `.mot` returns expected columns/units; rep segmentation count matches trial.
- **Visual regression:** screenshots of key frames (stand, bottom, sticking region, lockout) diffed against approved baselines.
- **Independent review:** source/target audit done by a reviewer who did not build the feature.

---

## 8. Future: user video input

- Browser: MediaPipe Pose / BlazePose (JS, sits alongside three.js).
- Backend: RTMPose / MMPose (more accurate).
- Single-camera sagittal view is weak on frontal-plane faults (valgus, hip shift) — require two views or state the limitation.
- Compare user curves against the reference band only after v2 calibration is complete.

---

## 9. Priority order

1. Inspect the LabValidation download; confirm squat IK files exist.
2. Build extraction pipeline → reference bands JSON.
3. Build referenced high-bar parameter table; calibrate.
4. Fix source list (Section 5); target→source audit.
5. Tests (Section 7).
6. Generalise schema (Section 6).
7. Video input (Section 8).
