# SplitIQ design project — read this first

This project holds the light redesign of SplitIQ, the training dashboard for a
single rower. Designs are Design Components (`.dc.html`) at the project root.

## Where things live, and who can see them

| | This project | The repo |
| --- | --- | --- |
| Designs (`*.dc.html`) | ✅ source of truth | ❌ |
| `conventions.md` | ✅ source of truth | mirror at `web/.design-sync/conventions.md` |
| `HANDOFF.md` | ✅ source of truth | mirror at `web/.design-sync/HANDOFF.md` |
| `ISSUES-load-states.md` | ✅ | mirror alongside |
| `github.md` | ✅ sync receipt | ❌ |
| Component source, hooks, maths | ❌ | ✅ source of truth |

**A code session cannot see this project's files.** Its container is cloned from
git, so anything not committed is invisible to it. When a doc here changes and
code needs it, it must be committed to `web/.design-sync/` — present it for
download and say so explicitly. Do not assume the other session can read it.

## Standing rules

- **Read `conventions.md` before designing.** It records lessons already paid
  for — chart scale requirements, the `--color-bg` token trap, percentage
  padding as a vertical position, `sc-for` per-item styles. Add to it whenever a
  new one is found, and tell the user you did.
- **Read `HANDOFF.md` before answering anything about the code.** It carries the
  token seam spec, the component inventory, and the per-screen build notes.
- **Refresh `github.md` on any turn that reads the repo.** Move the previous
  `## Last sync` into `## Sync history`; never delete it.
- **Numbers are computed, never typed.** Any caption stating a count, rank or
  comparison is derived in `renderVals()`. Screens that cite the same reading
  must derive it the same way — Coach and Body share readiness 72, sleep 6.4h,
  RHR 60 because both compute them.
- **Light is primary.** Pastel fills, darker inks, white cards on `#bcc5dd`,
  minimum font weight 500 (Archivo). Dark is dropped.

## Known tension

The bound design system's snapshot still describes SplitIQ as dark-only and sets
`:root{--color-bg:#08080d}`. Every light screen must redefine `--color-bg` in its
own helmet. Until the snapshot is re-synced, its prose disagrees with
`HANDOFF.md` — trust `HANDOFF.md` and `conventions.md`.

## State

All five nav destinations are designed: Today, Train, Progress, Body, Coach.
Undrawn states, in one family — load pending, load unavailable, readiness
NO DATA, chat empty and error. The token seam (`HANDOFF.md` §1) blocks
consistent implementation of everything else.
