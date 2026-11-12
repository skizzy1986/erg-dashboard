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
(`web/src/anatomy/utils/arrays.js`). Positions are int16 quantised:
`value * s + c` per group centre `c` and scale `s`
(`web/src/anatomy/utils/dequantise.js`).

Those two modules are **movement-neutral** and so live under `anatomy/`, not
`squat/`: any movement's manifest is read the same way. What stays in
`web/src/squat/utils/manifest.js` is `validateManifest`, which asserts
`meta.S` and `meta.readout` — the squat tool's own contract, not a generic
array reader. That is the split line.

## Coordinates and sampling

- Metres. +x anterior (the lifter faces +x), +y up, +z to the lifter's right. The floor is y = 0.
- Right-side geometry is stored. The left side is the same mesh under a group with `scale.z = -1`, mirroring across the world plane **z = 0** (not `meta.zc`, which nothing reads). Midline (axial) meshes are not mirrored.
- **Depth parameter S**: 41 samples, `meta.S = [0, 0.025, …, 1]`, from standing (0) to the bottom (1). Every per-depth table (frames, curves, readouts, activation, muscle length) uses this index. Interpolate linearly between samples.
- **Frames**: `frames` is `[41, 11, 7]` Float32: position xyz plus quaternion xyzw for `meta.frames = [pelvis_rest, L5, L4, L3, L2, L1, thorax, femur_r, patella_r, tibia_r, talus_r]`. Each is `world = R(q)·v + p` (three's `Matrix4.compose`, quaternion xyzw). What `v` is differs by body: for the seven trunk frames it is the shared trunk rest space (which is **not** the S = 0 pose — at S = 0 all seven are the same 8.19° rotation plus a small translation); for the leg frames (`femur_r`, `patella_r`, `tibia_r`, `talus_r`) it is the body's own local frame, e.g. the femur's origin is the femoral head centre and its frame position is the hip joint centre. Between samples positions lerp and rotations slerp (r128's slerp, SKINNING.md §3). **The L5 origin is not the L5/S1 joint.** `meta.static` holds fixed 4×4 transforms for `calcn_r` and `toes_r`, since the feet stay flat — stored as four **rows** (row-major) mapping body-local foot vertices to world; bones name them `'@calcn_r'` / `'@toes_r'`.

## Geometry sets

| Set | Arrays | Deformation |
|---|---|---|
| Bones | `bone_<g>_pos` (int16), `bone_<g>_idx` (uint16 triangles), `bone_<g>_id` (part id → `meta.bones[g].names`) | Rigid, attached to `meta.bones[g].frame`. |
| Curve-skinned muscles (leg and hip) | `cm_c1, cm_c2` (curve ids), `cm_w` (`/255` = weight on curve 1; at 255 curve 2 is skipped), `cm_s1, cm_s2` (a span parameter, 4000 per spline span, so 0 – 4000·K — not arclength; `u = s·nseg/4000` indexes the `n = K·nseg + 1` samples), `cm_l1, cm_l2` (local offsets × `meta.LQ`; local x is the curve tangent), `cm_mid`, `cm_tw`, `cm_idx`; curves `cv_pos` (int16 × 5e-5 m, y offset +0.8), `cv_quat` (raw int16, normalised after every lerp — never divided by 32767), laid out `[curve][S][point]`; `meta.curves[i] = {n, K, nseg, sig}` | Each vertex rides one or two muscle-path curves; `sig` scales the cross-section (local y and z only) per depth. Rebuilt every frame. |
| LBS trunk | `lb_pos`, `lb_i0`, `lb_w`, `lb_mid`, `lb_idx` | Linear blend of two fully transformed positions: `lb_w/255` on frame `lb_i0` of `meta.lbs.frames`, the rest on the next one. |
| Static upper body (`st_*`, mirrored) and intercostals (`sa_*`, axial) | `*_pos`, `*_idx`, `*_mid`, `*_tw` | Posed once in the thorax frame. |

Per-vertex `*_mid` indexes `meta.muscles`. `*_tw` (0–255) blends towards tendon colour. `meta.muscles[k].group` names the geometry set the muscle lives in (`curve` → `cm_*`, `lbs` → `lb_*`, `st`, `sa`).

Byte sizes: the manifest committed here is 99,904 bytes, against 100,785 embedded in the source page — a re-serialisation (e.g. trailing `.0` dropped from floats), with no value changed; compare parsed objects, never bytes. The blob is identical (3,450,003 bytes decompressed).

## Runtime

The posing maths — the depth rule, frame interpolation, curve skinning, the
trunk blend, mirroring and colour — is specified line by line in
[`SKINNING.md`](SKINNING.md), with a browser-generated fixture
(`web/src/anatomy/utils/__tests__/fixtures/squat-skinning-fixture.json`) that
the port is tested against to 1e-5 m.

The code is movement-neutral and lives in `web/src/anatomy/`: `utils/` holds
the pure posing and colour maths (`createPoser` in `poseModel.js` is the seam
a rigged body mesh would read frames from), and `scene/` is the only place
that imports three.js, loaded lazily through `scene/loadScene.js`. The squat
tool's React UI stays in `web/src/squat/`.

## `meta` (selected fields)

- `muscles[k]`: `name`, `role`, `tendon`, `act = [lowering[41], drive[41]]` uint8 (÷255 → 0–1, **estimated**, not EMG), `len[41]` (musculotendon path length, % of standing), `mode`.
- `readout[41]`: `knee`, `hip`, `ankle`, `lumbar`, `lean`, `shin`, `thigh`, `depth` (cm), `bar` (mm), `bx`, `cop` (% foot from heel), `lord`, `klat` (cm), `Mhip`, `Mknee`, `Mank` (static, per leg, N·m), `Mlum` (static L5/S1).
- `rep`: timeline at `dt = 0.02 s` with `s[]`, `ph[]` (0 brace, 1 lowering, 2 bottom, 3 drive, 4 lockout), `v[]`, `f[]`; summary `t_bottom`, `ecc`, `con`, `trans`, `mcv`, `vpk`, `vecc`, `fpk`, `fmin`.
  The page's time control scrubs this timeline (`anatomy/utils/rep.js`): depth, phase and direction (lowering before the first maximum of `s`, drive from it) all come from `rep.s[frame]`/`rep.ph[frame]`.
- `arm`: `er`, `elev`, `plane`, `elbow`, `wrist`, `grip` (cm), `retraction`.
- `bw` 85, `mbar` 100.

The headline numbers the guide, form check and metrics table print are derived
from these fields by `web/src/squat/utils/repSummary.js`.

## The muscle panel (118 muscles, eleven regions)

The canvas is `aria-hidden` with `tabindex="-1"`, so the grouped muscle list is
the accessible substitute for the model, not an extra. It is therefore never
behind a lazy chunk.

**Regions.** `web/src/squat/constants/muscleRegions.js` holds `REGION_NAMES`
(eleven, ordered the way a squat loads — hips first, not alphabetical) and
`REGION_OF`: one small int per muscle, **in `meta.muscles` order**. Index-keyed
deliberately — 257 bytes against ~1,017 for a name-keyed map, on a budget where
that matters. Safe only because `squat-manifest.json` is pinned by sha256 **and**
byte count in `constants/dataAsset.js`, asserted in `__tests__/content.test.js`:
the data cannot shift under the array without a test failing first and forcing a
human to re-derive it. **Re-derive `REGION_OF` whenever the pipeline is re-run.**
The readable record — all 118 rows as `name -> region` — lives in
`web/src/squat/__tests__/muscleIndex.test.js`, where it costs no bundle bytes and
fails loudly if an index moves. There is no "Other" region; every muscle belongs
to exactly one, including the two tendons (`Iliotibial tract`, `Achilles
(calcaneal) tendon`), which are listed because an incomplete substitute for the
model is not a substitute.

**Slugs.** `#m=<slug>` deep-links a muscle. There is no slug table:
`slugify(name)` in `utils/muscleIndex.js` lowercases, maps `[^a-z0-9]+` to `-`
and trims the ends. Over all 118 names that gives 118 unique slugs, longest 47
characters. ~80 bytes of function instead of ~1 KB of data, and a name survives
a data regeneration where an array index does not.
`web/src/utils/squatRoute.js` validates `m` by **shape only**
(`/^[a-z0-9-]{1,64}$/`) because it sits outside `src/squat/` so `RouteRoot` can
read it at first paint without pulling the tool's chunk in; the tool resolves the
slug itself and reports a dead link.

**Bands, not numbers.** `constants/activationBands.js` holds the three bands
(Low / Moderate / High, cut at 0.30 and 0.60 of `act/255`) and every
user-facing activation string, in one file so the prose scan in
`__tests__/content.test.js` reaches all of it. The cuts are the model's own
colour-ramp stops (`SKINNING.md` RAMP), not a published threshold — which is why
there is no citation and `ACT_BASIS` says so in words. The card shows the band at
the current depth and direction plus the peak band across the whole rep, because
a muscle reading Low at 10% depth may be the hardest worker at the bottom.

**The heatmap** is off by default and is a colouring mode, not a mesh layer: it
lives beside `layers` in `hooks/useAnatomyViewState.js`, and the scene takes it
through one controller method, `setActivation(weights | null)`. The four ramp
tokens (`anatomyHeat{Low,Mid,High,Peak}`) have two readers — the scene as raw
0–1 channels via `scenePalette`, the legend as `var()` strings via `THEME` — so
the model and its key cannot drift apart. `HEAT_POSITIONS` in
`anatomy/utils/sceneColours.js` and `HEAT_STOPS` in `activationBands.js` are
asserted equal for the same reason.
