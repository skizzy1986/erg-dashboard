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
- **The manifest array readers** (`anatomy/utils/arrays.js`: `DTYPES`, `isArrayEntry`,
  `arrayEntries`, `viewArray`) and `anatomy/utils/dequantise.js`. Any movement's
  manifest is read the same way, so these sit under `anatomy/`. The layering inversion
  PR1 left behind — `anatomy/` importing them from `squat/utils/` — is **resolved**;
  what stayed in `squat/utils/manifest.js` is `validateManifest`, which asserts
  `meta.S` and `meta.readout` and so is squat-specific by definition.
- **Theme tokens** are named `anatomy*`, not `squat*` — including the activation
  heatmap's four ramp stops (`anatomyHeat{Low,Mid,High,Peak}`) and the scene's
  `setActivation(weights | null)`, which takes one 0–1 weight per muscle and knows
  nothing about squats.

## What's still squat-specific

- **The depth parameter itself.** `S` is "standing → bottom" with a Lowering/Drive
  direction. A press or a lunge needs its own phase definition (`anatomy/utils/depth.js`
  `derivePhase`, `PHASE_CHIPS`).
- **Equipment.** The scene always builds a barbell from `meta.bar` on the thorax frame,
  sized in `anatomy/constants/sceneStyle.js`. A dumbbell, kettlebell or bodyweight
  movement needs this made optional or data-driven.
- **The region map.** `squat/constants/muscleRegions.js` names eleven regions ordered
  the way a squat loads, and `REGION_OF` assigns each of the 118 muscles to one *by
  index into `meta.muscles`*. Both are authored judgements about this movement: a press
  would group the same anatomy differently, and a different mesh set would renumber it.
- **The activation bands.** Low / Moderate / High cut at 0.30 and 0.60 of `act/255`
  (`squat/constants/activationBands.js`) are this model's own colour-ramp stops, so a
  movement built from a different ramp needs its own.
- **All the coaching content** in `web/src/squat/constants/` (guide prose, phases, form
  check, metrics table, sources) and the readout summary in `squat/utils/repSummary.js`.
- **The route, assets and bundle gates** are hard-wired to `/squat` and
  `squat-anatomy-*.bin`.

A good first design exercise is a `movement` config (the shape is sketched in
`docs/squat/RESEARCH_BRIEF.md` §6: skeleton, reference curves, phases, targets,
faults, cues, sources) and a list of exactly which lines above it would replace.

## The data pipeline

The two data files are produced by the **`squat-anatomy`** Python project
(BodyParts3D meshes, OpenSim-derived muscle paths, kinetics, activation). It lives
at [`pipeline/squat-anatomy/`](../../pipeline/squat-anatomy/). Start with its
`README.md`, `CLAUDE.md` (working rules) and `docs/ARCHITECTURE.md`, then
[`ARCHIVE.md`](../../pipeline/squat-anatomy/ARCHIVE.md) for what is committed and
what isn't. To rebuild the squat page and data (about a minute, plus the one-off STL
fetch):

```bash
cd pipeline/squat-anatomy && pip install -r requirements.txt
```

```bash
scripts/fetch_stl.sh
```

```bash
python -m squat build && python -m squat verify dist/squat.html
```

A new movement means new stages in this pipeline (its own poses, frames, curves and
activation), producing a new `<movement>.html` that the extractor turns into the two
data files. Two cautions:
- **Some squat data has no generator.** It comes from the v1 page, whose code was
  lost (see ARCHIVE.md). A new movement would need its own route to that data: frames,
  curve definitions, static foot matrices.
- **Stages run in Python on your computer.** Claude chat can read and explain them; to
  run them you need Python locally or Claude Code.

## Licensing to keep in mind for new movements

- Anatomy meshes come from **BodyParts3D (CC BY-SA 2.1 JP)**. Derived geometry must
  carry the same licence and attribution (see `NOTICE.md`, `web/src/squat/assets/LICENSE.md`).
- The OpenSim musculoskeletal models have their own terms (noted in `NOTICE.md`).
- Measured datasets (e.g. OpenCap) have their own terms. Check before using any of
  their numbers in a shipped movement (see `docs/squat/LAB_DATA.md`).

## Checklist when the data is regenerated

The two data files are pinned by sha256 **and** byte count in
`web/src/squat/constants/dataAsset.js`, so a re-run of the pipeline fails
`web/src/squat/__tests__/content.test.js` before anything can silently drift. Work
through these before updating those pins:

- **Re-derive `REGION_OF`** in `web/src/squat/constants/muscleRegions.js`. It is keyed
  by index into `meta.muscles`, so a reordered, added or removed muscle moves every
  assignment after it. Re-derive the named 118-row table in
  `web/src/squat/__tests__/muscleIndex.test.js` in the same change — the test asserting
  the two agree is what makes the index-keying safe.
- **Re-check the slugs are still unique.** `slugify` is a function, not a table, so a
  new muscle name could collide; `muscleIndex.test.js` asserts 118 distinct slugs.
  A renamed muscle also breaks any `#m=` link already shared, which the tool reports
  rather than hiding.
- **Re-check the band distribution.** `activation.test.js` pins how many muscles peak in
  each band; if the activation arrays change those counts change with them.
- **Re-run the posing fixture** (`web/src/anatomy/utils/__tests__/poseModel.test.js`
  pins `raw_sha256`) and `npm run build && npm run size` for the data budget.
