# Squat tool — data format and coordinate frames

Trimmed from the `squat-anatomy` project's `docs/ARCHITECTURE.md` (v3) to what
the app needs to read the two data files. The pipeline that produces them is
not in this repository (see `PROVENANCE.md`).

## Files

| File | Content |
|---|---|
| `squat-manifest.json` | Every binary array's offset, count, dtype and shape, plus `meta` (all model metadata), `st_meta` and `sa_meta` (dequantisation constants). |
| `squat-anatomy.bin` | gzip (level 9, mtime 0) of all arrays concatenated with 8-byte alignment. The app gunzips it with `DecompressionStream('gzip')` in a worker (`web/src/squat/workers/`). |

An array entry is `{ o, n, t, shape? }`: byte offset into the **decompressed**
buffer, element count, dtype code and optional shape. Dtypes: `<i2` Int16,
`|u1` Uint8, `<u2` Uint16, `<u4` Uint32, `<f4` Float32, `|i1` Int8
(`web/src/squat/utils/manifest.js`). Positions are int16 quantised:
`value * s + c` per group centre `c` and scale `s`
(`web/src/squat/utils/dequantise.js`).

## Coordinates and sampling

- Metres. +x anterior (the lifter faces +x), +y up, +z to the lifter's right. The floor is y = 0.
- Right-side geometry is stored. The left side is the same mesh under a group with `scale.z = -1`. Midline (axial) meshes are not mirrored.
- **Depth parameter S**: 41 samples, `meta.S = [0, 0.025, …, 1]`, from standing (0) to the bottom (1). Every per-depth table (frames, curves, readouts, activation, muscle length) uses this index. Interpolate linearly between samples.
- **Frames**: `frames` is `[41, 11, 7]` Float32: position xyz plus quaternion xyzw for `meta.frames = [pelvis_rest, L5, L4, L3, L2, L1, thorax, femur_r, patella_r, tibia_r, talus_r]`. Each maps rest-world coordinates to world at that depth. The femur origin is the hip joint centre. **The L5 origin is not the L5/S1 joint.** `meta.static` holds fixed 4×4 transforms for `calcn_r` and `toes_r`, since the feet stay flat.

## Geometry sets

| Set | Arrays | Deformation |
|---|---|---|
| Bones | `bone_<g>_pos` (int16), `bone_<g>_idx` (uint16 triangles), `bone_<g>_id` (part id → `meta.bones[g].names`) | Rigid, attached to `meta.bones[g].frame`. |
| Curve-skinned muscles (leg and hip) | `cm_c1, cm_c2` (curve ids), `cm_w` (blend), `cm_s1, cm_s2` (arclength 0–4000), `cm_l1, cm_l2` (local offsets × `meta.LQ`), `cm_mid`, `cm_tw`, `cm_idx`; curves `cv_pos` (int16 × 5e-5 m, y offset +0.8), `cv_quat` (int16/32767), laid out `[curve][S][point]`; `meta.curves[i] = {n, K, nseg, sig}` | Each vertex rides one or two muscle-path curves; cross-section scaled by `sig` per depth. Rebuilt every frame. |
| LBS trunk | `lb_pos`, `lb_i0`, `lb_w`, `lb_mid`, `lb_idx` | Linear blend between two adjacent trunk frames of `meta.lbs.frames`. |
| Static upper body (`st_*`, mirrored) and intercostals (`sa_*`, axial) | `*_pos`, `*_idx`, `*_mid`, `*_tw` | Posed once in the thorax frame. |

Per-vertex `*_mid` indexes `meta.muscles`. `*_tw` (0–255) blends towards tendon colour.

## `meta` (selected fields)

- `muscles[k]`: `name`, `role`, `tendon`, `act = [lowering[41], drive[41]]` uint8 (÷255 → 0–1, **estimated**, not EMG), `len[41]` (musculotendon path length, % of standing), `mode`.
- `readout[41]`: `knee`, `hip`, `ankle`, `lumbar`, `lean`, `shin`, `thigh`, `depth` (cm), `bar` (mm), `bx`, `cop` (% foot from heel), `lord`, `klat` (cm), `Mhip`, `Mknee`, `Mank` (static, per leg, N·m), `Mlum` (static L5/S1).
- `rep`: timeline at `dt = 0.02 s` with `s[]`, `ph[]` (0 brace, 1 lowering, 2 bottom, 3 drive, 4 lockout), `v[]`, `f[]`; summary `t_bottom`, `ecc`, `con`, `trans`, `mcv`, `vpk`, `vecc`, `fpk`, `fmin`.
- `arm`: `er`, `elev`, `plane`, `elbow`, `wrist`, `grip` (cm), `retraction`.
- `bw` 85, `mbar` 100.

The headline numbers the guide, form check and metrics table print are derived
from these fields by `web/src/squat/utils/repSummary.js`.
