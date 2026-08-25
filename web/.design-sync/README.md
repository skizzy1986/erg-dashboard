# SplitIQ design handoff — Drive drop

Design-owned files, landed here so a code session can pick them up without
waiting on a commit. Updated 2026-08-25.

## What is here

| File | What it is | Read it when |
| --- | --- | --- |
| `HANDOFF.md` | The spec. Token seam (§1), component inventory (§2), per-screen build notes (§4), the one-module rule (§5), order of work (§6). | First, always. §1 blocks everything else. |
| `conventions.md` | The visual rules. Light palette with measured contrast, the eight-size type ladder, chart rules, the six-zone table, the failure modes already paid for. | Before writing any view. |
| `splitiq-light-tokens.css` | The full light token list — 21 ink and structural tokens plus 8 washes, with ratios in the comments. | When wiring the token seam. |
| `splitiq-load.js` | The shared load model as built in the designs: series, EMA constants, `tsbBand()`, `readinessSeries()`, `seasonPlan()`, `ROSTER`, `rosterCheck()`, zone table, erg watts and splits. | When extracting `web/src/lib/load.js`. This is the reference implementation. |
| `ISSUES-load-states.md` | Two issues ready to paste: load pending, load unavailable. | When picking up §6 item 2. |
| `PROJECT-CONTEXT.md` | The mechanics — file ownership, which side owns what, why nothing propagates automatically. | If you are unsure whether a file is yours to edit. |

## What is not here

**The nine compiled designs.** They are self-contained HTML with the fonts and
the design-system bundle inlined, 0.8–1.6 MB each, and too large to land through
this route. They are the visual reference, not an implementation reference —
`HANDOFF.md` §4 carries every decision they encode in words. Ask for the zip if
you need to look at them.

## How to adopt these

They are **design-owned**: this drop is the source, the repo keeps a read-only
mirror. Copy them to `web/.design-sync/` and commit — do not edit them in the
repo, because the next drop overwrites. If something in them is wrong, say so
rather than fixing it in place; the correction has to go back to the design
project or it is lost on the next sync.

`web/.design-sync/conventions.md` on `main` is still the old dark-only text.
The copy here replaces it wholesale — that is `HANDOFF.md` §3.

## Two things worth knowing before you start

- **The typeface is Archivo + IBM Plex Mono.** `STATE_OF_PLAY.md` §4.1 proposed
  Plex Sans + Plex Mono; design overruled it on 2026-08-25. Issue `#254` stands
  as written.
- **The mobile designs still carry hardcoded load numbers** (−8.9 / 16.4 / 25.3)
  while desktop and Coach read the shared model (−8.3 / 50.8 / 59.1). That gap is
  the debt `HANDOFF.md` §5 describes. Do not close it by editing digits — the
  screens should read one `load.js`.
