# Code → Design Handover (2026-08-23)

*Reciprocal of [`HANDOFF.md`](HANDOFF.md). Paste into a Claude Design session when the two
sides need re-syncing. This is about **how Code and Design stay on the same page** — the
state of the spec against the code, and what each side still owes the other. Visual
direction lives in the handoff and the brief, not here.*

---

## Status: the handoff is in git

`HANDOFF.md` is committed verbatim at `web/.design-sync/HANDOFF.md` — the path it names for
itself. Its opening constraint is satisfied: *"A code session cannot read this project. Its
container is cloned from git, so this file only reaches it once committed."* It has.

Commit `ef83a4e`, branch `claude/design-integration-splitiq-8ixs0q`.

## What Code just did

The design workstream was invisible from the repo — it lived in `web/.design-sync/`, a
hidden dotfolder named after a build tool, referenced from no top-level document.

- **`DESIGN.md`** at the repo root is the front door, with the documents in authority
  order: `HANDOFF.md` (normative) > `DESIGN_BRIEF.md` (prescriptive) > `conventions.md`
  (descriptive). Referenced from `CLAUDE.md`, `README.md`, `WORKFLOW.md` and `AGENTS.md`.
- **[`CLAUDE.md`](CLAUDE.md) in this directory is new** — a project briefing for design
  sessions, mirroring the one code sessions get. Domain glossary (CTL/ATL/TSB, sRPE, CP,
  UT1/UT2), the five destinations, which numbers are real versus decorative, and the chart
  rules from §3. `conventions.md` is the style guide alone now and points at it.
- **`conventions.md` states its own status.** It opens by saying its token section
  describes the *target*, and that the app on `main` is still dark with colour-named keys.
- **The code-agent preamble was teaching the wrong palette.**
  `.claude/skills/erg-context.md` is prepended to every code-agent spawn and hardcoded
  `dark #08080d / cyan #00d4ff` as non-negotiable style. It now says to read every colour
  from `THEME` and never type a hex.
- Design is a tracked lane: `design`/`a11y` labels, a visual-impact field on the feature
  issue template, a visual-evidence item on the PR template, and eleven issues (#248–#258).

## Why conventions.md had drifted

Worth recording, because it is a structural problem rather than a mistake. `conventions.md`
was the **only** channel to a design session, so every kind of context got pushed into a
style guide — and it ended up describing an unbuilt system as fact while its own siblings
(`docs/*.md`, `previews/*.tsx`, `dtsPropsFor`) still named the old keys. A design session
was receiving both systems in one prompt with no signal which was live, which is worse than
either alone.

Splitting the briefing out into `CLAUDE.md` gives each document one job. Keep it that way:
**project context goes in `CLAUDE.md`, style rules in `conventions.md`.**

## Three corrections to the handoff

Recorded in [`NOTES.md`](NOTES.md) rather than edited into `HANDOFF.md` — it is a decision
record, and silently correcting it would lose the basis the decisions were made on.

### 1. §1's acceptance checkbox is false, and it asked to be checked

It reads *"Existing component tests pass unchanged (they assert structure, not colour —
confirm before starting)"*. Confirmed false. Seven files lock colour:

- `theme.test.js` — asserts exactly 23 keys, locks all 23 hex values individually, and
  requires `/^#[0-9a-f]{6}$/`. **That regex forbids `var(--color-*)`.** All three of its
  tests break at the seam.
- Five assert *derived* colours, so they survive a rename but break at the seam:
  `formatting.test.js` (23 hex lines, `workoutAccent()`), `BenchmarkBadge.test.jsx`,
  `recoveryAnalytics.test.js`, `OverviewView.test.jsx`, `analysis.test.js`.
- `e2e/smoke.spec.js:108` — asserts `rgb(0, 212, 255)` across all 13 tabs.

**Consequence: §1's "all 11 components in one PR, one review" is being split into four
steps.** Rename first with values unchanged — nothing above breaks, because they assert
values and no value moves — then the seam, then the light flip. A rename whose screenshots
come back byte-identical is proof it was a pure rename. A combined PR would move seven test
files and ~1,278 colour literals at once and would be unbisectable on failure.

### 2. The seam inverts a dependency §1 does not mention

`web/src/utils/themeCss.js` `cssVars(THEME)` currently *generates* the CSS variables from
`THEME`, and also produces `base.css` for the design bundle. Once `THEME.accent` is
`'var(--color-accent)'` it emits:

```css
--color-accent: var(--color-accent);   /* self-referential — resolves to nothing */
```

So `theme.js` splits into a **values module** (the hexes) and **`THEME`** (a pointer table
of `var()` strings). Component source keeps exactly the shape §1 intends — `color:
THEME.accent` still works, resolving through the cascade — and the alias maps survive
untouched, as designed.

**What this changes for Design:** `base.css` stops being generated from `THEME` and becomes
a copy of the app's real stylesheet. It is what designs resolve tokens against, so it stays
the file to trust.

### 3. Nine tokens have no light value

§1 supplies eleven and says the structural keys are kept, but gives no light value for
`raised`, `field`, `surfaceAlt`, `neutral`, `divider`, `textSubtle`, `textFaint`,
`textDim`, or `accentAlt2`. `conventions.md` already flags `textFaint`/`textDim` as
unspecified and says not to use either for text until they are set and measured.

Target key count is **20** — 23 existing, minus 10 deleted, plus 7 roles.

## What Code needs from Design

| Need | Blocks | Issue |
|---|---|---|
| **The nine missing token values** | the light flip — nothing substitutes for this | #251 |
| **The ground colour, settled** — §1's CSS block says `--color-bg: #c3cade`, §3's prose says white cards on `#bcc5dd`. One is stale | the light flip | #251 |
| **The five `.dc.html` artboards**, committed to `web/.design-sync/designs/` | every component slice | #257 |
| **`ISSUES-load-states.md`** — cited twice (§4 Body, §5 step 2), not in the repo | the load pending/unavailable states | #257 |

On the artboards: `HANDOFF.md` names them as *"source of truth for the designs"*, but they
exist only in the Claude Design project. Until they land, §2's fifteen-component inventory
and §4's per-screen build notes describe screens **no code session can see**, which makes
them unbuildable as specified. They are plain HTML and render standalone in a browser, so
committing them costs only the paste — and it is the strongest available form of making the
design work visible to everyone.

## Do not re-sync the project yet

The uploaded bundle was built at `6dae5c1` and **the project has never been opened** —
`_ds_needs_recompile` is still present and still ours, `_ds_manifest.json` is absent. It
currently holds the old dark `conventions.md` plus a live, stale `PACE_ZONES` frozen at the
old seed CP of 190, so a design session loads **wrong pace bands** today. `NOTES.md` is
blunt about which half is worse: *"A dead export fails loudly; a stale-but-live constant
quietly hands out wrong pace bands."*

But re-syncing before the colour-named references in `docs/` and `dtsPropsFor` move would
freeze the contradiction into another bundle. **Re-sync after the role rename lands**
(#248), which is when those references move in lockstep with the code. Re-run
`node .design-sync/gen-css.mjs` first — step one of every sync. Tracked as #258.

While re-syncing, verify how `CLAUDE.md` reaches the design agent. `readmeHeader` inlining
is the only channel *confirmed* to work; whether the app auto-loads a file by that name is
unverified. If it does not, point `readmeHeader` at it. The behavioural test: ask for a
chart and see whether it produces a labelled axis and a computed caption unprompted.

## Build order — when the designs become buildable

1. Screenshot baselines (#249) — there is no visual-regression net today
2. `tokens.js` scales (#255) and Archivo self-host (#254) — parallel, independent
3. Single-source the `#08080d` ground (#253) and the contrast test (#252)
4. Role rename (#248) → `var()` seam (#250) → light flip (#251)
5. Then §5's component slices, in the handoff's order

## One thing to carry into future designs

**`cfg.extraFonts` is not in `config.json`.** Fixing the app's font loading does *not* fix
generated designs — the design bundle ships its own font closure. Without it, every
generated design keeps rendering in the fallback face after the app itself is correct, and
nothing warns you. It has to carry the Archivo woff2 files at 500+ weights; `HANDOFF.md`
rules out anything lighter on light grounds.

---

*Reciprocal of `HANDOFF.md`. Update both sides when either moves.*
