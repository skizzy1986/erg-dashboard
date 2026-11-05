# Changelog

## v3: perfect form, phases, coaching tool (2026-11-04)
- **Upper back and arms:** shoulder blades retracted 12°. Arm re-solved with ISB limits (ER 90°, elevation 27°, plane −31°, elbow 130°). Wrist within 6° of straight (v2 had about 18° radial deviation and about 100° ER). Full grip at 79 cm with the thumb around the bar. Deltoid and pectoralis major rebuilt from rest anatomy with dual-quaternion skinning, which removes the flat "plank" artefacts.
- **Bar path:** the trunk is re-balanced so the bar stays over midfoot at every depth (δ −1.6° to +4.1°). Trunk lean at depth goes from 35° to 28°, matching the shin at 30°. The centre of pressure now follows the system centre of mass (48% → 31% of foot length).
- **Kinetics:** recomputed with de Leva parameters. The hip-to-knee moment ratio at depth is 1.15 (high-bar reference about 1.2).
- **Phases:** a timed reference rep (lowering 1.63 s, bottom 0.30 s, drive 0.92 s, mean drive speed 0.61 m/s). Ground force from the system centre-of-mass acceleration (0.74–1.38×). Dynamic moments. A sticking region placed where the literature puts it. Contraction mode per muscle per phase from length trend. Separate lowering and drive activation.
- **UI:**
  - Rep timeline graphs (angles, moments, force and speed, activation, muscle length) with drag-to-scrub playhead.
  - A 10-item form check with cited targets, and a coaching guide (phases, metrics and targets, measured rep, method and limits, sources).
  - An importer for OpenCap `.mot` and bar-velocity CSV, a centre-of-pressure ring on the floor, phone layout and dark mode.

## v2: refinement for accuracy
- BodyParts3D anatomy on Rajagopal/Lai OpenSim kinematics. Fixes for forearm artefacts, bar penetration and grip. EMG-calibrated activation and role texts for 118 muscles. The centre of mass was held over midfoot, which put the bar 4 cm in front of midfoot at depth.

## v1: initial three.js model
- Skeleton and musculature of a high-bar back squat with depth playback.
