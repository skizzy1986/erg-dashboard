# Code → Design Handover (2026-08-24)

*Reciprocal of [`HANDOFF.md`](HANDOFF.md). Paste into a Claude Design session when the two
sides need re-syncing. This is about **how Code and Design stay on the same page** — the
state of the spec against the code, and what each side still owes the other. Visual
direction lives in the handoff and the brief, not here.*

*This is a **dated bulletin**. Read it on re-sync, or when the spec looks out of step with
the app. [`CLAUDE.md`](CLAUDE.md) is the standing context — read that every session.*

---

## Headline: the re-sync is unblocked

The previous edition said **"do not re-sync yet"**, gated on the role rename landing. It
has landed — `#248` is closed, merged as `#277`. Both prerequisites that edition named are
now satisfied:

1. ~~The four-way reconciliation must land first~~ — done. `docs/*.md`, `previews/*.tsx`
   and `config.json`'s `dtsPropsFor` moved in lockstep with the code, so a design session
   no longer receives two token systems in one prompt.
2. ~~Re-sync again immediately after the rename~~ — that is now.

Re-run `node .design-sync/gen-css.mjs` first; it is step one of every sync. Tracked as
`#258`, which also still needs the project *opened* — a separate, human-only step.

**One caveat that outlives the rename.** The bundle currently in the project was built
before any of this. Until it is replaced it holds the old dark `conventions.md` and a live,
stale `PACE_ZONES` frozen at a CP of 190, so a design session loads **wrong pace bands**
today. `NOTES.md` is blunt about which half is worse: *"A dead export fails loudly; a
stale-but-live constant quietly hands out wrong pace bands."*

## What Code did since the last edition

**The palette rename shipped** (`#277`). `THEME` keys are role-named:
`accent` `positive` `caution` `warning` `critical` `accentAlt` `accentAlt2` `positiveAlt`
`neutralAccent` `textStrong`. **No value moved** — every hex appears on both a `+` and a
`-` line, which is what let seven colour-locking test files through unmodified.

**Everything Design asked for arrived, and everything Code asked for was answered.** The
previous edition's "what Code needs from Design" table is closed out in full: the nine
missing token values, the ground colour, the artboards, and `ISSUES-load-states.md`.

**File ownership is now explicit and enforced.** `ownership.json` gives every file in
`.design-sync/` one owner and one direction — `design` (authored in the project, mirrored
down here read-only), `repo` (written here, pushed up), `local` (neither). CI fails if
anything the sync uploads is design-owned. This closed a real two-way flow: `conventions.md`
was being pushed *up* from the repo while the project held it as source of truth, and a
repo commit had already overwritten a set of measured contrast ratios once.

**`readmeHeader` now points at `CLAUDE.md`**, not `conventions.md`. The repo owns the
domain briefing; the project owns the style guide. A side effect is that the design system
stops shipping a second, stale copy of `conventions.md` — the "known tension" that
`PROJECT-CONTEXT.md` used to record.

**Four things are now checked mechanically rather than remembered.** `check:design-sync`
verifies the barrel bundles, every published contrast ratio in `conventions.md` recomputes
from the real palette, every `--color-*` named there actually exists, and the ownership
manifest is complete. `check:zones` recomputes every rowing zone band published in any
tracked markdown file against `derivePaceZones`. Each was written against a failure that
had already shipped — the same wrong AT ceiling had reached three separate documents.

## One correction to carry forward

**`teal` was not folded into `positive`, and the two sides named it differently.**

`#248`'s table said to fold it. `splitiq-light-tokens.css` argues against, correctly: they
do different jobs — `positive` is done/healthy/UT1/lower-strength, cycling is the
discipline, and folding loses cycling's accent. `#277` reached the same conclusion
independently and kept it.

But it named the key **`positiveAlt`**, while the light palette names it **`cycling`**.
`positiveAlt` reintroduces by name the conflation both sides rejected on substance. Worth
converging before the seam wires the token up — the light palette's name is the better one.

## What is still owed, and by whom

| | Owed by | Blocks |
|---|---|---|
| Open the design project, then re-sync | Human — needs interactive `/design-login` | `#258` |
| Upload `CODE-TO-DESIGN.md` to the project root | Human — no automatic path exists for it | — |
| `PROJECT-CONTEXT.md` and `conventions.md` revisions travel by hand-off, not by sync | Design | — |
| The `var(--color-*)` seam | Code | `#250` |
| The light flip | Code | `#251` |

The seam and the flip are the remaining palette steps. `HANDOFF.md` §1's four-step split —
rename, seam, light flip, with the ground and contrast work alongside — is the order.

Three issues came out of the rename and should land before the seam:
**`#278`** local `C` alias maps whose keys are still colour words (`C.accent` currently
holds green, `C.cyan` holds the accent — a landmine for mechanical substitution),
**`#279`** raw hex literals in `constants/ui.js` that will not follow the light flip, and
**`#280`** prose colour-words in `docs/*.md` that now name keys which no longer exist.

## Two things that will bite silently

**`cfg.extraFonts` is still not in `config.json`.** Fixing the app's font loading does not
fix generated designs — the design bundle ships its own font closure. Without it, every
generated design keeps rendering in the fallback face after the app itself is correct, and
nothing warns you. Note the typeface changed: `STATE_OF_PLAY.md` §4.1 re-decided it as
**IBM Plex Sans + IBM Plex Mono** on metric-compatibility grounds, superseding Archivo. It
is the Plex woff2 files that need wiring, at 500+ weights.

**`dtsPropsFor` is hand-maintained with no drift detection.** A prop renamed in a component
leaves the uploaded contract silently wrong, and a design session codes against that
contract. `#256` proposes closing this along with `base.css` freshness and docs/preview
coverage.

---

*Reciprocal of `HANDOFF.md`. Update both sides when either moves.*
