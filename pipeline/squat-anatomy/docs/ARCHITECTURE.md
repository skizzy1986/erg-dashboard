# Architecture

## 1. The page

One HTML file, no build tooling at runtime. `page/*` (assembled in memory by `squat/page.py`, or to `page/template.html` by `page/assemble.py`) holds the head, CSS, markup and script. `squat/repack.py:save()` injects two script tags:

| Tag | Content |
|---|---|
| `<script id="squat-manifest" type="application/json">` | Every binary array's offset, count, dtype and shape, plus `meta` (all model metadata), `st_meta` and `sa_meta` (dequantisation constants). |
| `<script id="squat-data" type="application/octet-stream">` | base64(gzip(level 9, mtime 0)) of all arrays concatenated with 8-byte alignment. The page decodes it with `DecompressionStream('gzip')`. |

Dtypes: `<i2` Int16, `|u1` Uint8, `<u2` Uint16, `<u4` Uint32, `<f4` Float32, `|i1` Int8. Positions are int16 quantised: `value * s + c` (per group `c`, `s`).

### Coordinates and sampling

- Metres. +x anterior (the lifter faces +x), +y up, +z to the lifter's right. The floor is y = 0.
- Right-side geometry is stored. The left side is the same mesh under a group with `scale.z = -1`. Midline (axial) meshes are not mirrored.
- **Depth parameter S**: 41 samples, `META.S = [0, 0.025, …, 1]`, from standing (0) to the bottom (1). Every per-depth table (frames, curves, readouts, activation, muscle length) uses this index. JS interpolates linearly between samples.
- **Frames**: `frames` is `[41, 11, 7]` Float32: position xyz plus quaternion xyzw for `META.frames = [pelvis_rest, L5, L4, L3, L2, L1, thorax, femur_r, patella_r, tibia_r, talus_r]`. Each maps rest-world coordinates to world at that depth. The femur origin is the hip joint centre. **The L5 origin is not the L5/S1 joint**; the pipeline uses `L5S1_REST` from the sacrum top. `META.static` holds fixed 4×4 transforms for `calcn_r` and `toes_r`, since the feet stay flat.

### Geometry sets

| Set | Arrays | Deformation |
|---|---|---|
| Bones | `bone_<g>_pos` (int16), `bone_<g>_idx` (uint16 triangles), `bone_<g>_id` (part id → `META.bones[g].names`) | Rigid, attached to `META.bones[g].frame`. `thoraxR` holds right arm, hand, scapula, clavicle, ribs and skull pieces in the thorax frame; `thorax` holds axial vertebrae, sternum and skull. |
| Curve-skinned muscles (leg and hip) | `cm_c1, cm_c2` (curve ids), `cm_w` (blend), `cm_s1, cm_s2` (arclength 0–4000), `cm_l1, cm_l2` (local offsets ×`META.LQ`), `cm_mid`, `cm_tw`, `cm_idx`; curves `cv_pos` (int16 ×5e-5 m, y offset +0.8), `cv_quat` (int16/32767), laid out `[curve][S][point]`; `META.curves[i] = {n, K, nseg, sig}` | Each vertex rides one or two muscle-path curves. Position is the curve point plus the rotated local offset, with cross-section scaled by `sig` per depth. Rebuilt every frame (`updateCurveSet`). |
| LBS trunk (abdominals, erectors, QL, latissimus) | `lb_pos`, `lb_i0` (frame index k), `lb_w` (weight between frames k and k+1 of `META.lbs.frames`), `lb_mid`, `lb_idx` | Linear blend between two adjacent trunk frames. |
| Static upper body (`st_*`, mirrored) and intercostals (`sa_*`, axial) | `*_pos`, `*_idx`, `*_mid`, `*_tw` | Posed once in the thorax frame; moves rigidly with the thorax. |

Per-vertex `*_mid` indexes `META.muscles`. `*_tw` (0–255) blends towards tendon colour.

### META (selected fields)

- `muscles[k]`: `name`, `role` (guide text), `tendon`, `act` = `[lowering[41], drive[41]]` uint8 (÷255 → 0–1, estimated), `len[41]` (musculotendon path length, % of standing, curve muscles only), `mode` (+1 lengthens on the way down, 0 near-isometric, −1 shortens; or `'brace'`, `'hold'`, `'stab'` for muscles without a tracked length).
- `readout[41]`: `knee`, `hip` (pelvis to femur), `ankle` (dorsiflexion), `lumbar` (flexion from standing), `lean` (hip centre to shoulder line from vertical), `shin` (ankle to knee from vertical), `thigh` (hip to knee from horizontal, + means the knee is above the hip), `depth` (hip joint centre minus knee joint centre, cm), `bar` (bar centre minus midfoot, mm), `bx` (bar centre, world), `cop` (centre of pressure, % of bony foot length from the heel), `lord` (lordosis between T12 and L5 disc normals), `klat` (patella centre lateral of the heel to second-toe line, cm), `Mhip`, `Mknee`, `Mank` (static, per leg, N·m), `Mlum` (static L5/S1, whole trunk).
- `rep`: timeline at `dt = 0.02 s`, with `s[]`, `ph[]` (0 brace, 1 lowering, 2 bottom, 3 drive, 4 lockout), `v[]` (bar vertical velocity, m/s), `f[]` (vertical ground force / system weight). Summary fields: `t_start`, `t_bottom`, `t_end`, `ecc`, `con`, `trans`, `mcv`, `vpk`, `vecc`, `fpk`, `fmin`, `D` (bar travel), `st` (the model's own velocity dip).
- `pd`: per-depth `fd` and `fa` (ground-force factor while lowering or driving) and `vd` and `va` (bar velocity).
- `arm`: ISB humerothoracic `er`, `elev`, `plane`, plus `elbow`, `wrist` (max deviation from straight), `grip` (hand-centre spacing, cm), `retraction`.
- `bw` 85, `mbar` 100, `bar {c, r}` (bar centre in the thorax rest frame), `cop` (midfoot target), `heel`, `tip`.

### Page script

- `page/3-core.js`: decode, renderer, lights, floor; frames (`frameAt`); bones; muscle sets (`makeSet`, `updateCurveSet`, `updateLBS`); barbell (follows the thorax frame); bar path trace, midfoot plumb line, centre-of-pressure ring; activation colour ramp (`actAt`, `recolor`).
- `page/4-ui.js`:
  - `repAt(t)` gives `{s, v, f, ph, asc}` and `dAt(s, key)` interpolates readouts.
  - Dynamic moments are `M_static(S) × f(t)`.
  - The muscle tooltip (`tipHtml`) gives contraction mode for the current phase, activation now against the other phase at the same depth, and length.
  - Also: the form check (`checksFor`), metrics table, guide, charts (`TABS`, `drawChart`, `updateChart`), measured-rep import (`parseTable`, `analyse`, `showMeasured`), `fitTimeline`, camera framing (`resize`), and the test hook `window.__squat`.

## 2. The pipeline (`squat/`, data in `pipeline/v3`)

The package `squat/` runs as `python -m squat build|stage <name>|list|verify`. `Paths.from_env()` resolves every path from the package location, never cwd: the data dir is `pipeline/`, overridden by `SQUAT_ROOT`. One `Context` builds each piece of model state once, lazily (`base`, `girdle`, `skin`, `arm`, `readouts`, `curves`, `kin`); STLs come in through `ctx.stl`, which `ctx.arm` (and so `ctx.kin`) uses for 6 files, and which `upper3` (8 more) and `regcur` (the 32 `BONE_FID` bones) read directly. `base`, `girdle`, `skin`, `readouts` and `curves` read none, which is why `lengths3` runs without STLs. Each stage is `squat/stages/<name>.py` with `compute()` (arrays in, a result dataclass out) and `run(ctx, in_dir, out_dir)`. The fixed inputs nothing here regenerates are pinned in `squat/inputs.py`. The data source of truth for meshes, curves and the v2 kinematics is `pipeline/v3/base.html`, the v2 page. Every v3 stage reads it and the build writes a new page from it.

The four stage caches reproduce byte for byte on the machine that generated them. On other CPUs, float results differ in the last bits (OpenBLAS/LAPACK pick kernels per CPU). So the stage tests pin shas and fall back to a numeric tolerance (`tests/_compare.py`, rtol 1e-7, atol 1e-9; integers, keys and shapes must still match exactly), and report the drift as a warning. The shipped data is built from the committed caches and is pinned exactly everywhere. Regenerate and commit a cache only when the change is intended, and note the machine in the commit.

| Stage | Module(s) under `squat/` | Output | What it does |
|---|---|---|---|
| Shoulder girdle | `model/girdle.py` (`girdle_p.npy`) | — | Scapular retraction about SC 12.0°, depression −2.6°, scapular rotations at AC. |
| ISB angles | `model/arm.py` | — | Thorax frame from IJ/PX/C7/T8, forced into the sagittal plane because the model is symmetric. Humerus frame from the head centre and epicondyles. YXY decomposition gives plane, elevation and external rotation. |
| Arm and hand solve | `model/arm.py`, `stages/ik3.py`, `stages/ik4.py` | `armik4_x.npy` | L-BFGS-B over 21 DOF (GH rotation vector, elbow, pronation, wrist flex and deviation, 12 finger joints, 2 thumb joints), relative to the v2 posed arm after retraction. Costs: bar penetration and snug grip (margins 6.5 mm metacarpals, 4.5 mm phalanges); wrist limits; ISB limits (ER ≤ 90°, elevation 25–65°, plane −45 to 10°, elbow ≤ 135°); grip target (MC3 z = 0.40 m); thumb wrapped round the bar. Result: ER 90°, elevation 27°, plane −31°, elbow 130°, wrist within 6°, grip 79 cm. |
| Upper body skin | `stages/upper3.py`, `build.py:apply_upper3`, `model/dqs.py`, `model/skin.py` | `upper3.npz` | Bones moved. `st` muscles get a corrective dual-quaternion skin from the v2 pose (`st_W.npy` proximity weights over 21 bone groups); same for the `lb` set. The deltoid (3 parts) and pectoralis major (3 parts) are rebuilt from the BodyParts3D STLs: decimated to 1.5× the old vertex count; origin and insertion sets found by 5 mm proximity; geodesic `t = d_o/(d_o+d_i)` (Dijkstra on the mesh graph); smoothstep blend between the origin bone and the humerus (rest → new, 115° humeral rotation); then DQS. The pec abdominal slip follows the sternocostal surface and is tucked 4 mm beneath it. `apply_upper3` quantises and pushes hand soft tissue out of the bar (≥ 0.6 mm). |
| Vertical bar path | `model/curves.py`, `stages/balance3.py` | `frames3.npy`, `deltas3.npy`, `hips3.npy`, `rows3.pkl` | Rotates the trunk chain (pelvis, L5–L1, thorax) about the hip axis so the bar is over midfoot at every depth: δ from −1.6° at the top to +4.1° at the bottom (+ is backward). Hip flexion readout = v2 − δ. Pelvis-attached leg-muscle curves rotate with per-point ramps (`fixed_alpha`). Readouts and kinetics are recomputed. |
| Kinetics | `model/kinetics.py` | — | de Leva (1996) male segment parameters for 85 kg, with a 100 kg bar. Top-down quasi-static moments; both arms projected to the sagittal plane. L5/S1 uses trunk mass minus the lower trunk (11.17% BW) plus head, arms and bar. The centre of pressure is the system centre of mass. |
| Muscle length | `stages/lengths3.py` | `mlen3.pkl` | Curve path length per curve-skinned muscle, weighted by binding, as % of standing. |
| Timed rep | `stages/phase3.py` | `phase3.npz` | Bar speed is defined in the height domain and integrated to time. Lowering: soft-min of an unweighting ramp (1.6 m/s²), a 0.47 m/s cruise and braking (0.9 m/s²). Drive: 4.2 m/s² out of the hole, 1.12 m/s cap and 2.9 m/s² deceleration, times a velocity dip (32%) centred 17.5 cm above the bottom. Smoothed with σ = 30 ms. Ground-force factor `f = 1 + a_COM/g`, using the system COM height at each depth. Result: lowering 1.63 s, drive 0.92 s, mean drive speed 0.61 m/s, ground force 0.74–1.38× system weight. |
| Activation | `model/activation.py` (called by `build.py`) | in `META.muscles[].act` | Moment-driven formulas (EMG-calibrated in v2) applied to dynamic moments, times a contraction-mode factor. The mode comes from the net length change from standing to S = 0.9 (±4%). While lowering: lengthening 0.62, shortening 1.0, near-isometric 0.82. While driving these reverse, with isometric 0.95. Both blend to 0.85 at the reversal. The drive uses a running maximum of `f` from the bottom up to the end of the sticking region (22 cm), so estimated effort does not fall when ground force dips there. The trunk is isometric (0.85 lowering, 1.0 driving). Upper-body holding muscles scale by `0.85 + 0.15 f`. |
| Assemble | `build.py` | `dist/squat.html` | Writes frames, curves, upper body, `readout`, `rep`, `pd`, `arm`, activation, `len` and `mode` into the manifest, then fills the template. |

## 3. Headless harness

`harness/shot.js` launches Chromium with SwiftShader (`--use-angle=swiftshader`). It replaces `requestAnimationFrame` with a queue stepped by `window.__step(n)`, routes `three.min.js` to `node_modules/three` r128, and stubs Google Fonts. `shot2.js` is the same with `DARK=1` for `colorScheme: 'dark'`. `probe.js` hovers screen points and prints the tooltip. `evalpage.js` evaluates an expression after load and prints page errors.

## 4. Known modelling limits (good PR targets)

- Kinetics are quasi-static scaled by vertical acceleration: no segment inertia, angular acceleration or horizontal ground force.
- With the bar held over midfoot, the centre of pressure ends about 3 cm behind the bar at depth. Glassbrook's force-plate data put the bar about 2 cm *behind* the centre of pressure in experienced high-bar lifters, which suggests the model's body mass sits further back than real lifters'. Worth testing against measured data.
- Muscle lengths are skinning-curve lengths, not OpenSim musculotendon lengths, and there is no fascicle/tendon split.
- Activation is a calibrated heuristic, not static optimisation or EMG.
- Left = mirrored right. The head is fixed to the trunk. There is no skin or fat layer and no soft-tissue collision.
- Grip width is fixed at 79 cm, and shoulder external rotation sits at its 90° limit.
- The importer uses the deepest rep and a 10%-of-range knee threshold. OpenCap trunk lean assumes `lean = -(pelvis_tilt + lumbar_extension)`; verify the sign on real files.
