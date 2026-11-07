> **Stage 1 research appendix — codebase asset inventory.** Produced read-only by the `Codebase Onboarding Engineer` agent (sonnet) on 2026-11-07 at HEAD `0d8c204`, saved verbatim by the orchestrator. Session: https://claude.ai/code/session_018vVjPyHefMYsT9ZqH876nK. Read with [`ROADMAP_PACKET_2026-11-07.md`](ROADMAP_PACKET_2026-11-07.md), which cites it as "inventory §N".

# Codebase Orientation Map: asset inventory for a 3D-movement-centred SplitIQ

Repo `/home/user/erg-dashboard`, HEAD `0d8c204` (2026-11-07, "retire coach-chat and drop coach_messages (slice 3) (#430)").

**Read:** VISION.md, CLAUDE.md (via the brief), the full reorientation epic, the first 60 lines of the backlog audit, NEW_MOVEMENT.md, PROVENANCE.md, ARCHITECTURE.md, LAB_DATA.md (first 60 lines), REFERENCES.md (first 30 lines), the squat RESEARCH_BRIEF §6, and the pipeline CLAUDE.md, README.md, ARCHIVE.md and docs/ARCHITECTURE.md. Also NOTICE.md, LICENSE, PERMISSIONS.md, LICENSE.md and DESIGN.md (first 40 lines). Source files are listed per section.

**Not read:**
- Most of the squat component bodies; for those I classified from imports and header comments, and say so.
- docs/squat/SKINNING.md beyond citations.
- The backlog audit beyond §2.
- The Python stage bodies.

**What I ran:**
- `npx vitest run --reporter=dot` in `web/`: 123 files, 1549 tests, all passed, 52.9 s. It wrote only to the gitignored `web/test-results`; `git status` was clean afterwards.
- I did not run `npm run build` or `npm run size`, so no bundle figure below is re-measured. The ceilings are read from the script constants.
- I did not run pytest.

---

## 1-Line Summary

SplitIQ is a React 19 + Vite SPA with a Supabase backend. It holds two products on one build: a public, no-auth `/squat` tool that renders a pre-baked 3D anatomical model (118 muscles, one high-bar back squat), and an auth-gated training dashboard. A movement-neutral posing and scene runtime in `web/src/anatomy/` sits under `/squat`, and a Python pipeline in `pipeline/squat-anatomy/` produces its data.

## 5-Minute Explanation

- **Primary tasks in code:**
  - `/squat` fetches a 2.2 MB gzip anatomy stream and a 99.9 KB manifest. It decodes them in a worker, poses bones and muscles per depth sample, and renders them in three.js.
  - It shows an activation band per muscle, a guide, a form check and a metrics table, all against fixed prose and published references.
  - The dashboard logs sessions, vitals and strength sets, models load (CTL/ATL/TSB), and imports from Strava and Google Health.
- **Primary inputs:**
  - `/squat`: two committed data files (`web/src/squat/assets/squat-anatomy.bin`, `squat-manifest.json`) and URL hash state.
  - Dashboard: Supabase rows under owner-only RLS, PM5 Bluetooth, edge-function imports.
- **Primary outputs:** a WebGL canvas plus an accessible muscle list on `/squat`. The dashboard shows charts and logs and writes rows.
- **Key files:**
  - `web/src/anatomy/` (runtime)
  - `web/src/squat/` (product)
  - `pipeline/squat-anatomy/` (data generator)
  - `web/scripts/check-bundle-size.mjs` (budgets)
  - `web/src/squat/__tests__/content.test.js` (content and licence guard)
  - `supabase/migrations/` (schema)
  - `VISION.md` and `coach/REORIENTATION_EPIC_2026-11-06.md` (direction)
- **Main code paths:**
  - `main.jsx` → `RouteRoot.jsx` → lazy `squat/SquatApp.jsx` → `useAnatomyData` (worker decode) → `anatomy/scene/loadScene.js` (dynamic import) → `createAnatomyScene` → `createPoser`.
  - Or `main.jsx` → `RouteRoot.jsx` → lazy `AuthGate.jsx` → `App.jsx` / `MobileApp.jsx`.

---

## 1. The anatomy engine (`web/src/anatomy/`)

### Modules

Line counts come from `wc -l`.

| Module | What it does | Assumes the squat? |
|---|---|---|
| `utils/arrays.js` (35) | `DTYPES`, `isArrayEntry`, `arrayEntries`, `viewArray`: generic readers for the manifest `{o,n,t,shape}` entries | No. Its header says "Movement-neutral". |
| `utils/dequantise.js` (11) | int16 to metres, `v*s+c` per axis | No |
| `utils/quat.js` (114) | Quaternion helpers. `slerpR128` is a line-for-line port of three r128's slerp, because r187's switches to nlerp at dot ≥ 0.9995. | No. It exists because the data was authored against r128. |
| `utils/frames.js` (56) | `frameAt` (positions lerp, rotations slerp), `staticMatrices` | Frame names come from `meta.frames`; the maths is generic. |
| `utils/curveSkin.js` (133) | Curve-skinned muscles. Constants: `CURVE_POS_SCALE=5e-5`, `CURVE_Y_OFFSET=0.8`, `SPAN=4000`. | The constants are authored into the data format. |
| `utils/lbs.js` (34) | Trunk linear blend. Weight is on frame k, not k+1. | No |
| `utils/poseModel.js` (100) | `createPoser(manifest, buffer)`. Validates array shapes against `meta.S`. `poseAt(s)` allocates nothing. `matrixFor(name)` serves frames and `@static` matrices. | Reads `meta.S`, `meta.frames`, `meta.static`, `meta.curves`, `meta.cm_nv`, `meta.lbs`, `meta.LQ`. Generic if a manifest supplies those. |
| `utils/depth.js` (58) | `depthIndex`, `sampleToS`, `sToSample`, `DIRECTIONS=['lowering','drive']`, **`derivePhase`**, **`PHASE_CHIPS`**, `stepAlongRep` | **Yes.** The phase thresholds (≤0.05, ≥0.975) and the chip names (Standing, Descent, Bottom, Drive, Lockout) are squat vocabulary. |
| `utils/cameraMath.js` (87) | Spherical camera offsets, `MIN_DISTANCE=0.6`, `MAX_DISTANCE=6` | Axes convention only: lifter faces +x, +z is the lifter's right. |
| `utils/sceneColours.js` (149) | Colour as raw 0–1 channels, HSL jitter, heat ramp. Imports `DARK` and `LIGHT` from `constants/themeValues.js`. | No |
| `constants/sceneStyle.js` (106) | Light and camera numbers per theme. Includes a **`bar:{}` block** (radius 0.0145, length 2.2, plate and sleeve sizes). Camera target `[0, 0.8, 0]`. | **Barbell parameters and standing-height camera framing.** |
| `scene/loadScene.js` (4) | The one dynamic import of `createAnatomyScene.js` | No |
| `scene/createAnatomyScene.js` (638) | The only three.js importer | See below. |

### What in the scene is squat-specific

Source: `createAnatomyScene.js:287-315`, `:291`, `:293`, `:301`, `:234`, `:273`, `:284`.

- It always builds a barbell on the `thorax` frame from `meta.bar.c` and `meta.bar.r`. `poser.matrixFor('thorax')` is hard-named, so a manifest without a `thorax` frame throws.
- Bones iterate `meta.bones` generically.
- The `st`/`sa` static sets are attached to `'thorax'` (`:284`).
- The `body` layer exists and is empty.
- The controller API is `setDepth`, `setLayers({muscles, skeleton, body})`, `setPalette`, `setActivation(weights|null)` and others. `setActivation` takes one 0–1 weight per muscle and knows nothing about squats.
- **Only the scene file is excluded from coverage.** The `anatomy/utils/**` coverage gate (below) does cover `depth.js`.

### `validateManifest` (`squat/utils/manifest.js`, 26 lines)

It pins four things: `manifest` is an object; `meta.S` and `meta.readout` are arrays; `readout.length === S.length`; and, given a buffer, every array entry resolves via `viewArray`. It returns the count of arrays checked. It deliberately stayed in `squat/` because "no other movement is obliged to have `meta.S` and `meta.readout`".

### three.js

- Version is **exactly `"three": "0.187.0"`** (`web/package.json:44`). The source page was r128.
- **Lazy loading:** `loadScene.js:4` is the only dynamic import. Its comment says nothing else may import `createAnatomyScene.js`, and "the bundle check fails if it reaches either entry".
- **ESLint rule:** `web/eslint.config.js:105-132`. For `src/**/*.{js,jsx}` except `src/anatomy/scene/**`, `no-restricted-imports` bans `three` and `three/*`.
- **Parity with r128:**
  - `ColorManagement.enabled = false` at module scope (`createAnatomyScene.js:47`).
  - sRGB output, no tone mapping, and a `LIGHT_UNIT = Math.PI` multiplier because r155 made physical lights the default.
  - `src/anatomy/__tests__/sceneParity.test.js` asserts these on the comment-stripped source text, because jsdom has no WebGL.
- **Bundle gate:** `check-bundle-size.mjs` also fails if the scene chunk is reachable from either first-paint entry (`firstPaintLeaks(manifest, SCENE_ROOT, [DASHBOARD_BOOT, SQUAT_ROOT])`).

### Fixture testing against the source page

- Fixture: `web/src/anatomy/utils/__tests__/fixtures/squat-skinning-fixture.json`. It was generated from the original page's own posing functions run in a browser (docs/squat/SKINNING.md §11). `poseModel.test.js` compares against it to `FIXTURE.tolerance_m` (1e-5 m per ARCHITECTURE.md).
- `poseModel.test.js` also pins `raw_sha256` and `bin_raw_bytes` of the decompressed data.
- The fixture records `data_version.manifest_sha256`. It must be re-pinned if the manifest changes, even for prose.
- The generator tooling (`fixture-tooling/`) is **not in git**. It is in the preserve bundle on a GitHub Release (see §3).
- `vite.config.js:369`: the per-file gate for `src/anatomy/utils/**` is lines 95 / functions 95 / branches 90. Measured 99.69 / 100 / 96.73 on 2026-11-04, per the config comment.

---

## 2. The `/squat` product (`web/src/squat/`)

Roughly 4,800 source lines (components 2,800, hooks 700, constants 1,200, utils 400, workers 90). Test files: 21 under `squat/__tests__`, 13 under `anatomy/`.

### Components

Classification is from imports and header comments, not full reads, unless noted.

| Component | Classification | Evidence |
|---|---|---|
| `SquatApp.jsx` (546) | **Squat-only shell, parameterisable.** Imports `PHASES`, the manifest URL, and sets `PAGE_TITLE='High-bar squat — SplitIQ'` and `PAGE_DESCRIPTION`. | `SquatApp.jsx:7,41` |
| `AttributionFooter.jsx` | **As-is.** Renders `ATTRIBUTION` on every state (loading, failed, unsupported, ready), as CC BY-SA requires. The constant is generic apart from the "Sources" button. | `AttributionFooter.jsx:7-9` |
| `CameraControls`, `CapabilityNotice`, `LoadStatus`, `SceneError`, `ViewOptions`, `HeatmapLegend`, `RichText`, `ui.js` | **As-is.** No squat-constant imports (grep). `HeatmapLegend` reads only `activationBands`. `SceneError` reads only `reloadPage`. | grep of imports |
| `SquatStage.jsx` | **As-is** (no constant imports) | |
| `DepthControls.jsx` | **Parameterise.** Imports `PHASE_CHIPS` from `anatomy/utils/depth.js` (squat phase names). | |
| `MuscleList.jsx` | **Likely as-is, inferred.** It has no `constants` imports; the region grouping must arrive via props. | |
| `MuscleCard.jsx` | **Parameterise.** Hardcoded copy "what it does in a squat" (`:8`, `:68`). Reads `activationBands`. | |
| `FormCheck.jsx` | **Parameterise.** Renders `FORM_CHECK`. Labelled "Reference ideal — modelled" and "must never read as the visitor's own result". | |
| `GuideDialog.jsx`, `GuidePanes.jsx` | **Parameterise.** Bound to `guide.js`, `phases.js`, `metricsTable.js`, `method.js` and `references.js`. Pane ids `phases/metrics/measured/method/sources` and graph tab ids `angles/moments/force/act/len` are hardcoded in `web/src/utils/squatRoute.js`. | |
| `SquatHeader.jsx` | Not inspected beyond a comment. | |

### Hooks and utils

| File | Status |
|---|---|
| `useAnatomyData` | **Squat-bound.** Imports `validateManifest`, `summariseRep` and `DATA_ASSET`. It does a two-step load: manifest first, then the stream in a worker. Its stages are fetching → decoding → building → ready, plus error and `unsupported`. |
| `useAnatomyScene` | Generic apart from importing `squat/utils/activation.js`. |
| `useAnatomyViewState` | Generic. Uses `anatomy/utils/depth.js` (directions and phase chips). |
| `useMuscleSelection` | Squat-bound via `muscleIndex.js` and `activationBands`. `#m=<slug>` is the sole URL state. |
| `useSquatHashState`, `useSquatTheme`, `useCapabilities`, `useMediaQuery` | Generic in mechanism. The hash keys are squat-named. |
| `utils/activation.js` | Generic maths over `muscle.act = [lowering[], drive[]]`, but imports the squat `ACT_BANDS`. |
| `utils/muscleIndex.js` | Squat-bound: `slugify`, filter, synonyms, `REGION_OF`. |
| `utils/repSummary.js` (134) | **Squat-only.** Reads `meta.readout`, `meta.rep`, `meta.arm`, `meta.bw` and `meta.muscles`. Computes every headline number the prose prints. |
| `workers/` | `anatomyDecode.worker.js`, `decodeStream.js` and `createAnatomyWorker.js` are generic decode. Every worker the build emits gets the `squat-` prefix (`vite.config.js` `worker.rolldownOptions`). |

### Accessibility design

- The canvas is created with `aria-hidden="true"` and `tabindex="-1"` (`createAnatomyScene.js:122-125`).
- **The muscle list is the accessible substitute for the model, not an extra.** It is one listbox, one tab stop, 118 options in eleven groups (`MuscleList.jsx` header; docs/squat/ARCHITECTURE.md "The muscle panel"). It is deliberately **not lazy-loaded**, so it cannot sit behind a chunk that fails to fetch.
- E2E checks: the listbox is one tab stop and axe-clean with a card open; the canvas is hidden from AT and skipped by Tab; a hidden tab draws nothing (`web/e2e/squat.spec.js`). Reduced-motion and theme switching are also covered.

### The prose scan (`squat/__tests__/content.test.js`) and its golden rules

It reads the committed constants and `docs/squat/REFERENCES.md`. It enforces:

- **Counts:** five phases in timeline order; five guide panes; 18 metrics rows; 15 references with unique ids; 10 form-check items, labelled `'Reference ideal — modelled'`; every form-check source id exists in `REFERENCES`.
- **Numbers and citations match `docs/squat/REFERENCES.md` verbatim.** This covers the Wretenberg ratio, the velocity table, the sticking region, the mode factor 0.62, journal volume/pages and all URLs. Every URL must be `https://`.
- **Modelled, never EMG:**
  - A `/\bEMG\b/i` scan over all 118 `meta.muscles[].role` strings.
  - A scan of all prose (metrics, form check, method, phase guide, `ACT_*`, heat legend, region names) for `EMG activation`, `activation (EMG` and `measured activation`.
  - The "Estimated activation" metrics row must start "Estimated from joint moments, not EMG".
  - `METHOD.modelled[5]` must contain "Estimated, not measured."
  - Exact strings are pinned for `ACT_NOTE` ('Indicative estimate, not EMG.'), `ACT_BASIS`, `ACT_NONE` and `HEAT_LEGEND`. None of those may contain a year.
- **Bands, never a number:** `ACT_BANDS` names `['Low','Moderate','High']` with `max` `[0.3, 0.6, 1]`, and `HEAT_STOPS` equals `[0, 0.3, 0.6, 1]`. The cuts are the model's own colour-ramp stops, not a published threshold, which is why there is no citation (`activationBands.js` header).
- **Derived values:** model-derived values reproduce the source CHANGELOG figures (ecc 1.63 s, con 0.92 s, mcv 0.61 m/s, ER 90°, and so on). The knee-flexion "slightly deeper than the study mean" prose is pinned against the data (131° vs 124 ± 7°).
- **Region map:** exactly 11 regions, hips first, no "Other", and all 118 muscles assigned.
- **Data asset:** the sha256 of the committed `.bin` and `.json` equals the `DATA_ASSET` pins in `constants/dataAsset.js`. `ATTRIBUTION.anatomy === 'Anatomy: BodyParts3D © DBCLS, CC BY-SA 2.1 JP'`. `LICENSE.md` names both files and the licence.
- **Other squat tests:** `muscleIndex.test.js` (118 distinct slugs, the named 118-row region table), `activation.test.js` (per-band peak counts), `contrast.test.js` (every ink/ground pair).

Pipeline CLAUDE.md golden rules 3 and 4 are the source of "modelled vs measured" and "every reference range needs a source". The content test is the mechanical guard, as VISION.md says.

### The importer and playback

- The guide has a "Measured rep" pane, but `guide.js` carries `MEASURED_PANE.comingSoon` (asserted to match `/later release/`). No importer code exists in `web/src` (see §12).
- The data holds a `meta.rep` timeline (dt 0.02 s), but the UI drives depth (`useAnatomyViewState`), not time.

---

## 3. The data pipeline (`pipeline/squat-anatomy/`)

### Inputs

- **BodyParts3D STLs.**
  - 14 files fetched by `scripts/fetch_stl.sh` from `github.com/Kevin-Mattheus-Moerman/BodyParts3D` at pinned commit `f0eeb6e8…`.
  - Each is sha256-pinned in `squat/inputs.py`.
  - `STL_BUILD` has 6 FMA ids and `STL_UPPER` has 8.
  - The `regcur` stage additionally needs the 32 `BONE_FID` bones (`squat/geom.py:28-30`); it also needs `T_arm_all.npy` from the preserve bundle.
- **Fixed, non-regenerable inputs** (`squat/inputs.py`, sha-pinned): `v3/base.html`, `T_global.npy`, `v3/bar_seat.npy`, `girdle_p.npy`, `curve_alpha.npy`, `curve_ends.npy`, `st_W.npy`, `armik2_x.npy` and `Tcur.npy`.
- **`base.html`** is "the v2 page; carries v1 data whose generator is lost" (`inputs.py`, ARCHIVE.md).
  - Per ARCHIVE.md, v1 supplies **62 of 71 data arrays (59% of the payload)**, the leg frames, the 43 curve definitions, and `meta.static/cop/heel/tip/zc`.
  - The manifest has 71 array entries and 54 curves.
- **OpenSim:** no `.osim` file is in the repo, and **no pipeline code references OpenSim** (grep of `squat/` and `requirements.txt` returned nothing).
  - NOTICE.md says the models' paths were used "in the separate source project" to shape the muscle curves, so OpenSim's influence is baked into the lost-generator v1 data.
  - ROADMAP item 5 lists calling the OpenSim API as future work.
- **Python deps** (`requirements.txt`): numpy 2.5.4, scipy 1.18.1, trimesh 5.2.0, fast-simplification 0.2.0, rtree 1.4.1.

### Stages (`squat/stages/`, CLI `python -m squat build | stage <name> | list | verify HTML`)

| Stage | Runtime / output |
|---|---|
| `ik3` | Arm and hand solve, about 3 min → `armik3_x.npy` |
| `ik4` | About 3 min → `armik4_x.npy` |
| `upper3` | `upper3.npz` |
| `balance3` | Vertical bar path and quasi-static kinetics → `frames3`, `deltas3`, `hips3`, `rows3.pkl` |
| `lengths3` | `mlen3.pkl` |
| `phase3` | Timed rep → `phase3.npz` |
| `regcur` | `Tcur.npy` |
| model modules | `activation`, `kinetics`, `readouts` |
| `build.py` | Assembles `dist/squat.html` |

Stage bodies are about 50 lines each. The package is 2,380 lines of Python including tests.

### Committed vs fetched

- **Committed** (about 8 MB in the pipeline's `pipeline/v3/`): the cached stage outputs, `base.html`, page sources, harness, docs and samples. The whole folder is 8.6 MB.
- **Not committed:** the 14 STLs (about 15 MB) and `dist/squat.html`.
- **Every build needs the STLs, `python -m squat build` included** (ARCHIVE.md). CI sets `SQUAT_STRICT_STL=1`.
- **Archive release:** the GitHub Release `squat-anatomy-archive-2026-11-04` holds `squat-anatomy-v3.zip` and `squat-anatomy-preserve.zip`. The preserve bundle holds:
  - `v1/squat_v1.html`
  - `v2-root/` (scripts with absolute paths that "won't run as they are")
  - `v3-extra/` (`run_ik2.py`, `armik_x.npy`)
  - `fixture-tooling/` (made `squat-skinning-fixture.json` and SKINNING.md)
- **Reproducibility:** the rebuild matches the shipped **decompressed** data byte for byte (3,450,003 bytes, sha256 `eb15d943…93b6be`) and the parsed manifest. The gzip stream differs on a different zlib (ARCHIVE.md).
- **Stage caches:** they reproduce byte for byte only on the generating machine. Tests (`tests/_compare.py`) fall back to rtol 1e-7 / atol 1e-9 on other CPUs.

### Output format

- **`squat-anatomy.bin`:** 2,202,168 bytes. It is one gzip stream (level 9, mtime 0) of arrays concatenated 8-byte aligned, 3,450,003 bytes decompressed.
- **`squat-manifest.json`:** 99,892 bytes (hand-edited once; see §4).
- **Manifest contents:** 71 array entries plus `meta` and `st_meta`/`sa_meta` dequantisation constants (`{c, s, nv}`). `meta` keys:
  - `S`, `frames`, `static`, `bones`, `curves`, `cm_nv`, `lbs`
  - `muscles`, `readout`, `bar`, `cop`, `heel`, `tip`, `zc`, `LQ`
  - `bw`, `mbar`, `arm`, `rep`, `pd`
- **Geometry:**
  - 15 bone groups, 118 muscles, 54 curves, 20,275 trunk-LBS vertices, 691 intercostal vertices.
  - 11 body frames sampled at S = 41 depths.
  - Positions are int16 quantised (`value*s+c`). Curve points are int16 × 5e-5 m with a +0.8 y offset. Curve quaternions are raw int16, normalised after every lerp.
  - Per-vertex arrays carry muscle index (`*_mid`) and tendon weight (`*_tw`).
- **Per-muscle data:** `act = [lowering[41], drive[41]]` as uint8; `len[41]`; `mode`.

### What a second movement costs (as documented)

Per `docs/onboarding/NEW_MOVEMENT.md` and the pipeline docs:

- The documented path is: new stages (own poses, frames, curves, activation) → a new `<movement>.html` → the extractor (`web/scripts/extract-squat-data.mjs`) → two data files.
- **Stated blockers:**
  - "Some squat data has no generator. It comes from the v1 page, whose code was lost… A new movement would need its own route to that data: frames, curve definitions, static foot matrices."
  - Stages run in local Python; Claude chat can only read them.
- **Runtime gaps stated as squat-specific:**
  - Depth parameter `S` is "standing → bottom" with lowering/drive directions (`depth.js`).
  - Barbell is always built from `meta.bar`; needs to be optional or data-driven.
  - The 11-region map (`muscleRegions.js`) is keyed by index into `meta.muscles`.
  - The activation bands are the model's own ramp stops.
  - All coaching content, `repSummary.js`, the route, the assets and the bundle gates are hard-wired to `/squat` and `squat-anatomy-*.bin`.
- **Checklist when data is regenerated:** re-derive `REGION_OF` and the 118-row table in `muscleIndex.test.js`; recheck slug uniqueness; recheck `activation.test.js` band counts; re-run the `poseModel.test.js` fixture; run `npm run build && npm run size`; update the pins in `dataAsset.js`; and update PROVENANCE.md.
- **Movement-specific hardcoding I found in the pipeline:**
  - Bar position (`v3/bar_seat.npy`, `bar_push`) and kinetics body mass (`BW=85`, `MBAR=100`).
  - A 21-DOF arm solve with a grip target (MC3 z = 0.40 m) and ISB limits.
  - Phase logic: a 1.6 / 0.47 / 0.9 m/s² soft-min, a velocity dip centred at 17.5 cm, and the 22 cm sticking cut for activation.
  - Activation mode factors (0.62 / 0.82 / 1.0 / 0.95) and a high-bar-specific CLAUDE.md axis convention.
  - The `META.frames` list (pelvis, L5–L1, thorax, right femur/patella/tibia/talus).
  - `fetch_stl.sh`'s default 14 ids.
- **Roadmap items in `docs/ROADMAP.md`:** items 2–10 are squat-specific features (variants, faults, load/tempo, importer). Item 1 (pipeline hygiene, #402) is marked done.

---

## 4. Licensing and provenance

| Document | What it says |
|---|---|
| `LICENSE` (15 lines) | "Copyright (c) 2026 Scott. All rights reserved." Proprietary. No permission to use, copy, modify, publish or distribute except with the holder's prior written permission, recorded in PERMISSIONS.md. Files listed in NOTICE.md are excluded and carry their own licences. |
| `PERMISSIONS.md` | One grantee, **Paul** (2026-11-04). GitHub username "to be added". For personal, non-commercial use he may use, copy, modify, build on and publish, with no conditions attached; credit is appreciated, not required. Commercial use needs Scott's OK. Third-party material keeps its own licence. It excludes Scott's personal material (`coach/`, personal parts of CLAUDE.md). It is personal to Paul and does not make the repo open source. |
| `NOTICE.md` | **CC BY-SA 2.1 JP** covers `squat-anatomy.bin` and `squat-manifest.json`, and the pipeline's geometry-bearing stage outputs (`pipeline/v3/base.html`, `*.npy`, `*.npz`, `*.pkl`). The pipeline's own code is under the root LICENSE. The STLs are not committed. The squat tool credits BodyParts3D "on every screen that can show the anatomy". |
| `web/src/squat/assets/LICENSE.md` | Covers exactly the two data files. Says the derived data is shared under the same terms; reuse requires crediting BodyParts3D © DBCLS, stating changes were made, and sharing under the same licence. Says the code that reads the files is under the root LICENSE. |
| `docs/squat/PROVENANCE.md` | Source: squat-anatomy v3, input `dist/squat.html` sha256 `02e1d133…6021749` (3,144,712 bytes). Extraction by `web/scripts/extract-squat-data.mjs` (reads HTML as text; evaluates nothing). **One hand edit:** `meta.muscles[9].role` (Rectus femoris), 2026-11-05, an EMG claim removed. It was edited in both `squat-manifest.json` and `pipeline/.../v3/base.html`, then `dataAsset.js` and the fixture's `manifest_sha256` were re-pinned. |

### Obligations satisfied

- **Attribution:** the credit renders on every state via `AttributionFooter` and is asserted by a test.
- **Same licence on derived data:** stated in NOTICE.md and LICENSE.md.
- **"Changes were made":** stated in `LICENSE.md` and PROVENANCE.md.
- **Provenance pins:** sha256 and byte counts for both files, test-enforced.

### Obligations open

- **OpenSim / SimTK terms:**
  - Rajagopal 2016 and Lai 2017 are shown on SimTK as "MIT Use Agreement", but **the agreement's full text "was not read"**.
  - Uhlrich 2022 is listed as Apache-2.0 via `stanfordnmbl/opencap-core`, but that this is the route the source project used is "unconfirmed".
  - `opensim-org/opensim-models` states no licence.
  - VISION.md calls this an open item before any wider distribution.
- **OpenCap lab data:** no data is committed because "its licence terms are not yet verified" (LAB_DATA.md).
- **Strava terms:** the epic notes API terms "reportedly" bar showing a user's Strava data to anyone but that user, from secondary sources only.

### What share-alike attaches to

- The two data files, and anything derived from them (3D models made from them, per PERMISSIONS.md).
- The pipeline's geometry-bearing caches.
- **Not** the code that reads the data. The root LICENSE says so explicitly. Share-alike on adaptations of the data is the open question for any second movement built from the same BodyParts3D meshes (inferred; the docs state the requirement but not a position on new movements).

---

## 5. Bundle and performance budgets

Constants are read from `web/scripts/check-bundle-size.mjs`; **not re-measured**, since no build was run.

| Constant (line) | Value | Meaning |
|---|---|---|
| `MAX_ENTRY_GZIP_KB` (75) | 150 | Dashboard first paint: main + `AuthGate` static graph + CSS |
| `MAX_TOTAL_GZIP_KB` (76) | 400 | Every asset except squat-only files |
| `MAX_SQUAT_ENTRY_GZIP_KB` (108) | 117 | main + `SquatApp` static graph |
| `MAX_SQUAT_TOTAL_GZIP_KB` (109) | 30 | Squat-only JS minus the 3D chunk |
| `MAX_SQUAT_3D_GZIP_KB` (113) | 145 | Files reachable only via `createAnatomyScene.js` (three r187 tree-shaken, OrbitControls, scene) |
| `MAX_SQUAT_DATA_BYTES` (116) | 2,300,000 | The anatomy `.bin` |
| `MAX_PRECACHE_FILE_BYTES` (117) | 2 × 1024 × 1024 | Workbox ceiling; the script fails any precached file above it |

Script comments (dated, not current) put the squat entry at 116.4 of 117 KB, with "0.6 KB spare… the next change of any size will fail it".

### Which budget a second movement or a richer 3D feature would hit first

Inferred from the script and measured headroom:

- `SQUAT_ENTRY` is the tightest (comments say 0.6 KB spare). Anything added to the static graph of `SquatApp` hits it.
- A second `.bin` is blocked by structure, not only size. The script (`check-bundle-size.mjs:260`) asserts **exactly one** `squat-anatomy-*.bin`, and `SQUAT_DATA` matches that single name pattern.
- Against the 2.3 MB cap, the current `.bin` leaves about 97,832 bytes (2,300,000 − 2,202,168). A second whole-body dataset of similar size would exceed it (inferred).
- The `.bin` is already above 2 MiB (2,202,168 > 2,097,152), which is why it must never be precached (inferred from the script's ceiling check).
- `SQUAT_3D` has about 7 KB spare against the comment's measured 138.2 KB. A three.js bump or a new scene feature would hit it.

### Squat chunk exclusion from precache and the APK

- **Naming:** `chunkFileNames` in `vite.config.js:166` calls `squatChunkFileNames` from `scripts/squatChunks.mjs`. A chunk is `squat-*` only if **every module** is under `/src/squat/`, `/src/anatomy/` or `/node_modules/three/`. Worker entries are also `squat-*`.
- **Precache exclusion:** `SQUAT_GLOB_IGNORES = ['**/squat-*.{json,bin}', '**/assets/squat-*.js']` (`vite.config.js:91`).
- **Runtime caching:**
  - `squat-data` (`CacheFirst`, `maxEntries: 4`, status 200).
  - `squat-code` (`SQUAT_CODE_ROUTE`: `CacheFirst`, `maxEntries: 30`, 30 days).
  - `supabase-api` (`NetworkFirst`, 3 s timeout, 50 entries, 300 s).
- **APK:** `.github/workflows/ci-android.yml:111` runs `rm -f dist/assets/squat-*` before `cap sync`.
- **Invariants checked by `npm run size`:** the squat-only JS set equals the `squat-*` set, `sw.js` precaches no `assets/squat-` file, and the service worker still serves `index.html` for navigations.

---

## 6. The training-log side

### Tables created by migrations (000–013)

22 migration files (14 numeric prefixes; `011` is used by two forward migrations).

**15 tables:** `sessions`, `vitals`, `exercises` (000); `coach_log`, `anchors` (006); `templates`, `template_exercises`, `strength_workouts`, `workout_assignments`, `strength_sets`, `exercise_media`, `exercise_prefs` (007); `strava_tokens`, `strava_oauth_state`, `strava_sync_state` (012).

- `coach_messages` (002) is dropped by `013_drop_coach_messages.sql`, which has a rollback.
- **One view** in migrations: `strength_set_metrics` (007:199; volume and Epley e1RM, warm-ups excluded).
- CLAUDE.md's "14 tables, 23 migrations" is therefore stale.

### Live objects with no migration in the repo

Facts from the epic's 2026-11-06 live reads, not re-queried by me:

- `bp_readings` (0 rows).
- `backup_snapshots`. It is referenced in `011` and `013` comments, with no `CREATE` in the repo.
- Views read by the client: `exercise_with_media` (`StrengthLogger.jsx:1332`), `exercise_last_performance` (`:395`), `exercise_prs` (`:1530`, `useStrengthPRs.js:17`). A grep of `supabase/` for all three returns nothing.
- Live row counts (epic line 289): exercises 873, exercise_media **0**, exercise_prefs 0, sessions 98, strength_workouts 18, strength_sets **2**, templates 5, template_exercises 27, workout_assignments 1, vitals 157, coach_log 8.

### RLS and policy shapes (from the migrations)

| Table(s) | Shape |
|---|---|
| `sessions`, `vitals` | RLS on; four per-command policies `auth.uid() = user_id` (`001_enable_rls.sql`) |
| `exercises` | RLS on; `SELECT TO authenticated USING (true)` (shared reference, no user_id) |
| `templates`, `template_exercises`, `strength_workouts`, `strength_sets`, `workout_assignments`, `exercise_prefs` | One `FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())` policy each |
| `exercise_media` | `SELECT TO authenticated USING (true)`; no write policy |
| `coach_log`, `anchors` | `FOR ALL` owner policy; `anchors` has a partial unique index `(user_id,key) WHERE superseded_at IS NULL` |
| `strava_tokens`, `strava_oauth_state` | RLS **enabled and FORCED**, **no policies**, `REVOKE ALL` from public/anon/authenticated. Only `service_role` reaches them. |
| `strava_sync_state` | RLS on; **SELECT-only** owner policy; all writes via `service_role` |

### Exercise library facts

- **`exercises` ids are text in live data.** `000` created `id uuid` with `name, category` only. `007` references `exercises(id)` as `text` (`exercise_id text` in `template_exercises`, `strength_sets`, `exercise_media`, `exercise_prefs`). The client selects `id,name,equipment,primary_muscles,category` and `secondary_muscles` via the media view. **The live schema and 873-row seed are not reproducible from migrations** (epic research §7, confirmed by my read of 000 vs 007).
- **Link to an anatomy dataset: none today.** `exercise_media.model_3d_key text` and a `media_tier` check allowing `'fallback' | 'video' | 'model3d'` exist (`007:106-110`). **No client code reads `exercise_media` and no code reads `model_3d_key`** (grepped `web/src` and `supabase/`; the only hits are the migration and the epic docs). Live `exercise_media` has 0 rows.
- The only existing exercise-to-muscle connection is `exercises.primary_muscles` / `secondary_muscles` (text arrays, live).

### `StrengthLogger.jsx` (1,682 lines)

- A large imperative-DOM component (`$('#sheet')`, `innerHTML` templates, injected CSS) mounted lazily from `App.jsx:20,402` and from `views/mobile/MobileTrain.jsx:33`.
- Header comment: "873-row library, muscle-heatmap + animated movement demo, history/PRs".
- Supabase access: `exercise_prefs`, `workout_assignments`, `templates`, `template_exercises`, `exercise_last_performance`, `strength_workouts`, `strength_sets` (insert at `:928`), `exercises` (search at `:1140`), `exercise_with_media`, `exercise_prs`.
- It draws a **2D SVG body** (viewBox `0 0 470 426`, elements with `data-muscle`). `applyHeatmap(rootEl, primary, secondary)` colours them with three tokens (`critical`, `caution`, `neutral`). Demo images come from `cdn.jsdelivr.net/gh/yuhonas/free-exercise-db`.
- **Test state:** excluded from coverage (`vite.config.js:213`, issue #79). The only test touching it is `src/__tests__/strengthLoggerHeatmap.test.js`, which asserts on the **source text**. The component has no behavioural tests.

### The strength views (#222)

- `StrengthView.jsx` takes its trend as a prop. `App.jsx:98-136` defines `strengthTrend` as a hardcoded literal, 8 lift series of `{date, e1rm}` (the epic says nine; I count eight keys). VISION's cull list names `strengthTrend`.
- `StrengthView` also renders `STRENGTH_TEMPLATES` and `PREHAB_NOTE` from `constants/exercises.js`.
- `MobileStrength.jsx` uses `useStrengthPRs`, which queries the `exercise_prs` view for names in `PRIMARY_LIFTS` (Back Squat, Bench Press, Deadlift, Romanian Deadlift, Overhead Press, Bent Over Row).
- **Name mismatches (fact):** `StrengthView`'s `LIFT_COLOR` uses 'Barbell Row' and 'Shoulder Press', while `PRIMARY_LIFTS` uses 'Bent Over Row' and 'Overhead Press'. The epic flags the mismatch as an empty-state risk (slice 10 criterion 5).
- **Can show:** per-lift e1RM line (from a literal, not the DB), session list, templates, PRs for the six named lifts (from a view with no migration).
- **Cannot show (no code):** per-set history from the DB in `StrengthView`, volume trends, any link to the anatomy model.

---

## 7. Multi-user posture

- **Auth:** `AuthGate.jsx:35` uses only `supabase.auth.signInWithPassword` (email and password). There is no `signUp`, OAuth, OTP or reset flow in `web/src`. `supabaseClient.js` is a 5-line `createClient(url, anonKey)`.
- **RLS:** owner-only `user_id = auth.uid()` on everything user-scoped (see §6).
- **Strava (multi-user-correct by design):**
  - `strava-connect` and `strava-sync` are deployed with JWT verification **on**.
  - They take the user id from the gateway-verified bearer's `sub` via `_shared/jwtSubject.ts`. That file states it does **not** verify the signature and must never be used by a `--no-verify-jwt` function.
  - The OAuth callback uses a single-use state stored as a SHA-256 hash.
  - **The four `strava-*` functions are not deployed** (epic §2, live function list).
- **Single-user by assumption:**
  - `vitals-import`, `vitals-import-api` and `vitals-sync` read `Deno.env.get("VITALS_USER_ID")` (e.g. `vitals-import/index.ts:58`). The jwtSubject comment calls the pattern "silently wrong the day a second user exists".
  - Personal constants still in the tree (VISION cull list, not yet removed): `constants/coaching.js`, `program.js`, `schedule.js`, `logs.js` (health data, also in a public precache chunk per the epic), `nutrition.js`, `mobility.js`, `trainingConfig.js`; `utils/analysis.js`, `utils/schedule.js`. Views `ProgramView`, `JournalView` and `RecoveryView` consume them.
  - `App.jsx` `strengthTrend` literal; Android `appName` "Erg Dashboard".
- **Coach–athlete relationship, sharing, roles, public profiles: none exist.**
  - Grepped `web/src` and `supabase/` for `coach_id`, `athlete_id` (only the Strava numeric athlete id), `profiles`, `user_roles`/`app_metadata`, `invite`, `share_token`/`shared_with`/`sharing`, `navigator.share` and `is_public`: no matches except the Strava ones.
  - A non-ARIA `role` grep finds only `meta.muscles[].role` prose.
  - Every `coach_*` name is the "Coach (Claude) lane" of the single owner: `sessions.coach_note`/`coach_flag`, `workout_assignments.coach_note`, and `coach_log.author in ('coach','scott')` (`006`).
- **`exercise_media`** and **`exercises`** are the only shared-read tables (`SELECT … USING (true)` for authenticated).
- **CSP** (`web/vercel.json`): `default-src 'self'`, `img-src 'self' data:`, `connect-src` only self, `*.supabase.co`, `wss://*.supabase.co` and `*.ingest.de.sentry.io`. `StrengthLogger` loads images from `cdn.jsdelivr.net`. I did not test it, but this looks blocked by `img-src` (inferred).

---

## 8. Platforms

- **PWA:**
  - `VitePWA` with `registerType: 'autoUpdate'` (`vite.config.js:78`).
  - Manifest name/short_name "SplitIQ", description "Performance intelligence for serious athletes.", `display: 'standalone'`, `orientation: 'portrait'`, `scope: '/'`.
  - `globPatterns` `**/*.{js,css,html,ico,png,svg,woff2}`; `globIgnores` squat; runtime rules as in §5.
- **Routing/hosting:** `vercel.json` rewrites `/squat/assets|icons|registerSW.js|manifest.webmanifest` back to root paths, then `/(.*)` to `/`. `RouteRoot` canonicalises `/squat/` to `/squat` with `replaceState` before the load event so the SW registers at root scope.
- **Capacitor Android:**
  - Dependencies: `@capacitor/android`, `app`, `core`, `local-notifications`, `network`, and `@capgo/capacitor-bluetooth-low-energy` (for PM5).
  - `capacitor.config.json`: `appId com.ergdashboard.android`, `webDir dist`, `androidScheme https`.
  - `ci-android.yml` builds web, strips `dist/assets/squat-*`, runs `cap sync android`, then `./gradlew :app:assembleDebug`. **Debug APK only.**
- **Does `/squat` ship in the APK? No.**
  - The assets are stripped.
  - `RouteRoot.jsx` `onSquat()` returns false when `Capacitor.isNativePlatform()`.
  - The workflow comment says the APK "never routes to /squat".
- **iOS:** no `@capacitor/ios` dependency and no `web/ios` directory. README says "PWA for iOS/web". The Safari `var()`-in-SVG-attribute caveat is noted in the heatmap test. No other iOS-specific code was found.

---

## 9. What the reorientation epic (#412) is removing

Source: `coach/REORIENTATION_EPIC_2026-11-06.md` §4. Sub-issues: 1→#413, 2→#414, 3→#415, 4a→#416, 4b→#417, 5→#418, 6→#419, 7→#420, 8→#421, 9→#422, 10→#423, 11→#424, 12→#425.

| # | Slice | Status in this tree |
|---|---|---|
| 1 | Land VISION, re-brief the agents (rewrite `erg-context.md` §Project, `AGENTS.md:43`) | **Shipped**, `b920073` (#426) |
| 2 | Retire the coach client (`useCoach`, `CoachView`, tab/destination entries, `TSB_BANDS[].signal`) | **Shipped**, `79f5629` (#427). `useCoach.js` and `CoachView.jsx` are absent from `hooks/` and `views/`. |
| 3 | Retire the coach backend (undeploy `coach-chat`, drop `coach_messages`, delete the function dir) | **Shipped**, `0d8c204` (#430). `supabase/functions/coach-chat` is absent; `013_drop_coach_messages.sql` and its rollback exist; `web/scripts/check-no-llm-path.mjs` plus `no-llm-path.yml` exist. The epic's own Status line still says slice 3 is "at Gate 3 as PR #430", so it lags git (inferred from the merge commit). |
| 4a | Health data out of source and bundle (`logs.js` exports, `RecoveryView` prose) | **Not shipped**: `constants/logs.js` and `RecoveryView.jsx` are still present |
| 4b | Health records in DB (`bp_readings` migration, new typed tables) | Not shipped |
| 5 | Delete Program and Journal tabs (`ProgramView` 1,958 lines, `views/program/*`, `JournalView`, `constants/program.js`) | Not shipped (files present) |
| 6 | Benchmarks (`EVENT_LADDER`, `useBenchmarkStatuses`, `benchmarkStatus.js`, `eventWindow.js`, `BenchmarkBadge`/`LinkControl`) | Not shipped (files present). Decision D13 is "cull" but moderate confidence. |
| 7 | Calendar and `utils/schedule.js` (roster logic, `SESSION_OVERRIDES`, `MICROCYCLE`, `SEASON*`) | Not shipped |
| 8 | Overview (adaptive engine, prescription, phase, nutrition; delete `analysis.js`, `coaching.js`, `nutrition.js`) | Not shipped |
| 9 | Personal calibration (`CRITICAL_POWER`, `POWER_DURATION`, `HR_ZONES`, …; `derivePaceZones` stays) | Not shipped |
| 10 | Mobility and strength literals (`strengthTrend`, rehab copy) | Not shipped |
| 11 | Doctrine and docs rewrite (one PR touching `CLAUDE.md` and `training-science.md`) | Not shipped |
| 12 | Design-sync docs | Not shipped |

**Do not re-add:** the VISION cull list (§3 of VISION.md):
- the LLM coach (`coach-chat`, Coach tab, `coach_messages`)
- microcycles, rosters and the annual arc (`constants/schedule.js`, `utils/schedule.js`)
- athlete background and event pathway (`constants/program.js`)
- adaptive rules (`constants/coaching.js`)
- personal calibration and absolute-bpm HR bands (`trainingConfig.js`; keep `derivePaceZones`)
- macro and meal programme (`constants/nutrition.js`)
- health logs, decision log, hypotheses, niggles (`constants/logs.js`)
- rehab routines (`constants/mobility.js`)
- inline medication/weight-loss content (`RecoveryView.jsx`)

**What VISION keeps:** the load model (CTL/ATL/TSB, `sessionLoad`, `computeReadiness`, `derivePaceZones(cp)` with calibration from `anchors`), the data model, `/squat` and `anatomy/` entire, the design system and the CI discipline.

**Epic out-of-scope list:** new flagship movements (deadlift, bench, row, press), the exercises-to-anatomy link, Strava deployment, the SimTK licence read, the `exercises` seed and `exercise_prs` view migration, rewriting git history, in-app health-entry forms, and `STRENGTH_TEMPLATES`.

VISION.md "Flagship movements, not a catalogue": a handful of compounds done properly (back squat shipped; deadlift, bench, row and overhead press "obvious candidates"); the library links to a dataset where one exists and stays plain text elsewhere.

---

## 10. Collaborator and onboarding surface

- **Docs:** `docs/onboarding/` has `START_HERE.md` (94 lines, GitHub-beginner path), `README.md` (191, technical guide), `PROMPTS.md` (184, copy-paste chat and Claude Code prompts) and `NEW_MOVEMENT.md` (131).
- **`/collaborate` skill** (`.claude/skills/collaborate/SKILL.md`): collaborator mode for a non-professional.
  - Hard rules:
    - Never push to `skizzy1986/erg-dashboard`.
    - Work on local `explore/<topic>` branches.
    - Never modify `main`.
    - Stay in `web/src/squat/`, `web/src/anatomy/`, `docs/squat/`, `docs/onboarding/`.
    - No secrets and no personal data.
  - It posts ideas via GraphQL to Discussions categories `ideas`, `show-and-tell` and `q-a`.
- **Discussions:** templates exist (`.github/DISCUSSION_TEMPLATE/ideas.yml`, `show-and-tell.yml`). The idea format asks for Area, Problem, Idea, Who it's for, Size, Prototype link, and "When this ships, a user can…" with acceptance criteria. The README says not to open issues directly for ideas.
- **Who can contribute:**
  - Collaborators have read access, a fork, and PRs from the fork. Scott reviews and merges.
  - Paul is the only person named in PERMISSIONS.md.
  - `/squat` runs with an empty `.env` because a test pins that it never imports `supabaseClient.js`.
- **Stale in these docs:**
  - `docs/onboarding/README.md:44` still lists PR2b as "next"; git log shows PR2b-i merged (`f268f40`, #401).
  - README.md describes the dashboard as including an "AI coach" (`:46`, coach removed in slices 2–3), and the dashboard as "Scott's personal… system".
  - `CLAUDE.md` is still pre-pivot (VISION.md says so itself).
- **Gaps noted by the README as ideas not code:** sharing/embeds for coaches, a printable coaching card, a clothed body with an x-ray mode.

---

## 11. Test and CI assets

- **Vitest:** my run in `web/` was 123 files, 1549 tests, all passing, 52.9 s. The epic's earlier baseline was 125 files and 1,591 tests (before slices 2 and 3). Test files: 119 under `src` by name pattern (`find`), of which 21 are in `src/squat/__tests__` and 13 in `src/anatomy`.
- **Coverage ratchet** (`vite.config.js:228+`): global lines 89 / functions 85 / branches 80 (epic measured 93.57 / 89.59 / 85.14 on 2026-11-06). `anatomy/utils/**` is 95/95/90. There are many per-file 80/80/70 keys (not counted), including some for files the epic slices will delete (e.g. benchmark files). Per the epic, a per-file key matching no file is silently ignored by this Vitest version.
- **Coverage excludes:** `StrengthLogger.jsx`, `main.jsx`, `constants/**`, `test-setup.js`, `squat/assets/**`, `anatomy/scene/**` (needs WebGL), and `__tests__/fixtures/**`.
- **Playwright e2e:**
  - `web/e2e/` has `smoke.spec.js` (2 `test(` occurrences), `squat.spec.js` (20) and `visual.spec.js` (10, with `visual.spec.js-snapshots`). These are static counts, and parametrised loops expand them.
  - `e2e-web.yml` builds with a stub Supabase.
  - `squat.spec.js` covers the no-Supabase-contact guarantee, axe, the guide dialog, the 3D draw, the listbox, deep links, the heatmap, the mirrored left side (negative determinant), reduced motion, theme recolour, `/squat/` rewrites and a 390 px phone layout.
- **Pipeline tests:** `tests/test_golden.py`, `test_stages.py`, `test_numbers.py`, `test_inputs.py`, `test_cli.py`, `test_no_exec.py` and `test_slow.py` (the IK solves). I did not run them.
- **npm scripts:** `check:zones`, `check:design-sync`, `check:colours`, `check:context7`, `check:no-llm`, `size`.
- **Workflows (22 files):** add-to-project, ci-android, ci-functions, ci-pipeline, ci-web, claude, codeql, context7-rule, dependabot-auto-merge, dependabot-maintenance, dependency-review, doctrine-sha-guard, e2e-web, hook-smoke-test, labeler, labels, lighthouse, no-llm-path, pr-title-lint, project-board, release, zone-bands. `ci-web.yml` has Lint & Format, Test & Coverage, and Build (which includes the bundle budget and a PR comment).
- **Edge-function tests:** Deno `test.ts` files exist in `strava-import`, `vitals-import` and `vitals-import-api`; `ci-functions.yml` runs them. The epic says `vitals-sync` still lacks tests.

---

## 12. Gaps (facts only)

Each says what was grepped. I did not rank these or recommend anything.

- **No second movement dataset exists.** The only data pair is `squat-*`; grep for `deadlift|bench press|overhead press` in `web/src/squat` and `web/src/anatomy` returned nothing.
- **No movement config object exists.** Grep for `movement` in `anatomy/` and `squat/` finds only a comment in `arrays.js`. The shape is only sketched in `RESEARCH_BRIEF.md` §6 and `NEW_MOVEMENT.md`.
- **No time-based playback.** Grep for `playback|autoplay|isPlaying|requestAnimationFrame` in the squat code finds only prose/constants. `meta.rep` data is present but unused by the UI beyond summaries. The onboarding README lists "PR3 playback timeline, charts" as planned.
- **No charts or graph tabs in `/squat`.** `GRAPH_TAB_IDS` exists in `squatRoute.js` as hash-validation data only (inferred as pre-wiring).
- **No measured-rep importer.** The `.mot`/OpenCap grep hits only prose in `references.js`, `method.js` and `guide.js` (`MEASURED_PANE.comingSoon`). No `ref_bands` or `reference_curves` exist.
- **No glTF, FBX or rigged or clothed body.** Grep for `gltf|glb|GLTFLoader|FBX|skinnedmesh` returned nothing. The `body` layer in `setLayers` is empty by design.
- **No variants** (low-bar, front squat), no fault library, no ghost overlay, no load or tempo controls (ROADMAP items 6–9 are unbuilt).
- **No video or pose input.** Grep for `getUserMedia|MediaPipe|pose-detection|tfjs` returned nothing.
- **No WebXR** (grep `webxr|navigator.xr`).
- **No share or export of a view.** Grep for `navigator.share` returned nothing. `toBlob|toDataURL|captureStream|MediaRecorder` hits only unrelated files (`tokens.js`, `program.js`, `logs.js`, `LogView.jsx`, `OverviewView.jsx`). The only shareable state is `#m=` plus `#guide/t/tab/paused` in the URL hash.
- **No annotation or comment feature** (grep `annotat|comment` in `web/src/squat` returned nothing).
- **No link from an `exercises` row to an anatomy dataset.** The `model_3d_key` column exists, but nothing reads it and live `exercise_media` has 0 rows.
- **No coach–athlete or sharing data model, roles, or profiles** (see §7).
- **No sign-up, OAuth or password-reset flow** (grep `signUp|signInWithOAuth|signInWithOtp|resetPassword`).
- **No per-user anatomy parameters.** `bw=85` and `mbar=100` are pipeline constants baked into the data; there is no anthropometry scaling in the runtime.
- **No iOS native project.**
- **No i18n or localisation code was inspected or found** (not specifically grepped; the squat prose is hardcoded English in constants).
- **No reproducible seed for `exercises`** and no migration for the three views the client reads.

---

## 13. Risks and gotchas

1. **`SQUAT_ENTRY` has about 0.6 KB spare** (script comment, dated 2026-11-05; re-measure first). `MuscleList` is deliberately not lazy, so growth there hits the gate.
2. **three.js chunk rules:**
   - Only `anatomy/scene/**` may import `three` (ESLint, plus the bundle check that the scene chunk is not in a first-paint graph).
   - `squat-` chunk-prefix purity is checked: a prefixed chunk reachable from the dashboard fails the build. Any shared module, such as a dashboard hook imported by the squat tool, splits a shared chunk. The code comments record a +0.3 KB entry cost from importing a dashboard hook.
   - three.js is an exact pin (0.187.0); the scene's r128 parity is pinned by source-text tests. A bump can change lighting and slerp behaviour.
3. **Share-alike on derived data.** Any new movement built from BodyParts3D inherits CC BY-SA 2.1 JP on its data files. The pipeline's committed caches are also covered. The OpenSim terms remain unverified.
4. **The prose scan is strict** (§2). New movement prose has to pass: no `\bEMG\b` in muscle roles, no "measured activation", bands not numbers, every number matching REFERENCES.md. The scan is currently hardwired to squat constants and the 118-muscle manifest, so it does not automatically cover new content files.
5. **The 2 MiB Workbox ceiling** applies to anything precached; the squat `.bin` is already above it and is excluded. Any new large asset must follow the `squat-` naming or be excluded. `SQUAT_DATA` expects exactly one `squat-anatomy-*.bin`.
6. **Index-keyed regions:** `REGION_OF` is index-keyed into `meta.muscles`, and slugs are derived from names. Any regenerated manifest breaks both silently, except for the tests that pin sha256 and the 118-row table. Shared `#m=` links break on a renamed muscle.
7. **Pinned data hashes:** `dataAsset.js`, the posing fixture (`raw_sha256`, `manifest_sha256`) and the pipeline golden hash (`GOLDEN_RAW_SHA256`) all move together. A prose edit to the manifest requires editing both the web manifest and `pipeline/.../v3/base.html`.
8. **Non-regenerable pipeline inputs:** `base.html` carries data from a lost generator. The rebuild reproduces decompressed bytes only. The STLs are required for every build, and a GitHub-hosted mirror is the source.
9. **`exercises` has text ids in prod but `uuid` in migration 000.** The seed is unreproducible, and three client-read views exist only in production. A fresh Supabase project cannot be built from the repo (inferred).
10. **Public health data until slice 4a:** the epic reports `logs-*.js` in the precache manifest and fetchable without auth. This predates the pivot work and remains unfixed in this tree (`logs.js` still present).
11. **Cull-list code is still in the tree** and shares files with kept code (e.g. `trainingConfig.js` holds both `derivePaceZones` and the personal calibration). The per-file coverage keys and `check:colours` allowlists reference some of it.
12. **Doctrine batching:** only slice 11 may edit `CLAUDE.md` or `.claude/skills/training-science.md`, because each merge touching them opens a `doctrine_sha` issue. Any roadmap PR that edits `CLAUDE.md` costs an extra issue.
13. **`CLAUDE.md` is stale against the code** (14 tables, coach framing, size figures), and VISION.md says to prefer VISION. CLAUDE.md itself warns never to quote bundle figures.
14. **StrengthLogger is an untested 1,682-line imperative-DOM file** that holds the only existing 2D muscle-heatmap path and the only exercise-library reader.
15. **Strava is not deployed**, and its terms on showing a user's data to others (multi-user or coach views) are unread. The epic marks them as "reportedly" restrictive from secondary sources.
16. **CSP vs CDN images:** `img-src 'self' data:` versus `cdn.jsdelivr.net` image URLs in `StrengthLogger` (inferred blocked; not tested).
17. **Single-user env pinning** in three vitals edge functions (`VITALS_USER_ID`).
18. **Visual and e2e baselines:** `visual.spec.js-snapshots` exist, so UI changes need regenerated baselines (the epic's slice 2 criterion notes this for nav).

---

## Files inspected (absolute paths)

**Docs and policy:**
- `/home/user/erg-dashboard/VISION.md`
- `/home/user/erg-dashboard/NOTICE.md`
- `/home/user/erg-dashboard/LICENSE`
- `/home/user/erg-dashboard/PERMISSIONS.md`
- `/home/user/erg-dashboard/DESIGN.md` (first 40 lines)
- `/home/user/erg-dashboard/coach/REORIENTATION_EPIC_2026-11-06.md`
- `/home/user/erg-dashboard/coach/BACKLOG_AUDIT_2026-11-05.md` (first 60 lines)
- `/home/user/erg-dashboard/coach/REORIENTATION_RESEARCH_2026-11-06.md` (grepped)
- `/home/user/erg-dashboard/docs/onboarding/NEW_MOVEMENT.md`
- `/home/user/erg-dashboard/docs/onboarding/START_HERE.md`
- `/home/user/erg-dashboard/docs/onboarding/README.md`
- `/home/user/erg-dashboard/docs/onboarding/PROMPTS.md` (grepped)
- `/home/user/erg-dashboard/docs/squat/PROVENANCE.md`
- `/home/user/erg-dashboard/docs/squat/ARCHITECTURE.md`
- `/home/user/erg-dashboard/docs/squat/LAB_DATA.md` (partial)
- `/home/user/erg-dashboard/docs/squat/RESEARCH_BRIEF.md` (§6)
- `/home/user/erg-dashboard/docs/squat/REFERENCES.md` (partial)
- `/home/user/erg-dashboard/.claude/skills/collaborate/SKILL.md` (partial)

**Pipeline:**
- `/home/user/erg-dashboard/pipeline/squat-anatomy/CLAUDE.md`
- `/home/user/erg-dashboard/pipeline/squat-anatomy/README.md`
- `/home/user/erg-dashboard/pipeline/squat-anatomy/ARCHIVE.md`
- `/home/user/erg-dashboard/pipeline/squat-anatomy/docs/ARCHITECTURE.md`
- `/home/user/erg-dashboard/pipeline/squat-anatomy/docs/ROADMAP.md`
- `/home/user/erg-dashboard/pipeline/squat-anatomy/requirements.txt`
- `/home/user/erg-dashboard/pipeline/squat-anatomy/scripts/fetch_stl.sh`
- `/home/user/erg-dashboard/pipeline/squat-anatomy/squat/inputs.py`
- `/home/user/erg-dashboard/pipeline/squat-anatomy/squat/cli.py` (first 60 lines)
- `/home/user/erg-dashboard/pipeline/squat-anatomy/squat/geom.py`, `build.py`, `stages/phase3.py` (partial)

**Web source and config:**
- `/home/user/erg-dashboard/web/package.json`
- `/home/user/erg-dashboard/web/eslint.config.js`
- `/home/user/erg-dashboard/web/vite.config.js`
- `/home/user/erg-dashboard/web/vercel.json`
- `/home/user/erg-dashboard/web/capacitor.config.json`
- `/home/user/erg-dashboard/web/scripts/check-bundle-size.mjs`
- `/home/user/erg-dashboard/web/scripts/squatChunks.mjs`
- `/home/user/erg-dashboard/web/scripts/check-no-llm-path.mjs` (header)
- `/home/user/erg-dashboard/web/src/anatomy/**` (all non-test modules, headers or heads)
- `/home/user/erg-dashboard/web/src/anatomy/__tests__/sceneParity.test.js` (head)
- `/home/user/erg-dashboard/web/src/anatomy/utils/__tests__/poseModel.test.js` (head)
- `/home/user/erg-dashboard/web/src/squat/**` (listings; headers/imports of components, hooks and utils; full `utils/manifest.js`, `constants/dataAsset.js`, `constants/attribution.js`, `constants/phases.js`; heads of `activationBands.js`, `muscleRegions.js`, `SquatApp.jsx`)
- `/home/user/erg-dashboard/web/src/squat/__tests__/content.test.js`
- `/home/user/erg-dashboard/web/src/squat/assets/squat-manifest.json` (parsed with python)
- `/home/user/erg-dashboard/web/src/squat/assets/LICENSE.md`
- `/home/user/erg-dashboard/web/src/RouteRoot.jsx`
- `/home/user/erg-dashboard/web/src/AuthGate.jsx` (partial)
- `/home/user/erg-dashboard/web/src/supabaseClient.js`
- `/home/user/erg-dashboard/web/src/utils/squatRoute.js`
- `/home/user/erg-dashboard/web/src/StrengthLogger.jsx` (grepped and sampled)
- `/home/user/erg-dashboard/web/src/__tests__/strengthLoggerHeatmap.test.js` (head)
- `/home/user/erg-dashboard/web/src/views/StrengthView.jsx` (partial)
- `/home/user/erg-dashboard/web/src/hooks/useStrengthPRs.js`
- `/home/user/erg-dashboard/web/src/App.jsx` (lines 95–140)
- `/home/user/erg-dashboard/web/e2e/*.spec.js` (grepped)

**Backend and CI:**
- `/home/user/erg-dashboard/supabase/migrations/000_initial_schema.sql`
- `/home/user/erg-dashboard/supabase/migrations/001_enable_rls.sql`
- `/home/user/erg-dashboard/supabase/migrations/006_context_store.sql`
- `/home/user/erg-dashboard/supabase/migrations/007_strength_subsystem.sql`
- `/home/user/erg-dashboard/supabase/migrations/012_strava_integration.sql`
- `/home/user/erg-dashboard/supabase/migrations/013_drop_coach_messages.sql` (grepped)
- `/home/user/erg-dashboard/supabase/functions/_shared/jwtSubject.ts`
- `/home/user/erg-dashboard/supabase/functions/strava-connect/index.ts` (head)
- `/home/user/erg-dashboard/supabase/functions/strava-sync/index.ts` (head)
- `/home/user/erg-dashboard/supabase/functions/vitals-import/index.ts` (grepped)
- `/home/user/erg-dashboard/.github/workflows/ci-android.yml`
- `/home/user/erg-dashboard/.github/workflows/ci-pipeline.yml` (head)
- `/home/user/erg-dashboard/.github/workflows/ci-web.yml` (partial)
- `/home/user/erg-dashboard/.github/workflows/release.yml` (head)

**Not inspected:**
- Most squat component bodies (listed in §2)
- `docs/squat/SKINNING.md` and the other `docs/squat/` files beyond those cited
- Python stage and model bodies
- Edge-function bodies other than headers
- `web/.design-sync/`
- Remaining workflows
- Everything under `web/src/views/` and `components/` outside the files named above
- Live Supabase (all live figures are quoted from the epic's 2026-11-06 reads)