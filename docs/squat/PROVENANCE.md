# Squat tool — data provenance

The public squat tool (`/squat`, `web/src/squat/`) ships two data files that
are **extracted, not generated here**. The Python pipeline that builds them
(BodyParts3D meshes, OpenSim-derived muscle paths, kinetics, activation) lives
in the separate `squat-anatomy` project and is deliberately **not** committed
to this repository — nor are its pickles, `.npy` intermediates or headless
harness.

## Source

| | |
|---|---|
| Project | `squat-anatomy`, release **v3** ("perfect form, phases, coaching tool", 2026-11-04) |
| Input file | `dist/squat.html` — the project's single-file build |
| Input sha256 | `02e1d13325fd0902be1751b6410bfc54295acc310bd3e88d6f7d1ab2f6021749` |
| Input size | 3,144,712 bytes |

The page embeds the data in two script tags: `<script id="squat-manifest">`
(JSON) and `<script id="squat-data">` (base64 of a gzip stream written with
level 9, `mtime=0`).

## Extraction

```bash
cd web
node scripts/extract-squat-data.mjs <path-to-squat-anatomy>/dist/squat.html
```

The script reads the HTML as text — it evaluates nothing from the source — and
writes:

| Output | Bytes | sha256 |
|---|---|---|
| `web/src/squat/assets/squat-anatomy.bin` | 2,202,168 | `92437fba2129bc54231aafcaacb462e9f95627f18ffce801c76e8b4b047fe3d1` |
| `web/src/squat/assets/squat-manifest.json` | 99,904 | `c2e7acdc6f6d8ffc687144ac90ab59c9b09bef917ccd639422e6f55ff1a1152a` |

`squat-anatomy.bin` is the gzip stream **byte for byte as base64-decoded** —
never re-compressed — so it decompresses to the same 3,450,003-byte buffer the
source page indexed. `squat-manifest.json` is the manifest JSON re-serialised
compactly (key order preserved). The script is deterministic: re-running it on
the same input reproduces both hashes.

The expected sizes and hashes are pinned in
`web/src/squat/constants/dataAsset.js`, and the content test re-hashes the
committed files against them.

## Updating the data

1. Rebuild `dist/squat.html` in the source project.
2. Re-run the extraction above; it prints both sizes and hashes.
3. Update `constants/dataAsset.js` and the table above in the same PR.
4. `npm run build && npm run size` — `SQUAT_DATA` fails above 2.3 MB.

## Licence

Both files are derived from BodyParts3D and are **CC BY-SA 2.1 JP** — see
`web/src/squat/assets/LICENSE.md` and the repository-root `NOTICE.md`.
