# High-Bar Squat Anatomy

A single-file, browser-based 3D coaching model of a textbook high-bar back squat: full skeleton and musculature (BodyParts3D), muscle paths from the Rajagopal/Lai OpenSim models, a timed reference rep split into phases, graphs synced to the 3D view, a form check against published targets, a coaching guide, and an importer that overlays a measured rep (OpenCap `.mot` or bar-velocity CSV).

- **Live page:** published as a claude.ai artifact ("High-Bar Squat Anatomy", version 3). `dist/squat.html` is the exact published file.
- **Status:** modelled reference rep, not measured data. Activation is estimated from joint load, not EMG. The page says so everywhere it matters.

## Repository layout

```
dist/squat.html            the built page (open directly in a browser)
page/                      page sources, concatenated into page/template.html
  1-head.html              <title>, fonts, CSS design tokens and layout
  2-markup.html            panels, guide content, data placeholders, three.js tag
  3-core.js                data decode + three.js scene, bones, muscle skinning, bar, bar path
  4-ui.js                  rep timeline, readouts, charts, form check, guide, importer, framing, test hook
  assemble.py              writes page/template.html (optional: the build assembles in memory)
squat/                     the Python package: python -m squat build | stage <name> | list | verify
  paths.py, inputs.py      every path (SQUAT_ROOT overrides pipeline/), the pinned fixed inputs and STLs
  model/                   base page, girdle, skin, arm, readouts, curves, kinetics, activation, DQS
  stages/                  balance3, lengths3, phase3, upper3, ik3, ik4, regcur (see docs/ARCHITECTURE.md)
  build.py, repack.py      assemble the page; read/write the manifest + gzip/base64 data blob
tests/                     pytest: golden rebuild, per-stage byte pins, numbers, inputs, no-exec guard
pipeline/                  data only: fixed inputs and cached stage outputs (override with SQUAT_ROOT)
  T_global.npy             BodyParts3D (mm) -> model (m) transform
  ext/stl/                 the 14 BodyParts3D STLs the pipeline reads (scripts/fetch_stl.sh refetches)
  v3/                      stage inputs and cached outputs (see docs/ARCHITECTURE.md)
harness/                   headless Chromium (SwiftShader) render + evaluation scripts
samples/squat_test.mot     synthetic OpenCap-style file for the importer
docs/                      ARCHITECTURE, ROADMAP, PROMPTS, CHANGELOG, REFERENCES
scripts/fetch_stl.sh       fetch any BodyParts3D STL by FMA id without cloning the whole repo
CLAUDE.md                  working rules for Claude Code sessions in this repo
```

## Build

```bash
pip install -r requirements.txt          # pinned numpy, scipy, trimesh, fast-simplification, rtree
scripts/fetch_stl.sh                     # the 14 BodyParts3D STLs, at a pinned commit
python -m squat build                    # page/* + cached stage outputs -> dist/squat.html
python -m squat verify dist/squat.html   # decompressed data sha + manifest vs what /squat ships
```

Run these from this folder. The build reads cached stage outputs in `pipeline/v3/`. `python -m squat list` shows every stage with its inputs, outputs, STLs and runtime, plus the fixed inputs nothing here can regenerate. To regenerate a stage in place (`--in-dir`/`--out-dir` to redirect):

```bash
python -m squat stage ik4         # arm/hand solve with ISB limits + thumb wrap (~3 min) -> armik4_x.npy
python -m squat stage upper3      # bones, upper-body muscles, deltoid/pec rebuild -> upper3.npz
python -m squat stage balance3    # vertical bar path + quasi-static kinetics -> frames3/deltas3/hips3.npy, rows3.pkl
python -m squat stage lengths3    # musculotendon path lengths -> mlen3.pkl
python -m squat stage phase3      # timed rep, ground force, per-depth phase factors -> phase3.npz
```

`regcur` (re-registers the rest bones to the posed arm, producing `Tcur.npy`) also needs the hand-bone STLs listed in `squat/geom.py:BONE_FID` and `T_arm_all.npy` from the preserve bundle; fetch the STLs with `scripts/fetch_stl.sh <ids>`.

Rebuild check: the build reproduces the data `/squat` ships byte for byte (decompressed data sha256 and parsed manifest; the gzip stream itself depends on the zlib build). `tests/test_golden.py` enforces it.

## Test (pytest)

```bash
pip install -r requirements-dev.txt && python -m pytest    # ~5 s; skips STL tests if STLs are missing
python -m pytest -m slow                                   # the IK solves (~3 min each) and regcur
```

CI (`.github/workflows/ci-pipeline.yml`) sets `SQUAT_STRICT_STL=1`, so missing STLs fail rather than skip.

## Render test (headless)

Cloud Claude Code sessions ship Chromium and a matching Playwright. Use those and don't install another Playwright, because a different version won't find the browser. Locally: `npm i -g playwright && npx playwright install chromium`. The harness loads three.js r128 from `harness/node_modules`. `scripts/rebuild.sh` and `scripts/smoke.sh` wrap the commands below:

```bash
cd harness && npm install                 # three@0.128.0
node shot.js ../dist/squat.html ../out/desk '[{"name":"bottom","set":{"depth":1,"view":"side"},"steps":6}]' 1440 900
DARK=1 node shot2.js ../dist/squat.html ../out/dark '[{"name":"drive","set":{"time":2.6,"tab":"moments"},"steps":6}]' 1280 820
node shot.js ../dist/squat.html ../out/phone '[{"name":"m","set":{"time":1.9}}]' 390 844
node evalpage.js ../dist/squat.html "(() => { __squat.set({time:2.55}); __step(2); return __squat.tip('Gluteus maximus'); })()"
```

`window.__squat.set({...})` drives the page for tests: `depth` (0–1), `time` (s), `view` (`side|front|back|three`), `cam {th,ph,r}`, `tgt [x,y,z]`, `heat`, `skel`, `mus`, `tab` (`angles|moments|force|act|len`), `guide`/`pane`, `form`, `measText`/`measName` (load a measured file from a string). `__squat.tip(name)` returns a muscle's tooltip text for the current moment.

## Licences and attribution

Anatomy: BodyParts3D © The Database Center for Life Science, CC BY-SA 2.1 JP. The derived geometry in this repo and the page is shared under the same terms. Musculoskeletal paths: Rajagopal et al. 2016, Lai et al. 2017 and Uhlrich et al. 2022 models via opensim-models. Published values used as reference ranges are listed with citations in `docs/REFERENCES.md`.
