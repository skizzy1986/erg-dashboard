# design-sync notes — SplitIQ

Repo-specific gotchas for syncing this repo to claude.ai/design. Read this
before re-running the sync.

## Shape

- **This repo is an app, not a published component library.** There is no
  library build, no `dist/` entry, no `.d.ts`, and no Storybook. The synced
  design system is the app's shared UI layer: `web/src/components/**` plus the
  `THEME` tokens.
- Everything lives under `web/` because that is the npm package (`splitiq`).
  `.design-sync/`, `.ds-sync/` and `ds-bundle/` are all package-relative, and
  every command below is run from `web/`.

## Who owns what

`ownership.json` is the machine-readable answer, and `npm run check:design-sync`
enforces it. Three owners:

- **`repo`** — written here, pushed to the design project. Listed below.
- **`design`** — authored in the design project; the copy here is a **read-only
  mirror** committed so a code session can read it (`conventions.md`,
  `HANDOFF.md`, `ISSUES-load-states.md`, `PROJECT-CONTEXT.md`, `designs/*`).
  **Do not edit these here** — the next download overwrites you, and `config.json`
  is forbidden from referencing them.
- **`local`** — working documents, neither pushed nor mirrored (this file,
  `STATE_OF_PLAY.md`, `DESIGN_BRIEF.md`).

### Why the manifest exists

`conventions.md` used to move in both directions with nothing arbitrating it.
`config.json` pushed the repo's copy up as `readmeHeader`, while
`PROJECT-CONTEXT.md` declared the design project the source of truth and
`HANDOFF.md` §3 authored it outright. Whichever side acted last silently won —
which is how `e61092c` (#240) replaced `85eab51` (#224)'s measured dark contrast
ratios with the light palette's, in the one file guaranteed to reach the design
agent's prompt.

The fix is one-directional ownership, checked rather than agreed: `readmeHeader`
now points at **`CLAUDE.md`** — the domain briefing, which the repo genuinely owns
because the domain lives in the code — and the guard fails if `config.json` ever
names a `design`-owned path again. As a side effect the synced design system stops
shipping a second, stale copy of the style guide, which is the "Known tension"
`PROJECT-CONTEXT.md` records.

## Sync inputs this repo owns

| File | Why it exists |
|---|---|
| `.design-sync/entry.jsx` | The app's components are **default exports**; the converter's synth-entry uses `export *`, which does not re-export defaults. This barrel gives them stable named exports. **Add new components here** or they will not reach `window.SplitIQ`. |
| `.design-sync/gen-css.mjs` | Generates `base.css` from `src/constants/theme.js`. **Re-run it whenever THEME changes**: `node .design-sync/gen-css.mjs`. |
| `.design-sync/base.css` | Generated. The token layer (`--color-*`) plus the app ground. Wired as `cfg.cssEntry`. |
| `.design-sync/docs/*.md` | Per-component docs. Their `category:` frontmatter is what sets the DS pane groups (session / metrics / charts / tooltips / feedback / mobile) — without them everything lands in `general`. |
| `.design-sync/previews/*.tsx` | Authored preview stories, one file per component. |
| `.design-sync/CLAUDE.md` | **`cfg.readmeHeader`** — the domain briefing, and the one input guaranteed to be inlined into the design agent's prompt. Glossary, the five destinations, which numbers are real, the chart rules. |
| `.design-sync/CODE-TO-DESIGN.md` | Dated bulletin of what changed in the app since the last sync. Written at sync time. |
| `scripts/check-design-sync-entry.mjs` | Guards the barrel: bundles `entry.jsx` with rolldown and checks every `componentSrcMap` path still exists. `npm run check:design-sync`, wired into CI (#225). |

## Gotchas

- **`cfg.tokensGlob` is inert without `cfg.tokensPkg`.** `copyTokens()` returns
  early when there is no tokens *package* in `node_modules`, so a glob pointing
  at a repo file silently copies nothing and `tokens/` ships empty. That is why
  the tokens are folded into `cssEntry` (`base.css`) instead — they reach
  designs through the `styles.css` @import closure either way.
- **The preview card template hardcodes `body{background:#fff}`** in an inline
  `<style>` that comes *after* the stylesheet links. SplitIQ is dark-only, so
  `base.css` sets `background`/`color` with `!important` to win that cascade.
  Without it every component renders on white and `done`-style opacity fades
  look broken. Do not remove the `!important`.
- **`.d.ts` props cannot be auto-extracted.** The source is plain JSX with no
  type annotations and no JSDoc `@param` types, so ts-morph emits
  `[key: string]: unknown` for every component. All 11 prop contracts are
  hand-written in `cfg.dtsPropsFor`, derived from the destructured params and
  their real usage. **If you change a component's props, update `dtsPropsFor`**
  — nothing will catch the drift for you.
- `[DTS_REACT] @types/react not found` prints on every build. It is expected and
  harmless here: installing it would not help, because there are no React
  utility types to resolve. Do not add it to the repo just to silence this.
- **`LogSessionForm` is deliberately excluded.** It imports `supabaseClient.js`,
  which calls `createClient(import.meta.env.VITE_SUPABASE_URL, …)` at module
  scope. In an IIFE bundle `import.meta.env` is undefined, so the client throws
  at load and takes the whole bundle down. To include it later, shim the client
  (e.g. a `cfg.provider` or a stub module via `cfg.extraEntries`) first.
- `derivePaceZones` is exported from `entry.jsx` so `PaceTrendChart` previews build
  the real zone bands rather than an inlined copy that would rot. It used to export a
  static `PACE_ZONES`; see the incident below.

## Known render warns

- `[GRID_OVERFLOW]` on **LiveMetric** — fixed by `overrides.LiveMetric.cardMode
  = "column"`. It cannot re-flag; no action needed.
- **PaceTrendChart capture is stalled mid-animation.** `package-capture.mjs`
  pins a fixed clock (`page.clock.setFixedTime`), which stops Recharts'
  `react-smooth` line-draw animation partway, so the review sheet shows a
  partial path with disconnected dots. The card itself is fine — verified by
  rendering the same card under a live clock. There is no way to disable the
  animation from the preview, because `PaceTrendChart` hardcodes `<Line>`
  without `isAnimationActive` and the bundled Recharts' `Global` is not
  reachable. **Expect this on every sync; it is not a regression.**

## States that cannot render statically

Recorded so nobody re-litigates them:

- `LogEntry` and `WorkoutItem` are collapsed by `useState(false)`. The expanded
  bodies — the erg metric grid, the strength exercise table, and the workout
  note/fuel/meal detail — are click-gated and never appear in a card. They are
  described in the `.md` docs instead.
- `WorkoutTarget` is likewise collapsed; the duration / sRPE / notes body is
  behind the caret.

## Incident: the barrel broke within a day (2026-08-22)

`entry.jsx` re-exported `PACE_ZONES` from `trainingConfig.js`. PR #203 deliberately
deleted that export — correctly, so a seed-derived zone table could not diverge from
the live `rowing_cp` anchor — and the barrel was not updated. The design-sync build
failed with `No matching export ... for import "PACE_ZONES"`, which blocks every
re-sync. Nothing surfaced it; it was found by inspection a day later.

The "hand-maintained, no drift detection" warning below was already written down and
**did not prevent it**. A prose note is not a control. That is what
`npm run check:design-sync` is for (#225): it bundles `entry.jsx` with rolldown and
verifies every `componentSrcMap` path on any `web/**` change, catching the whole
class — any synced export renamed, moved or removed.

Worth keeping in view: the structural break was the cheap half. The bundle that
shipped to the design project was built *before* #203, so it contains a **live**
`PACE_ZONES` frozen from the old `CRITICAL_POWER.cpEstimate` of 190 — the stale seed
CP that #176 was filed about. A dead export fails loudly; a stale-but-live constant
quietly hands out wrong pace bands. The guard catches the first kind and cannot catch
the second. **Until the project is re-synced, that is still what the design agent
loads.**

## Re-sync risks

- **`dtsPropsFor` is hand-maintained and has no drift detection.** A prop
  renamed or removed in a component leaves the uploaded contract silently wrong,
  and the design agent codes against that contract. Diff the components against
  the config when re-syncing.
- **The token seam changes what `THEME` values *are*, and this config must
  follow.** `HANDOFF.md` §1 turns every `THEME` value into a `var(--color-*)`
  string and renames the colour-named keys to roles (`cyan`→`accent`,
  `gold`→`caution`, …). Component *source* keeps its shape — `color: THEME.accent`
  still works — but two things here do not: the accent-token names quoted
  throughout `conventions.md` and in every `accent` default in `dtsPropsFor`, and
  `base.css`, which stops being the token layer and becomes a mirror of the app's
  own stylesheet. Re-run `gen-css.mjs` and re-read the contracts in the same
  change, or designs resolve tokens that no longer exist.
- **When Archivo is self-hosted, wire it through `cfg.extraFonts`.** Fixing the app's
  font loading does *not* fix generated designs — the bundle ships its own font
  closure. Without `extraFonts`, every design keeps rendering in the fallback face
  after the app itself is correct, and nothing warns you. `cfg.extraFonts` is **not
  in `config.json` today**; it has to be added, with the 500+ weights — `HANDOFF.md`
  rules out anything lighter on light grounds.
- **`entry.jsx` is hand-maintained too.** A new component in
  `src/components/` will not sync until it is added there *and* to
  `cfg.componentSrcMap` *and* given a `.design-sync/docs/<Name>.md` (or it lands
  in the `general` group).
- **`base.css` is generated but not automatically regenerated.** If `THEME`
  gains or loses a colour and `gen-css.mjs` is not re-run, designs ship stale
  tokens. Re-run it as step one of every sync.
- **'DM Mono' is referenced but never served.** Several components set
  `fontFamily: "'DM Mono', monospace"`, but neither the app nor this bundle
  ships the face — `index.html` loads no webfont. Everything therefore renders
  in the Courier/monospace fallback, in the app and in designs alike. This is
  faithful to production, not a bug. **Do not fix it by adding DM Mono:**
  `HANDOFF.md` §1 sets the face to **Archivo**, minimum weight 500. These call
  sites should move to Archivo rather than acquire the face they name.
- **Toolchain assumptions:** the render check runs against **system Chrome**
  (`DS_CHROMIUM_PATH=/c/Program Files/Google/Chrome/Application/chrome.exe`)
  because no playwright browser is cached on this machine. `playwright` itself
  resolves from `web/node_modules`. If the check fails to launch, either install
  `npx playwright install chromium` or re-point `DS_CHROMIUM_PATH`.

## Commands

```sh
cd web
node .design-sync/gen-css.mjs                      # refresh tokens from THEME
node .ds-sync/package-build.mjs   --config .design-sync/config.json --node-modules ./node_modules --entry ./.design-sync/entry.jsx --out ./ds-bundle
DS_CHROMIUM_PATH="C:/Program Files/Google/Chrome/Application/chrome.exe" \
  node .ds-sync/package-validate.mjs ./ds-bundle
```

## Reconciliation against HANDOFF.md (2026-08-23)

`HANDOFF.md` landed in the repo today, verbatim. Three things in it do not survive contact
with the code, recorded here rather than edited into the handoff — it is a decision record,
and silently correcting it would lose the fact that the decision was made on this basis.

**1. The acceptance checkbox is wrong, and it asked to be checked.** §1 lists *"Existing
component tests pass unchanged (they assert structure, not colour — confirm before starting)"*.
Confirmed false. Seven files lock colour:

- `src/constants/__tests__/theme.test.js` — asserts exactly 23 keys, locks all 23 hex values
  individually, and requires `/^#[0-9a-f]{6}$/`. **That regex forbids `var(--color-*)`**, so
  all three of its tests break at the seam.
- `src/utils/__tests__/formatting.test.js` (23 hex lines, `workoutAccent()`),
  `src/components/__tests__/BenchmarkBadge.test.jsx`,
  `src/utils/__tests__/recoveryAnalytics.test.js` (3), `src/views/__tests__/OverviewView.test.jsx`
  (2), `src/utils/__tests__/analysis.test.js` (1) — these assert *derived* colours, so they
  survive a rename but break at the seam.
- `e2e/smoke.spec.js:108` — `toHaveCSS('border-top-color', 'rgb(0, 212, 255)')`, inside a loop
  over all 13 tabs.

Consequence: do the **rename first, values unchanged** (nothing above breaks — they assert
values, which do not move), then the seam. A rename PR whose screenshots are byte-identical is
proof it was a pure rename; a combined PR would be unbisectable across seven files.

**2. The seam inverts a dependency the handoff does not mention.** `src/utils/themeCss.js`
`cssVars(THEME)` emits `--color-<key>: <value>` — injected at `main.jsx:22`, and the source
`gen-css.mjs` uses to generate `base.css`. Once `THEME.accent` is `'var(--color-accent)'`,
that emits `--color-accent: var(--color-accent)`: self-referential, resolves to nothing.
Today THEME is the source and the CSS is generated; after the seam the CSS is the source and
THEME is a pointer table. `theme.js` has to split into a values module and the pointer table,
and `cssVars`, `gen-css.mjs`, `base.css` and `main.jsx` all flip together.

**3. Nine tokens have no light value.** §1 supplies 11 and says the structural keys are kept,
but gives no light value for `raised`, `field`, `surfaceAlt`, `neutral`, `divider`,
`textSubtle`, `textFaint`, `textDim` or `accentAlt2`. `conventions.md` already flags
`textFaint`/`textDim` as unspecified. Target key count is 20 (23 − 10 deleted + 7 roles).
Also unresolved: §1's CSS block sets `--color-bg: #c3cade`, §3 prose says white cards on
`#bcc5dd`. One is stale.

**Two more, found in passing:**

- **The 8-digit alpha convention collides with the seam.** `` `${THEME.token}NN` `` becomes
  `var(--color-x)80`, which is invalid CSS — the background vanishes silently rather than
  erroring. Four sites: `LogSessionForm.jsx:144`, `WorkoutItem.jsx:17`, `LogEntry.jsx:78,112`.
  `color-mix()` is the replacement; #183's "keep 8-digit hex" convention retires with the seam.
- **This directory contradicts itself.** #240 rewrote `conventions.md` to light/role tokens but
  left its siblings alone — 15 colour-named `THEME.*` references remain across `docs/*.md`,
  `previews/*.tsx` and `dtsPropsFor`. The design agent reads the header *and* the per-component
  docs, so it currently receives both systems in one prompt, which is worse than either alone.
  Fixable now, with nothing from the handoff. **Do not re-sync the project until it is fixed**,
  or the contradiction is frozen into another bundle.

Two documents the handoff cites are still missing from the repo: `ISSUES-load-states.md`, and
the five `.dc.html` artboards it names as the source of truth for the designs.

## The design drop, and two things it overturns (2026-08-23)

The Claude Design project delivered its files: the five artboards as compiled HTML under
`designs/`, plus `ISSUES-load-states.md`, `PROJECT-CONTEXT.md`, and its own
`conventions.md`. `HANDOFF.md` in the drop is **byte-identical** to the copy already
committed, so the paste it arrived by was accurate.

**1. Dark is not dropped after all.** `HANDOFF.md` §1 states *"Dark: dropped. Light is the
only theme"* and its acceptance list says *"Dark values deleted, not commented out"*. The
project's `conventions.md`, revised 2026-08-22, overturns that explicitly: *"This document
previously described SplitIQ as dark-only. That has been overturned in review. The dark
theme is retained as a second theme — the erg room is dark at 5am and the live screen
wants it — but light is primary."*

Both are design-side documents and `conventions.md` is the later one. This changes the
token seam materially: the `data-theme` attribute stops being the no-op `HANDOFF.md` §1
describes and becomes load-bearing, a dark block does eventually ship, and the dark values
are kept rather than deleted. Issue #251 has been corrected — it previously instructed
deleting them.

**2. `conventions.md` here is a mirror, not a source.** `PROJECT-CONTEXT.md` sets the
direction explicitly: the project holds the source of truth for `conventions.md`,
`HANDOFF.md`, `ISSUES-load-states.md` and the designs; the repo holds it for component
source, hooks and maths. The repo copy has therefore been **replaced wholesale** with the
project's, which is also substantially richer — it adds the accent-pair rule, the
`sc-for` trailing-hole gotcha, "redefine the token, don't fight the rule", percentage
padding as a vertical position, and the silent-NaN trap.

Consequence: **do not hand-edit `web/.design-sync/conventions.md`.** The status banner
added here earlier has been dropped for that reason — it would be overwritten on the next
sync. Anything that needs to reach a design session has to be added on the project side.

## The ground colour, settled by the artboards (2026-08-23)

`HANDOFF.md` §1's CSS block sets `--color-bg: #c3cade`; its §3 prose and
`PROJECT-CONTEXT.md` both say white cards on `#bcc5dd`. The artboards settle it, and not
by preferring one document over the other:

- `#c3cade` appears **only** as the `--color-bg` declaration in each screen's helmet — 10
  occurrences, all of them the token definition.
- `#bcc5dd` is what the screens actually **paint**: the 390x844 device frame, the 1080px
  desktop frame, panel grounds.

So the token is declared and then not consumed. The real ground is **`#bcc5dd`**, and
`--color-bg: #c3cade` is dead in the designs. Worth fixing at source before the token seam
wires it up for real — the moment `--color-bg` is actually consumed, every screen shifts
to a colour no design was reviewed against.

The artboards also carry the full **stale dark snapshot** in every helmet (all 23
colour-named dark tokens), with only `--color-bg` overridden on top. That is the
"redefine the token, don't fight the rule" workaround `conventions.md` documents, and it
is a direct cost of the project not having been re-synced.
