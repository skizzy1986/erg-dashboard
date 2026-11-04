# OpenCap lab-validation data: what it holds and what it can support

An assessment of the OpenCap **LabValidation_withoutVideos** dataset, downloaded from
SimTK (<https://simtk.org/projects/opencap>). This was done on 2026-11-04 as a candidate
measured baseline for `/squat` (the research brief's v2 data strategy, and PR4 of
#382).

**No data from this dataset is committed to the repository**, because its licence
terms are not yet verified (see *Licence* below). This page records findings only.

## Inventory

- **Subjects:** 10 (`subject2` to `subject11`). The paper's cohort is 6 female and
  4 male, age 27.7 ± 3.8, mass 69.2 ± 11.6 kg, height 1.74 ± 0.12 m.
- **Squat trials:** `squats1` (five natural squats) and `squatsAsym1` (asymmetric, with
  reduced force under the left foot).
- **Per subject:** `sessionMetadata.yaml`, `EMGData/`, `ForceData/`, `MarkerData/`, and
  `OpenSimData/{Mocap,Video}/`.
  - The Mocap folder holds `Model` (scaled `.osim`), `IK` (`.mot` joint angles),
    `ID` (joint moments), `SO` (static-optimisation muscle activations) and `JR`
    (joint reactions).
  - Video-derived IK exists for several pose estimators (OpenPose default and high
    accuracy, HRNet). There is no Video SO or ID.
- **Model:** `LaiArnoldModified2017_poly_withArms_weldMTP_weldHand`, the high-flexion
  model the research brief recommends.
- **Format:** IK `.mot` is 100 Hz with `inDegrees=yes`. It has pelvis (6 DOF),
  hip, knee, ankle, subtalar and mtp per leg, lumbar (3), and arms.

## Squat kinematics at the bottom of each rep (Mocap IK)

Reps were segmented at local minima of `pelvis_ty`. Only 4 of the 10 subjects were
opened.

| Subject | Hip flexion R | Knee R | Ankle R | Depth |
|---|---|---|---|---|
| s2 (M, 1.96 m) | 109° | 79° | 20° | ~38 cm (19% of height) |
| s3 (F, 1.69 m) | 100° | 100° | 37° | ~35 cm (21%) |
| s5 (M, 1.85 m) | 90° | 103° | 36° | ~39 cm (21%) |
| s8 (F, 1.64 m) | 105° | 102° | 31° | ~36 cm (22%) |

- **Within a subject, reps are consistent:** joint SDs are about 1–5°.
- **Between subjects, they are not.** Knee ranges 79–103°, hip 90–109° and ankle
  20–37°.
- **Pelvis tilt and lumbar extension have per-subject zero offsets.** Normalise them
  before comparing.

## Muscles

- **Measured EMG** has 16 channels: soleus, gastrocnemius medialis, tibialis anterior,
  rectus femoris, vastus medialis and lateralis, semitendinosus, biceps femoris long
  head and gluteus medius. It is unitless and normalised to maximum-activation trials.
  - **Gaps:** no gluteus maximus, adductors or erector spinae.
  - **Timing:** the vasti are sustained, and the hamstrings rise late in the drive.
- **Static-optimisation activations** cover 93 Lai-Arnold muscles, but they saturate
  at 1.0 near the bottom.
  - **They disagree with the measured EMG:** SO puts the hamstrings and glutes
    near-maximal at the bottom, while the EMG shows the hamstrings late.
  - **No trunk muscles:** the lumbar extension moment is carried by a reserve
    actuator.
- **Joint moments at the bottom (s2):** hip extension about 1.9 N·m/kg, knee extension
  about 1.0 N·m/kg, lumbar extension about 3.1 N·m/kg.

## What it can and can't support

| Use | Verdict |
|---|---|
| Lower-limb reference **ranges** for a measured overlay (PR4, measured bands) | **Yes.** Show ranges or individual traces, not a mean ± SD "norm". Legs only. |
| Replacing `/squat`'s estimated activation model | **No.** SO saturates and disagrees with the EMG, and the EMG lacks key muscles. |
| Calibrating the activation model's **ordering and timing** | **Yes**, as a check. Vasti > hamstrings > calves, with the hamstrings late in the drive. |
| Loaded high-bar curves (trunk, depth, bar position) | **No.** These are **bodyweight** squats with the arms raised forward. |
| Phone-capture error (Video vs Mocap IK) | **Yes**, for the PR4 importer. |

## Licence and citation

- **Licence:** SimTK lists the downloads under an **"Apache 2.0 Use Agreement"**. The
  full terms were not retrieved, and the dataset folder has no licence file.
  **Verify the SimTK download agreement before showing any of these values on a
  public page.**
- **Citation:** Uhlrich SD, Falisse A, Kidziński Ł, et al. *OpenCap: Human movement
  dynamics from smartphone videos.* PLOS Computational Biology 19(10): e1011462 (2023).
  <https://doi.org/10.1371/journal.pcbi.1011462>. SimTK also asks for the 2022 bioRxiv
  preprint, <https://doi.org/10.1101/2022.07.07.499061>.
