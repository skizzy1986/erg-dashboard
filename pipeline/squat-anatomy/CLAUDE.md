# CLAUDE.md — working rules for this repo

This repo builds one self-contained HTML page (`dist/squat.html`): a 3D, phase-resolved coaching model of a high-bar back squat. Read `README.md` for the build and `docs/ARCHITECTURE.md` before touching data or skinning code.

## Golden rules

1. **Never hand-edit the data blob.** The `<script id="squat-manifest">` JSON and the `<script id="squat-data">` base64 blob are written by `squat/repack.py:save()`. Change data in the pipeline, then rebuild.
2. **Edit the page in `page/`, not in `dist/`.** Then `python -m squat build` (from `pipeline/squat-anatomy/`).
3. **Modelled vs measured.** Anything computed by the model is labelled as modelled or estimated in the UI and docs. Never present estimated activation as EMG, or the reference rep as a recording.
4. **Every reference range needs a source.** Add new targets to `docs/REFERENCES.md` with the citation, and cite them in the guide (`page/2-markup.html`, Sources pane) and in the form check or metrics table (`page/4-ui.js`). If no study gives a number, say "coaching standard".
5. **Keep the rebuild deterministic.** `gzip(mtime=0)`, fixed seeds. If a change alters `dist/squat.html`, that should be the intended effect of the PR. `tests/test_golden.py` pins the data; a PR that moves it moves the golden sha, `web/src/squat/constants/dataAsset.js`, the `poseModel.test.js` pins, the re-extraction + `docs/squat/PROVENANCE.md` and `tests/test_numbers.py` together.
6. **Verify before claiming done.** Render with the harness at 1440×900 (light), 1280×820 (`DARK=1`), and 390×844 (phone), look at the screenshots, and run `evalpage.js` to confirm zero page errors. Check the numbers you changed against `docs/REFERENCES.md`.

## Conventions

- Units: metres, seconds, degrees, N·m. Moments are per leg except L5/S1 (whole trunk). The UI shows N·m and N·m/kg (body mass 85 kg).
- Axes: +x anterior (the lifter faces +x), +y up, +z to the lifter's right. Right-side meshes are stored; the left side is the same geometry under `scale.z = -1`.
- Depth parameter `S` in [0, 1] has 41 samples. All per-depth tables are indexed by S. Time maps to `(S, phase)` through `META.rep`.
- Phases: 0 brace, 1 lowering (eccentric), 2 bottom (bar within 2 cm of its lowest point), 3 drive (concentric), 4 lockout. Activation tables are `act[0]` (lowering) and `act[1]` (drive), uint8 per depth.
- Shoulder angles follow ISB (Wu et al. 2005), humerothoracic YXY: plane of elevation, elevation, axial rotation. **Do not use swing–twist "twist" as external rotation.** Twist equals plane + axial rotation (Codman), and that mistake nearly shipped once.
- Joint angles in readouts: knee flexion, hip flexion is pelvis-to-femur (it changes by the trunk re-balance angle δ), ankle dorsiflexion, lumbar flexion from standing, trunk lean is the hip-centre-to-shoulder line from vertical.
- Page UI: vanilla JS, three.js r128 from cdnjs (pinned, with an SRI `integrity` hash in `page/2-markup.html`: if you change the version, update the hash from cdnjs), Barlow / Barlow Condensed from Google Fonts. Colours come from CSS tokens in `page/1-head.html` with light and dark values. Chart series use the four validated slots `--s1..--s4`, always in that order.
- Artifact runtime limits: no `alert/confirm/prompt`, no file downloads, no external fetches except CDN scripts and fonts. Files are read client-side with FileReader only.

## Gotchas that cost time before

- Headless rendering needs SwiftShader flags and manual `requestAnimationFrame` stepping (`harness/shot.js` does both). Hide panels with `visibility:hidden`, never `display:none`, or the camera framing changes.
- Fetch BodyParts3D STLs one blob at a time (`scripts/fetch_stl.sh`). `git ls-tree -l` on the blobless clone downloads every blob.
- The femur frame origin is the hip joint centre, but the L5 frame origin is **not** L5/S1. Use `L5S1_REST`, taken from the top of the sacrum.
- After the vertical-bar-path re-balance, the bar rises by under 1 mm between the first two depth samples. `squat/stages/phase3.py` forces monotonic height before inverting it.
- Curve-path muscle lengths are skinning curves, not OpenSim MTU lengths. Vasti dip about 3% past about 100° of knee flexion, and short deep hip rotators are unreliable, so `squat/model/activation.py:NOLEN` excludes them.
- In stacked SVG plots, capture per-plot offsets in a `const` inside the loop (`yb`). A shared `let` broke the playhead dots.
- `[hidden]{display:none!important}` is in the CSS because `.sheet{display:flex}` otherwise beats the `hidden` attribute in local test files.

## When adding features

- New per-depth data goes into `META` in `squat/build.py` and is read in `page/4-ui.js` through `dAt(s, key)` or `lerpArr`.
- New graphs are entries in `TABS` (`page/4-ui.js`). Give each plot `unit`, `min`, `max`, `step`, `dp` and up to four series, `unitLong`, and optional `refs` (bracket `{lo,hi,label}` or line `{line,label}`). The legend shows reference labels, so keep labels off the plot area.
- New form-check items go in `checksFor()`, with a model value, a target with its source, and a measured-file path or an explicit "Not in the measured file".
- Keep phone layout working. The timeline height is computed by `fitTimeline()` from its controls, so do not hard-code `--tl-h`.
