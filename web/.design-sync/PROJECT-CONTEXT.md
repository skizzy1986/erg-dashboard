# SplitIQ design project — mechanics

How the two halves of this project work. The style guide is `conventions.md`;
the subject matter is the design system's README. This file is only the plumbing.

Owner: **design** (this project). The repo holds a read-only mirror and never
pushes it back.

## Ownership — one owner, one direction per file

The repo carries `ownership.json` and CI fails on violations.

| Owner | Direction | Files |
| --- | --- | --- |
| **design** | This project is the source of truth. The repo keeps a read-only mirror so a code session can read it; it is **never** pushed back up. | `conventions.md`, `HANDOFF.md`, `ISSUES-load-states.md`, `PROJECT-CONTEXT.md`, the `.dc.html` designs, `splitiq-load.js` |
| **repo** | Code owns it and pushes it down on sync. Do not hand-edit here — the next sync overwrites it. | `CLAUDE.md`, `CODE-TO-DESIGN.md`, the component `.md` docs, the preview stories, the token CSS |
| **local** | Repo-side working notes. Never reaches this project. | build notes, status files, the IA brief |

`conventions.md` is ours to revise freely. It no longer travels automatically:
when it changes, say so and hand the file over for download so the repo's mirror
can be updated. Same for `HANDOFF.md` and `ISSUES-load-states.md`.

## Three opening documents, no overlap

- **`PROJECT-CONTEXT.md`** — the mechanics. How we work.
- **`conventions.md`** — the style guide. How it should look.
- **`CLAUDE.md`** — the subject matter. Glossary, the five destinations, which
  numbers are real, the chart rules. This is now the design system's README,
  and it is repo-owned.

## Neither side can see the other's container

A code session is cloned from git, so anything living only in this project is
invisible to it. When something here changes and code needs it, hand the file
over explicitly — it does not propagate.

## Numbers

- **Training zone bands are derived, never typed.** They come from
  `derivePaceZones(cp)` against a live critical-power anchor, so any watt figure
  written into prose is a snapshot. CI recomputes every published band in every
  tracked markdown file. If a design needs bands, show them as derived.
- **Any caption stating a count, rank or comparison is computed.** CI cannot
  check a design, so this one is on us. In this project the load model lives in
  `splitiq-load.js` and every screen citing form, CTL, ATL, readiness or
  baseline coverage reads it — see `conventions.md`, "One reading, one
  derivation".
- **Contrast ratios published in `conventions.md` are recomputed from the real
  palette.** A ratio written there must be measured or the repo's build fails.

## Palette state

Two separate things, previously collapsed into one sentence:

| | Status |
| --- | --- |
| **Light as the design target** | **Correct and current.** Design new work on the light ground. |
| **Role token names** (`accent`, `positive`, …) | **Not live.** The rename is an open PR. A design referencing those names today resolves to nothing. |

The app still ships dark because the token migration hasn't merged. That is an
implementation lag, not a design instruction. `conventions.md`'s 2026-08-22
banner is the current position and arbitrates; `HANDOFF.md` §1's "dark: dropped,
light is the only theme" is **stale on that specific point** — dark is retained
as a second theme (the erg room is dark at 5am and the live screen wants it).
§1 now carries that supersession inline.

Practical consequence, already in `conventions.md`: the bundled `styles.css`
paints the dark ground with `!important`, so a light artboard must redefine
`--color-bg` in its own helmet.

The ground is **`#bcc5dd`**. `#c3cade` is withdrawn — it appeared only as a
`--color-bg` declaration nothing consumed, and every published contrast ratio is
measured against `#bcc5dd`.

## `CLAUDE.md` duplication

Leave it as it is. The repo's version overwrites it wholesale on the next sync,
so editing it now is discarded work, and until then it is what gets read into
every session here — stripping it to a pointer would leave sessions with less
than they have today. The mechanics content is preserved in this file, which the
sync never touches. After the sync the two divide cleanly: domain briefing there,
mechanics here.

## Design state

All five mobile destinations are drawn — Today, Train, Progress, Body, Coach —
plus the first desktop screen, `SplitIQ Desktop Overview.dc.html` (chosen
direction: 1b Ledger). Undrawn: load pending, load unavailable, readiness
NO DATA, chat empty and chat error. The token seam (`HANDOFF.md` §1) blocks
consistent implementation of the rest.
