# Archive: the original squat-anatomy bundles

This folder is the **squat-anatomy** pipeline, the project that generates the anatomy
data the `/squat` tool renders. It was exported from the chat session that originally
built it (2026-11-04) and committed here so the data can be rebuilt and extended.

## What's committed and what isn't

| | In git | Why |
|---|---|---|
| Page sources (`page/`), the Python build (`pipeline/`), harness, scripts, docs, samples | ✅ | Everything needed to understand and rebuild the data. |
| Cached stage outputs (`pipeline/v3/*.npy`, `*.npz`, `*.pkl`, `base.html`) | ✅ about 8 MB | `build3.py` rebuilds the page from these in about a second. `base.html` carries data from the v1 page, whose generator is lost, so it can't be regenerated. |
| 14 BodyParts3D STLs (`pipeline/ext/stl/*.stl`, about 15 MB) | ❌ | Refetch them with `scripts/fetch_stl.sh`. **Every build needs them**, `build3.py` included. |
| The published page (`dist/squat.html`) | ❌ | Rebuild it with `pipeline/v3/build3.py`. |

## The archive release

The original zips are kept, unmodified, as assets on the GitHub Release
**`squat-anatomy-archive-2026-11-04`**:

| Asset | sha256 | Contents |
|---|---|---|
| `squat-anatomy-v3.zip` | `24c9cdb3837cc5ddc26b748853067ba3ee5bd48106111843cd5d180ca8478677` | The full v3 project, as committed here plus the STLs and `dist/squat.html` (sha256 `02e1d133…6021749`, the page `/squat`'s data was extracted from). |
| `squat-anatomy-preserve.zip` | `3de2e8095681ffe31fb02298248ebf589141ff739cc936bbce0781a26caaad71` | Files that existed only in the chat's cloud working folder (details below). |

Check a download with `sha256sum <file>` against the table.

### What's in the preserve bundle
- **`v1/squat_v1.html`:** the v1 page (sha256 `009481f5…`). It's the source of 62 of the
  71 data arrays (59% of the payload), the leg frames, the 43 curve definitions and
  `meta.static`/`cop`/`heel`/`tip`/`zc`. **Its generator can't be recovered.**
- **`v2-root/`:** the v2 refinement scripts and data (arm, grip, kinematics, activation,
  repack). They use absolute paths from the chat's folder, so they won't run as they are.
  `T_arm_all.npy` is needed by `pipeline/v3/regcur.py`.
- **`v3-extra/`:** v3 files the main bundle leaves out. `run_ik2.py` and `armik_x.npy`
  start the arm IK seed chain (`armik_x` → `armik2_x` → `armik3_x` → `armik4_x`), plus
  the build logs.
- **`fixture-tooling/`:** what produced
  `web/src/anatomy/utils/__tests__/fixtures/squat-skinning-fixture.json` and
  `docs/squat/SKINNING.md`. `harness/fixture.js` and `fullset.js` drive `skin/page_dbg.html`,
  which is the page with a `window.__dbg` hook added. `skin/make_doc.py` assembled
  SKINNING.md.

## Verified on 2026-11-04
Starting from this committed folder plus `scripts/fetch_stl.sh`, running
`python3 page/assemble.py && python3 pipeline/v3/build3.py page/template.html dist/squat.html`
reproduces the app's data exactly. The decompressed data matches byte for byte (3,450,003
bytes, sha256 `eb15d943…93b6be`), and so does the parsed manifest.

The rebuilt **HTML file** isn't byte-identical to the archived one, because a different
zlib produces a different gzip stream for the same data. The bundle's README promises
"byte for byte". That holds only on the same zlib, so judge a rebuild by its decompressed
data. The app's posing-fixture guard does exactly that (`raw_sha256`).

The fetched STLs were byte-identical to the archived originals.
