# Adding a new movement — what exists and what's missing

The long-term idea is that `/squat` becomes the first of several movements (deadlift,
front squat, lunge, overhead press…), each a new **data release + config**, not a new
tool. This page is honest about how far the code is from that today.

## The contract a movement has to meet

A movement is two files produced by the offline pipeline, in the format documented in
[`docs/squat/ARCHITECTURE.md`](../squat/ARCHITECTURE.md):

| File | Holds |
|---|---|
| `<movement>-manifest.json` | An index of every typed array (`{o, n, t, shape}`) plus `meta` (all model metadata) and `st_meta` / `sa_meta` (dequantisation constants). |
| `<movement>-anatomy.bin` | One gzip stream of all arrays, 8-byte aligned. |

The runtime posing maths is fully specified in [`docs/squat/SKINNING.md`](../squat/SKINNING.md)
and implemented, pure and fixture-tested, in `web/src/anatomy/utils/`.

**What the runtime reads** (anything a new movement's data must provide):

| Consumer | Reads |
|---|---|
| `anatomy/utils/poseModel.js` | arrays `frames`, `cm_*`, `cv_pos`, `cv_quat`, `lb_*`; `meta.S`, `meta.frames`, `meta.static`, `meta.curves`, `meta.cm_nv`, `meta.lbs`, `meta.LQ` |
| `anatomy/scene/createAnatomyScene.js` | bone arrays `bone_<g>_*`, `st_*`, `sa_*`; `meta.bones`, `meta.muscles`, `meta.bar`, `meta.lbs`; `st_meta`, `sa_meta` |
| `squat/utils/repSummary.js` (squat UI only) | `meta.readout`, `meta.rep`, `meta.arm`, `meta.bw`, `meta.muscles` |

## What's already movement-neutral

- **The posing runtime** (`web/src/anatomy/utils/`): depth sampling, body frames,
  curve-skinned muscles, trunk linear blend, mirroring and colour. Nothing in it names
  the squat; the sample count comes from the data (`meta.S.length`).
- **The 3D scene** (`web/src/anatomy/scene/`): builds whatever bones, muscles and
  equipment the data describes, with an empty **body** layer reserved for a future
  clothed human.
- **The data loader** (`squat/hooks/useAnatomyData`, `squat/workers/`): decodes any
  manifest + bin pair.
- **Theme tokens** are named `anatomy*`, not `squat*`.

## What's still squat-specific

- **The depth parameter itself.** `S` is "standing → bottom" with a Lowering/Drive
  direction. A press or a lunge needs its own phase definition (`anatomy/utils/depth.js`
  `derivePhase`, `PHASE_CHIPS`).
- **Equipment.** The scene always builds a barbell from `meta.bar` on the thorax frame,
  sized in `anatomy/constants/sceneStyle.js`. A dumbbell, kettlebell or bodyweight
  movement needs this made optional or data-driven.
- **Two helper imports.** `anatomy/` imports `viewArray` and `dequantise` from
  `squat/utils/` (a layering inversion queued to fix in PR2b).
- **All the coaching content** in `web/src/squat/constants/` (guide prose, phases, form
  check, metrics table, sources) and the readout summary in `squat/utils/repSummary.js`.
- **The route, assets and bundle gates** are hard-wired to `/squat` and
  `squat-anatomy-*.bin`.

A good first design exercise is a `movement` config (the shape is sketched in
`docs/squat/RESEARCH_BRIEF.md` §6: skeleton, reference curves, phases, targets,
faults, cues, sources) and a list of exactly which lines above it would replace.

## The missing piece: the data pipeline

The two data files are produced by a **separate Python project, `squat-anatomy`**
(BodyParts3D meshes, OpenSim-derived muscle paths, kinetics, activation). It is
**not in this repository yet**. [`docs/squat/PROVENANCE.md`](../squat/PROVENANCE.md)
records the release (v3) and how the files were extracted.

Scott intends to make it available here. Until then, you can still:

- read the format and maths (ARCHITECTURE.md, SKINNING.md) and the runtime code;
- prototype UI, interaction and coaching ideas against the squat data;
- prototype a new movement's **config and phases** without new geometry.

Generating **new geometry** for a new movement needs that pipeline. When it lands, this
section will point to it.

## Licensing to keep in mind for new movements

- Anatomy meshes come from **BodyParts3D (CC BY-SA 2.1 JP)**. Derived geometry must
  carry the same licence and attribution (see `NOTICE.md`, `web/src/squat/assets/LICENSE.md`).
- The OpenSim musculoskeletal models have their own terms (noted in `NOTICE.md`).
- Measured datasets (e.g. OpenCap) have their own terms. Check before using any of
  their numbers in a shipped movement (see `docs/squat/LAB_DATA.md`).
