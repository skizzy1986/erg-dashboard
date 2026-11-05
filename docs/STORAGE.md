# Where project material lives

Git holds code, docs and small derived data. Everything else lives in one of the two
places below. Each entry records a sha256 where one exists, so a copy can be checked.

| What | Where | Why not git |
|---|---|---|
| Code, docs, the `/squat` anatomy data (~2.2 MB), the squat-anatomy pipeline and its cached stage outputs | This repo | — |
| Original squat-anatomy exports (`squat-anatomy-v3.zip`, `squat-anatomy-preserve.zip`) | GitHub Release `squat-anatomy-archive-2026-11-04`, mirrored in Drive `SplitIQ/archives/` | ~19 MB of unmodified originals, kept for provenance. Hashes are in [`pipeline/squat-anatomy/ARCHIVE.md`](../pipeline/squat-anatomy/ARCHIVE.md). |
| BodyParts3D STLs | Fetched on demand by `pipeline/squat-anatomy/scripts/fetch_stl.sh` | Public upstream; refetching gives byte-identical files. |
| OpenCap / SimTK lab-validation data | Scott's Google Drive (`06 Projects and Hobbies/SplitIQ/Movements/Squat/LabValidation_withoutVideos`, due to move to `SplitIQ/datasets/`) | Licence not verified ([`docs/squat/LAB_DATA.md`](squat/LAB_DATA.md)). **Never commit it.** |
| Session handoff prompts, research notes, renders and screenshots | Scott's Google Drive, `SplitIQ/` (`handoffs/`, `research/`, `media/`) | Working material, not source. |

## The Drive hub (`My Drive/SplitIQ`)

Scott owns it; collaborators don't have access unless he shares a folder. Its
`00-README.md` lists the folders and their rules:

- `archives/` — originals, never edited, with a sha256 recorded.
- `handoffs/` — named `YYYY-MM topic`, marked `(CURRENT)` or `(SUPERSEDED)`.
- `datasets/` — one folder per dataset, each with a `SOURCE.md` giving its origin and licence.
- `research/`, `media/`.

When you add something there that the code depends on, add a row to the table above.
