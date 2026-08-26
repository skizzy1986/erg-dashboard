# SplitIQ light redesign — handoff

Everything designed in this project, mapped to the code that has to change.
Read in order: the token seam first, since nothing else ships consistently
until it lands.

Source of truth for the designs — all five nav destinations are now drawn:
`SplitIQ Today - Redesign Light.dc.html`, `SplitIQ Progress.dc.html`,
`SplitIQ Train.dc.html`, `SplitIQ Body.dc.html`, `SplitIQ Coach.dc.html`.
Desktop: `SplitIQ Desktop Overview.dc.html`, `SplitIQ Desktop Progress.dc.html`,
`SplitIQ Desktop Body.dc.html`, `SplitIQ Desktop Planning.dc.html`.

**A code session cannot read this project.** Its container is cloned from git,
so this file only reaches it once committed to `web/.design-sync/HANDOFF.md`,
alongside `conventions.md` and `ISSUES-load-states.md`.

---

## 1. The token seam (do this first)

> **Step 1 has shipped.** The role rename landed as `#277` (closing `#248`) with
> **no value moved** — every hex appears on both a `+` and a `-` line, which is what
> let the seven colour-locking test files through unmodified. Remaining: the
> `var()` seam (`#250`), then the light flip (`#251`). Three issues came out of the
> rename and should land before the seam: `#278` local `C` alias maps whose keys are
> still colour words (`C.accent` currently holds green, `C.cyan` holds the accent),
> `#279` raw hex literals in `constants/ui.js`, `#280` prose colour-words in
> `docs/*.md` naming keys that no longer exist.

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
| `teal` | ~~*(fold into `positive`)*~~ `cycling` | `#10786c` | **Not folded.** Cycling is the discipline; `positive` is done/healthy/UT1/lower strength. `#277` reached the same conclusion but named it `positiveAlt` — converge on `cycling` before the seam. |
| `grey`, `white` | *(delete)* | — | use `muted` / `surface` |

Keep the structural keys (`bg`, `surface`, `raised`, `field`, `border`, `text`,
`muted`, `surfaceAlt`, `neutral`, `divider`, and the `text*` ramp) — they are
already role-named.

`#277` also added `neutralAccent` and `textStrong`, which this table did not
anticipate. Light values for both are in `conventions.md` and
`splitiq-light-tokens.css`: `neutralAccent` #98a1bb (rest sessions, non-text),
`textStrong` #1c1e2a (an alias of `text` on light, kept so dark can diverge).

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
   sizes used. Any component setting `fontWeight: 400` needs raising. The
   typeface is **Archivo + IBM Plex Mono**, self-hosted. `STATE_OF_PLAY.md` §4.1
   proposed Plex Sans + Plex Mono on metric-compatibility grounds; design
   overruled it on 2026-08-25 — Archivo has the presence the large figures need.
   **§4.1 is superseded on the typeface.** `cfg.extraFonts` needs the Archivo
   woff2 files at 500+ weights, which is what issue **#254** already specifies —
   that issue stands as written.

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
| Load model | `web/src/lib/load.js` — extract from `analysis.js` | series seed, EMA constants | See §5. One module, every screen that cites form, CTL, ATL or readiness. |
| `tsbBand(tsb)` | same module | `tsb` | Returns label + token. Replaces inline threshold ternaries. |
| Small-multiple row | new `components/MetricRow.jsx` | `points[]`, `band`, `axis`, `last`, `delta` | `SparseSeries` with its own labelled axis per row. Gaps, not interpolation. |
| Sortable session table | new `components/SessionTable.jsx` | `rows[]`, `sortKey`, `sortDir`, `onSort` | TSS column carries a magnitude bar scaled to the heaviest logged session. |
| Resizable split | new `components/SplitPane.jsx` | `width`, `min`, `max`, `onResize` | Desktop only. |
| Phase table | new `components/PhaseTable.jsx` | `phases[]`, `weekNo` | Bar widths are real week spans; current phase derived from `weekNo`. |
| Desktop nav rail | new `components/desktop/NavRail.jsx` | `active`, `onNavigate` | 64px, one 38px chip per desktop destination — currently Overview, Today, Planning, Progress, Body, Coach. **The list is desktop’s own, not the mobile IA:** Planning has no mobile destination, Train has no desktop one. Adding a desktop screen means adding its chip here, in the same change — a destination reachable only from its own screen is not reachable. 20px stroke glyphs on `currentColor`. **Deliberate divergence from `BottomTabBar`** — its tab list is internal and is the old 13-tab IA, and emoji cannot take the active-state ink on a dark rail. Reasoning in `conventions.md`. Only stroke icons in the system; extend this set rather than starting a third. |
| Zone table | util in the load module | `cp` | Six bands — Recovery, UT2, UT1, AT, TR, AN — at 0.55/0.70/0.80/0.90/1.05/1.30 × CP. Names and fractions from the shipped `PACE_ZONES`; its watt bounds are frozen at CP 190 and must not be copied. |
| Erg zone chart | new `components/ErgZoneChart.jsx` | `pieces[]`, `cp` | Watt dots over the derived bands, plus the split view. Split is computed from watts, so the two charts are one measurement — the caption must say so. |
| Zone distribution list | part of `ErgZoneChart` | `counts`, `cp` | All six bands always shown; empty ones dimmed, never dropped. |

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
- minimum font weight 500 (Archivo + IBM Plex Mono, self-hosted)
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

Everything it introduces is in §2’s inventory — the desktop rows sit in that
single table rather than a second one here.

---

### Progress — desktop `SplitIQ Desktop Progress.dc.html`
The four sub-tabs become four panes on 1b’s frame: Load, Erg, Strength, History.
Each pane owns one of the four tooltip components — `LoadTooltip`, `ErgTooltip`,
`StrengthTooltip`, `PaceTooltip` — rebuilt light, same content contracts. That
closes §2’s “keep for desktop” note: they now have a screen.

- Erg watts, splits and every zone band derive from CP in the load module. Split
  comes from the standard rowing power relation, so the watts chart and the split
  chart are two views of one measurement, not two measurements.
- All six zones are named and shown, empty bands dimmed. See `conventions.md`.
- The strength pane carries the stale-source caveat with its sparsity computed:
  4 of 20 logged sessions carry sets, 8 points across 4 lifts. Two points per
  lift states a direction, not a trend, and the caption says so.

### Desktop scope — no live surfaces
**Decided 2026-08-24.** Live session tracking is mobile-only. Desktop carries no
prescription card, watt band gauge, set logger, rest timer or sRPE prompt —
those are logged mid-workout on a phone, and a desktop copy of them would be a
surface nobody can reach at the moment it is needed.

Desktop is the analytical layer: long windows, several series at once, the full
zone table, sortable logs, periodisation, and the reasoning behind a call.

Consequences for this document:

- §2’s `PrescriptionCard`, `SessionLibrarySheet`, `BandGauge`, `SetRow`,
  `LiftCard`, `RestTimer`, `SessionComplete` and `SessionBar` are
  **mobile-only**. Build them once, for the phone.
- `BandGauge`’s second use — Progress’s erg barometer — stands, because that is
  a read of past pieces, not a live gauge.
- **Train has no desktop counterpart.** The remaining desktop screens are
  analytical: Progress (built), and the planning and reasoning views.
- The five destinations are the mobile IA. A desktop screen named after one is
  the analysis behind it, not the same screen at a wider width.

### Body — desktop `SplitIQ Desktop Body.dc.html`
The analysis behind readiness, not the score. Four panes: Score, Sleep,
Resting HR, HRV.

- **Score** carries a waterfall from 100 down to today’s value — each red band is
  exactly what that metric cost — plus readiness reconstructed across all 28 days
  from the same formula.
- **11 of 28 days have no readiness value.** Those are the days RHR is missing.
  They render as stubs, never zeroes: `computeReadiness` returns null, and a
  missing score is different information from a low one.
- **Baseline confidence is per metric, never global.** Sleep personal 28/28, RHR
  personal 17/28, HRV population default 10/28. A single global confidence badge
  would overstate what the data supports.
- **The coefficients are published on screen**, not described: 12 points per hour
  of sleep below baseline, 2 per beat of RHR above it, 1 per day of HRV staleness
  on a base of 2, capped at 8. Deductions read those numbers.

New for §2’s inventory:

| Pattern | Lives in | Props | Notes |
| --- | --- | --- | --- |
| `readinessSeries()` | the load module | — | Per-day readiness over the window, same arithmetic as the live score. Returns null-score days rather than omitting them. |
| Score waterfall | new `components/ReadinessWaterfall.jsx` | `deductions[]`, `score` | Running total per column; band height is the cost. Label flips below the bar when the column is too tall for an above-bar label. |
| Baseline quality list | new `components/BaselineQuality.jsx` | `coverage`, `baselines` | Per-metric coverage bar and personal-vs-default source line. |
| `rosterCheck()` | the load model | `kind`, `homeTss`, `awayTss` | Judges one discipline against `ROSTER.expects` within `ROSTER.tolerancePct`. Every verdict cell derives from it; a discipline with no rule returns `no rule` and must render no judgement. |
| Roster contract | `ROSTER` in the load model | — | `homeDays`/`awayDays`, `tolerancePct` 25, `expects` { erg: hold, str: fall, bike: null }. Thresholds that decide an on-screen verdict live here, not in a view. |
| Out-of-band cap | part of the metric chart | `outside` | 4px `#1c1e2a` top cap on bars outside ±1 SD. Must not be a repaint in the warning ink — that ink is also a metric ink and the encoding collapses. See `conventions.md`. |
| Coverage grid | part of `BaselineQuality` | `series[]` | One cell per day per metric; grey is unrecorded. |
| Sensitivity table | new `components/ScoreSensitivity.jsx` | `SENS` | Reads the coefficients from the model — never a hardcoded copy. |

### Planning — desktop `SplitIQ Desktop Planning.dc.html`
Desktop-only. The periodisation parked from Coach: Coach shows today's call, Planning
shows the 34-week season and the 14-day swing that produced it. Two panes —
Season and Microcycle — on 1b's frame, with the same draggable split.

- **Season** is the phase table plus fitness against the block target. Phase bar
  widths are real week spans, the current block derives from the week number, and
  the CTL line is the same series every other screen reads. Hovering a phase row
  fills the detail pane with its length and target — the desktop tooltip pattern
  again, not a new one.
- **Microcycle** is the full home/FIFO swing as a discipline split: home TSS,
  FIFO TSS, the change, the rule that applies, and the verdict. Every verdict cell
  is `rosterCheck()` — a discipline with no rule (bike) renders `no rule` and no
  judgement. Thresholds live in `ROSTER`, not in the view.
- **The plan is a plan.** The caveat card states what is prescribed versus what is
  logged; targets are intent, and the fitness line is the only measured thing on
  the Season pane.
- Nav rail gains its **Planning** chip here — a desktop destination with no mobile
  counterpart. See the `NavRail` row in §2.

New for §2's inventory:

| Pattern | Lives in | Props | Notes |
| --- | --- | --- | --- |
| `seasonPlan()` | the load module | — | Phases, week spans, block CTL targets, current block from the week number. One definition of the season; no view names a phase. |
| Season phase table | extends `PhaseTable.jsx` (§2) | `phases[]`, `weekNo`, `onHoverPhase` | The §2 row gains hover — the row feeds the detail pane rather than a floating tooltip. |
| Discipline split table | new `components/desktop/DisciplineSplit.jsx` | `rows[]`, `roster` | One row per discipline over the swing; verdict from `rosterCheck()`, never from a comparison in the cell. |

### Not yet designed
Undrawn states, in one family: load pending, load unavailable (both specified
in `ISSUES-load-states.md`), chat empty and chat error.

Readiness NO DATA is **drawn** — desktop Body reconstructs readiness over the
window and renders the 11 RHR-less days as null-score stubs. The mobile
readiness card still needs the same state.

Desktop scope is no longer "separate": see the platform-split note above. Built
so far — Overview, Progress, Body, Planning. Coach's desktop counterpart (the
reasoning view) is the remaining one; Train has no desktop counterpart by decision.

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

**Known divergence, 2026-08-25.** The desktop screens and Coach read the shared
module and now show form −8.3 / CTL 50.8 / ATL 59.1. The five mobile designs
still carry hardcoded −8.9 / 16.4 / 25.3 in their own markup — they predate the
module. That gap is the debt this section describes, made visible: the mobile
screens should read the same `load.js` rather than be hand-corrected to match.
Do not reconcile them by editing digits.

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
11. Desktop: the load-model extraction in §5, then `SplitIQ Desktop Overview.dc.html`
