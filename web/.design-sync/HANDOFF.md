# SplitIQ light redesign — handoff

Everything designed in this project, mapped to the code that has to change.
Read in order: the token seam first, since nothing else ships consistently
until it lands.

Source of truth for the designs — all five nav destinations are now drawn:
`SplitIQ Today - Redesign Light.dc.html`, `SplitIQ Progress.dc.html`,
`SplitIQ Train.dc.html`, `SplitIQ Body.dc.html`, `SplitIQ Coach.dc.html`.

**A code session cannot read this project.** Its container is cloned from git,
so this file only reaches it once committed to `web/.design-sync/HANDOFF.md`,
alongside `conventions.md` and `ISSUES-load-states.md`.

---

## 1. The token seam (do this first)

### Decisions taken

- **Shape:** `THEME` values become `var(--color-*)` strings; a `data-theme`
  attribute on the app root redefines the vars beneath it.
- **Scope:** ~~all 11 components in one PR, one review.~~ **Split into four
  steps** on Code's finding: rename with values unchanged (nothing breaks —
  the tests assert values and no value moves), then the `var()` seam, then the
  light flip. A combined PR moves seven test files and ~1,278 colour literals at
  once and is unbisectable on failure. A rename whose screenshots come back
  byte-identical is proof it was a pure rename.
- **Dark:** retained as a second theme, not deleted. *(Superseded — this line
  originally read "dropped. Light is the only theme." That was overturned in
  review: the erg room is dark at 5am and the live screen wants it.
  `conventions.md`'s 2026-08-22 banner is the current position and arbitrates.)*

### The problem in the current code

`web/src/constants/theme.js` is 23 flat hex literals, and every component
imports it directly (`LiveMetric.jsx:2`, `WorkoutTarget.jsx:2`, and nine
others). Several read it through a local alias map:

```js
const C = { panel: THEME.surface, border: THEME.border, accent: THEME.gold };
```

There is no provider and no seam — a component cannot render light without
editing its source.

### The naming problem, which must be fixed in the same PR

Roughly half the keys name a **colour**, not a role: `cyan`, `gold`, `orange`,
`red`, `purple`, `pink`, `teal`, `green`, `grey`, `white`. These do not survive
a light theme — `THEME.cyan` in a light build is not cyan, it is `#0a7093`, and
a key called `cyan` holding a dark teal is worse than no token at all.

Rename to roles as part of the seam. Suggested mapping, from what the designs
actually use each colour for:

| Old key | New key | Light value | Used for |
| --- | --- | --- | --- |
| `cyan` | `accent` | `#0a7093` | primary actions, erg, watts |
| `green` | `positive` | `#10795a` | in-band, logged, strength |
| `gold` | `caution` | `#8a6a10` | rest timers, ramp flags, warmup sets |
| `orange` | `warning` | `#a34c1c` | end session, over-band |
| `red` | `critical` | `#a32040` | deep fatigue only |
| `purple` | `accentAlt` | `#5f45b0` | strength secondary, mobility |
| `pink` | `accentAlt2` | `#a3407a` | prehab |
| `teal` | *(fold into `positive`)* | — | duplicate role |
| `grey`, `white` | *(delete)* | — | use `muted` / `surface` |

Keep the structural keys (`bg`, `surface`, `raised`, `field`, `border`, `text`,
`muted`, `surfaceAlt`, `neutral`, `divider`, and the `text*` ramp) — they are
already role-named.

### Target state

`theme.js` splits in two: a **values module** holding the hexes, and `THEME` as a
pointer table of `var()` strings. `utils/themeCss.js` `cssVars(THEME)` currently
*generates* the variables from `THEME`, so once `THEME.accent` is
`'var(--color-accent)'` it emits `--color-accent: var(--color-accent)` and
resolves to nothing. Component source keeps the shape below either way.

`web/src/constants/theme.js`:

```js
export const THEME = {
  bg: 'var(--color-bg)',
  surface: 'var(--color-surface)',
  border: 'var(--color-border)',
  text: 'var(--color-text)',
  muted: 'var(--color-muted)',
  accent: 'var(--color-accent)',
  positive: 'var(--color-positive)',
  caution: 'var(--color-caution)',
  warning: 'var(--color-warning)',
  critical: 'var(--color-critical)',
  accentAlt: 'var(--color-accent-alt)',
  // …
};
```

Component source does not change shape — `color: THEME.accent` still works,
it now resolves through the cascade. The alias maps (`const C = {…}`) keep
working unchanged, which is why this shape was chosen over a second theme
object.

A stylesheet defines the values:

The ground is **`#bcc5dd`**. §1 previously published `#c3cade` here while §3's
prose said white cards on `#bcc5dd`; `#bcc5dd` is what all six screens paint and
what every contrast ratio in `conventions.md` is measured against. `#c3cade` is
withdrawn.

Values for the nine tokens §1 left unspecified — `raised`, `field`,
`surfaceAlt`, `neutral`, `divider`, `textSubtle`, `textFaint`, `textDim`,
`accentAlt2` — are in `conventions.md`, "The nine remaining tokens", with the
full declaration list in `splitiq-light-tokens.css`. Target is 21 ink and
structural tokens plus 8 washes: each accent needs a surface value as well as a
type value on a light ground, and `cycling` stays separate from `positive`.

```css
:root, [data-theme='light'] {
  --color-bg: #bcc5dd;
  --color-surface: #ffffff;
  --color-border: #c8cee0;
  --color-text: #1c1e2a;
  --color-muted: #43485a;
  --color-accent: #0a7093;
  --color-positive: #10795a;
  --color-caution: #8a6a10;
  --color-warning: #a34c1c;
  --color-critical: #a32040;
  --color-accent-alt: #5f45b0;
}
```

Light is `:root` as well as `[data-theme='light']`, so nothing depends on the
attribute being present. The attribute exists so a future surface (a live
session in a dark erg room, say) can be scoped without reintroducing a second
`THEME` object — but no dark block ships in this PR.

### Two constraints the values must hold

1. **Contrast is fixed against the ground the token lands on.** `--color-muted`
   at `#43485a` is chosen against white cards. It is not a value that can be
   nudged for a different surface — if a new ground appears, it needs its own
   token, not a shifted one.
2. **Minimum weight 500.** Archivo below 500 on light grounds fails at the
   sizes used. Any component setting `fontWeight: 400` needs raising.

### Acceptance

- [ ] No hex literal in any of the 11 component files
- [ ] No colour-named key remains in `THEME`
- [ ] Every component renders light with no source edit
- [ ] `data-theme='light'` on the root is a no-op (light is also `:root`)
- [ ] Dark values deleted, not commented out
- [x] ~~Existing component tests pass unchanged (they assert structure, not
      colour — confirm before starting)~~ **Confirmed false.** Seven files lock
      colour. `theme.test.js` asserts exactly 23 keys, locks all 23 hex values
      and requires `/^#[0-9a-f]{6}$/` — that regex forbids `var(--color-*)`.
      Five more assert derived colours; `e2e/smoke.spec.js:108` asserts
      `rgb(0, 212, 255)` across 13 tabs. See `CODE-TO-DESIGN.md`.

---

## 2. Component inventory

New patterns from the designs, mapped to where they belong.

| Pattern | Lives in | Props | Notes |
| --- | --- | --- | --- |
| Session bar chart (one bar per session + fatigue ribbon) | replaces the load line chart in `ProgramView.jsx` | `sessions[]`, `band{lo,hi}`, `ribbon[]` | Bars are sessions that happened; ribbon is modelled. Caption computed, never literal. |
| Load stat trio (fitness / fatigue / form) | `ProgramView.jsx` | `ctl`, `atl`, `tsb`, `pending`, `unavailable` | Pending + unavailable states are the other session's issues. |
| Prescription card | new `components/PrescriptionCard.jsx` | `session`, `onStart`, `onBrowse` | Supersedes `WorkoutTarget.jsx` — that one is a collapsed disclosure, this is the primary CTA. |
| Session library sheet | new `components/SessionLibrarySheet.jsx` | `items[]`, `category`, `onPick`, `onClose` | z-index 200, backdrop 150, nav 100. |
| Live erg band gauge | new `components/BandGauge.jsx` | `value`, `lo`, `hi`, `min`, `max` | Watts against prescribed range. Reuse for any in/out-of-band readout. |
| Set logger row | new `components/SetRow.jsx` | `set`, `state` (`done`/`next`/`pending`) | Warmup sets tagged `W1…`, styled apart from working sets. |
| Lift accordion | new `components/LiftCard.jsx` | `lift`, `open`, `logged`, `onToggle`, `onLogSet` | One open at a time. Holds the image slot + form cue. |
| Rest timer | new `components/RestTimer.jsx` | `elapsed`, `target`, `onExtend`, `onSkip` | Auto-starts on set log. Default 120s. |
| In-progress bar | new `components/SessionBar.jsx` | `session`, `status`, `onReturn` | Sits above `BottomTabBar`, persists across destinations. |
| Plate maths line | util, not a component | `weight`, `bar`, `plates[]` | 20kg bar, full set, round to 2.5kg. |
| Session summary + sRPE prompt | new `components/SessionComplete.jsx` | `session`, `lifts[]`, `onRate`, `onDone` | Lifts / sets / volume / best e1RM all computed from the logged sets, not passed in. sRPE is the only input. |
| Readiness card with per-metric baseline | new `components/ReadinessCard.jsx` | `score`, `status`, `deductions[]`, `metrics[]` | Each metric states its own baseline source and coverage (`personal · 17/28 days` vs `population default · 6/28`). Deductions list is derived, filtered to those > 0. |
| Sparse-series chart (gaps, not interpolation) | new `components/SparseSeries.jsx` | `points[]` (nulls kept), `band{lo,hi}`, `axis` | Replaces `connectNulls` usage. A missing day renders as a gap. |
| Signal card | new `components/SignalCard.jsx` | `signal`, `because`, `guidance`, `rules[]` | The autoregulation call as a headline, each fired rule shown against the baseline it fired on. |
| Roster wave (14 days) | new `components/RosterWave.jsx` | `days[]`, `todayIndex` | Home-week vs FIFO-week colouring; rest days are short grey stubs. Note computed from the two week totals. |

Where a pattern appears on two screens it is one component, not two: the
sparse-series treatment serves Body's HRV and any other partially-measured
metric, and `BandGauge` serves the live watt band and Progress's erg barometer.

`LiveMetric.jsx` already covers the live erg secondary metrics (HR, rate) —
use it rather than writing new ones; it needs the `accent` default changing
from `THEME.cyan` to `THEME.accent` under the rename.

### Existing components that the redesign supersedes

- `WorkoutTarget.jsx` — replaced by `PrescriptionCard`. Its disclosure pattern
  (collapsed by default, target hidden behind a tap) is the opposite of what
  Train needs.
- `LoadTooltip.jsx` / `StrengthTooltip.jsx` / `ErgTooltip.jsx` — the new charts
  put values on the axis instead of behind hover. Keep for desktop; they are
  not part of the mobile screens.

---

## 3. Replacement for `web/.design-sync/conventions.md`

That file still describes a dark-only system. Replace its theme section with
the contents of this project's `conventions.md`, which covers:

- light as primary, pastel fills with darker inks, white cards on `#bcc5dd`
- minimum font weight 500 (Archivo)
- contrast picked against the final ground and left alone
- z-index layering: sheet 200, backdrop 150, nav 100
- `flex` children and percentage heights — use definite track heights
- **charts must carry their own scale**: labelled axis in real units, two
  groundings (own recent history + a personal reference band with
  discriminating power — never the min/max envelope of the window being
  plotted), a score headline with a plain-language label, and a caption naming
  what is measured versus modelled
- any caption stating a count, rank or comparison is computed, never typed
- a NaN in a style string vanishes silently — guard every computed dimension,
  and make derived series carry their inputs (`{date, tss, ctl, atl, tsb}`) not
  just their outputs
- percentage padding resolves against **width**, not height — position points
  with definite pixels from the same `yPx`/`hi`/`lo` the axis uses
- per-item styles inside `sc-for` need one whole-declaration hole at the end of
  the style attribute
- session type is a design-system key (one of the nine strings), never the coarse
  `erg`/`str`/`bike` discipline — the coarse form collapses six accents into one
  and mislabels the TYPE column; chart legends are built from the types present
- a coverage claim needs a series with the gaps actually in it: count coverage
  from the array, and put the nulls in so the tile and the chart agree
- one reading, one derivation — the load model lives in a single shared module
  (`splitiq-load.js` here, `load.js` in the app), including `tsbBand()`; matching
  two screens by tuning digits is not deriving them the same way

The chart rules are the ones most likely to be violated by future work, because
a decorative line chart looks finished. Put them near the top.

---

## 4. Per-screen build notes

### Today — `SplitIQ Today - Redesign Light.dc.html`
Replaces the mobile analytics home. Readiness, autoregulation signal and
UT1/UT2 targets all derive from `analysis.js` + `deriveTargets` — no new maths.

### Progress — `SplitIQ Progress.dc.html`
Four sub-tabs: Load, Erg, Strength, History. Load is the session-bar rework.
Strength still reads the hardcoded `strengthTrend` in `App.jsx`; the "stale
source" caveat in the UI stays until `useStrengthPRs` is wired on desktop
(slice S2). TSB bands use the app's own `tsbColor` thresholds: +10 / −10 / −30.

### Train — `SplitIQ Train.dc.html`
Five states drawn: prescription at rest, library sheet, live erg mid-piece,
strength logger, session complete. Content is verbatim from `exercises.js` and
`STRENGTH_TEMPLATES`. Decisions worth preserving:

- Roster context (microcycle wave, year plan) stays on **Coach**. Train shows
  the consequence — the ramp flag — not the periodization.
- Live session owns the screen: no tab bar while a piece is running.
- Watts is the biggest number because the target is a watt band; the split is
  demoted to a line of text.
- Each lift has an image slot for a demonstration photo or GIF, plus a form cue
  from the program. **The images do not exist yet** — the slots are empty and
  need real assets sourced.
- Rest timer auto-starts on set log, default 120s.
- Session complete asks for sRPE and nothing else. Everything else on that
  screen (lifts, sets, volume, best e1RM) is derived from the sets just logged.

### Body — `SplitIQ Body.dc.html`
Readiness, the three readings behind it, and 14-day trends for sleep, RHR and
HRV. Two behaviours the current code gets wrong and this screen fixes:

- `computePersonalBaselines` already reports confidence **per metric** — RHR is
  personal (17 of 28 days), HRV falls back to the population default (6 of 28).
  The UI must say which, per tile, rather than implying one baseline quality.
- HRV is drawn as **gaps**. The existing chart's `connectNulls` draws a
  continuous line through days that were never measured.

Readiness 72, sleep 6.4h and RHR 60 are the same readings Coach cites — both
screens derive them, neither hardcodes them.

### Coach — `SplitIQ Coach.dc.html`
Signal first, reasoning second, chat third. The signal mirrors
`autoregulate()`: R4 or TSB < −25 or readiness < 50 → EASE; TSB < −10 or
readiness < 75 or R5 → PROCEED; else CLEAR. Each fired rule states what it
measured against which baseline (rolling 28-day trimmed mean, not a fixed
number).

The 14-day roster wave is where the Train decision landed: two weeks of roster
explains today's call. The full year plan and phase table stay a desktop
concern. The week-over-week drop in the caption is computed from the two week
totals.

Chat is the fallback sheet, not the front door — it already exists in code as
the whole view.

### Desktop overview — `SplitIQ Desktop Overview.dc.html`
First desktop screen. One combined overview at 1920 carrying what the five
mobile destinations carry, plus the two things deferred from mobile: hover
tooltips on the load chart, and the year plan with its phase table.

Two directions are in the file. **1b Ledger** is the chosen one — icon rail plus
a pane list, the session log as the primary view, three small multiples above
it, and a draggable split between the log pane and the detail pane. 1a Cockpit
(labelled sidebar, chart-led, two columns) is kept below it for reference.

Desktop-only affordances drawn: chart hover tooltip (per-day CTL/ATL/TSB),
resizable panes, sortable data table, year plan + phase table. The four tooltip
components §2 keeps "for desktop" now have a screen to live on.

New for the inventory:

| Pattern | Lives in | Props | Notes |
| --- | --- | --- | --- |
| Load model | `web/src/lib/load.js` — extract from `analysis.js` | series seed, EMA constants | See §6. One module, both screens. |
| `tsbBand(tsb)` | same module | `tsb` | Returns label + token. Replaces inline threshold ternaries. |
| Small-multiple row | new `components/MetricRow.jsx` | `points[]`, `band`, `axis`, `last`, `delta` | `SparseSeries` with its own labelled axis per row. Gaps, not interpolation. |
| Sortable session table | new `components/SessionTable.jsx` | `rows[]`, `sortKey`, `sortDir`, `onSort` | TSS column carries a magnitude bar scaled to the heaviest logged session. |
| Resizable split | new `components/SplitPane.jsx` | `width`, `min`, `max`, `onResize` | Desktop only. |
| Phase table | new `components/PhaseTable.jsx` | `phases[]`, `weekNo` | Bar widths are real week spans; current phase derived from `weekNo`. |

---

### Not yet designed
Undrawn states, in one family: load pending, load unavailable (both specified
in `ISSUES-load-states.md`), readiness NO DATA (`computeReadiness` returns a
null score when RHR is missing), chat empty and chat error. A desktop pass is
separate scope.

---

## 5. The load model must be one module

The desktop screen and Coach both cite form, CTL, ATL and readiness for the same
day. They drifted: form matched at −8.9 while CTL read 51.1 on one screen and
16.4 on the other, because each screen carried its own copy of the maths and the
numbers had been reconciled by digits rather than by derivation.

In this project the fix is `splitiq-load.js` — series, seed, EMA constants,
readiness deductions, baseline coverage and `tsbBand()` in one file, loaded from
each DC's helmet. **In the app, do the same:** one `load.js` that owns the model,
imported by every view that cites it. No view recomputes CTL, and no view
hardcodes a band threshold.

`tsbBand` is canonical at +10 / −10 / −30 (the app's existing `tsbColor`), so
−8.9 is Neutral and green on every screen. Coach previously rendered it gold.

Coverage figures follow the same rule: count them from the series
(`arr.filter(v => v != null).length`), and make the mock series carry the gaps
it claims — sleep 28/28, RHR 17/28, HRV 10/28, with the charts drawing those
gaps.

---

## 6. Order of work

1. Token seam + key rename (blocks everything)
2. Load pending / unavailable states (in flight in another session)
3. `PrescriptionCard`, `SessionLibrarySheet` — Train at rest
4. `LiftCard`, `SetRow`, `RestTimer` — strength logger
5. `BandGauge` + live erg (also serves Progress's erg barometer)
6. `SessionComplete` — closes the logging loop
7. `SessionBar` — needs a session store that outlives the route
8. `ReadinessCard` + `SparseSeries` — Body
9. `SignalCard` + `RosterWave` — Coach
10. Undrawn states above
11. Desktop: the load-model extraction in §6, then `SplitIQ Desktop Overview.dc.html`
