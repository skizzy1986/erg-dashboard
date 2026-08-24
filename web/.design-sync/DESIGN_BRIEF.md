---
title: UI & Information Architecture Brief
category: guidelines
status: partially-ratified
date: 2026-08-22
---

# SplitIQ — UI & Information Architecture Brief

Companion to [`conventions.md`](./conventions.md). That document is **descriptive** — written to make
a design agent reproduce the current look, not to state intent. This one is **prescriptive**: where
SplitIQ should go, and why.

The distinction matters for how freely this brief proposes change. Per the sync session that
authored it, one part of `conventions.md` is real and must be preserved:

> **The accent→meaning mapping is domain logic.** `cyan` = erg/aerobic and primary, `green` =
> done/healthy/UT1 and lower strength, `purple` = upper strength, `gold` = threshold or target
> prompt, `orange` = elevated load, `red` = error/redline, `teal` = cycling, `grey`/`neutral` = rest.

Everything else in it — **the palette values, radii, spacing and type scale — is incidental and was
never designed.** Nothing in this brief needs to defend them, and it does not try to.

Scope: direction only. Nothing here is implemented. Every claim is measured against branch
`config/design-sync` at commit `7f22f66` (2026-08-22), with file and line references.

The brief exists because the app has two problems its owner named plainly:

> "Too much data on screen." · "Navigation is confusing."

Neither is a matter of taste. Both are structural, both are measurable, and the measurements point
somewhere specific.

---

## 0. The six findings, up front

1. **Thirteen tabs is not a decision.** It is what happens thirteen times when the only container
   the app has ever had is an array entry. (§1.1)
2. **Six of the thirteen tabs are documents, not tools** — and two more are live features rendered
   from stale constants while working hooks sit unused. (§1.2)
3. **Several headline desktop numbers are decorative** — CTL/ATL/TSB from a constant, distance
   hardcoded, FTP hardcoded. This is the *hidden cause* of "too much data": you cannot delete a
   number you do not trust. (§1.3)
4. **66% of all type in the app is ≤10px**; 3.3% is ≥18px. Nothing is bigger than anything else, so
   the eye has nowhere to land. (§1.4)
5. **The app renders entirely in the Courier fallback.** `'DM Mono'` is named 45 times and never
   loaded. This is the single largest, cheapest win available — and the typography strategy behind
   it deserves a harder look than just fixing the link. (§1.5)
6. **There is no styling seam.** No component accepts `className`, `style`, or any override. A
   restyle is an edit to every component file. Theming, light mode and density options are not
   currently possible at all. (§1.8)

---

## 1. Diagnosis

### 1.1 The tab array is the app's only unit of composition

`src/App.jsx:300-338` is a literal array of thirteen `[id, label]` pairs rendered as buttons at
`fontSize: 9`. `src/App.jsx:164` is `useState('overview')`. There is no router, no URL, no browser
back, no deep link. There is also no `Card`, no `Section`, no drawer, no modal, no tab primitive.

**Thirteen tabs is not a decision anyone made.** It is what happens thirteen separate times when the
only available move is "add an entry to the array."

The corroborating evidence: the two places that genuinely needed second-level navigation each
invented it locally, and incompatibly. `src/views/ProgramView.jsx:34-60` hand-rolls a
Phases / 2-Wk Cycle / Annual strip. `src/StrengthLogger.jsx` ships its own `<nav>` inside an
`innerHTML` skeleton. Same problem, two solutions, because there was no shared one.

### 1.2 Six of the thirteen tabs are documents, not tools

Classified by what each view actually reads:

| Tab | Reads | Verdict |
|---|---|---|
| `live` | `usePM5`, `useOfflineQueue`, Supabase write | Tool |
| `logger` | Supabase direct | Tool |
| `log` | `useSessionLog` + `LogSessionForm` | Tool |
| `coach` | `useCoach` | Tool |
| `erg` | `useErgSessions`, `useAnchors` | Live analysis |
| `calendar` | `useBenchmarkStatuses` + live sessions | Live analysis |
| `plan` | live `plannedSessions` (75 lines) | Live analysis, thin |
| `overview` | mixed — mostly constants | Mixed |
| `program` | `PHASES`, `HR_ZONES`, `SRPE_SCALE` constants (3,055 lines) | **Document** |
| `journal` | `DECISION_LOG`, `HYPOTHESES`, `RULE_FIRING_HISTORY` | **Document** |
| `mobility` | `mobilityLog` constant | **Document** |
| `recovery` | `recoveryLog` constant (`src/constants/logs.js:343`) | **Document in a tool's clothing** |
| `strength` | `strengthTrend` hardcoded at `src/App.jsx:85-122` | **Document in a tool's clothing** |

`src/views/JournalView.jsx` says so itself in its header comment: *pure presentation over static
journal data — no props, no state.*

The last two rows are the sharp ones. `recovery` and `strength` are live features rendered from
stale constants — while `useVitals` and `useStrengthPRs` exist, work, and are already wired up on
mobile. **A document does not need a top-level tab. It needs a shelf.**

### 1.3 Several headline desktop numbers are decorative

| Location | What it does |
|---|---|
| `src/App.jsx:190` | CTL/ATL/TSB from the static `DAILY_TSS` constant, not `useTSSHistory` |
| `src/App.jsx:204` | `totalErgDist = 55000` — hardcoded |
| `src/App.jsx:166` | `ftp = 190` — hardcoded |
| `src/App.jsx:85-122` | e1RM history for 8 lifts — hardcoded, passed to `StrengthView` |
| `trainingConfig.js:261` + `tssData.js:1` | Two copies of `DAILY_TSS`; desktop imports one, mobile the other |

**This is the hidden cause of "too much data on screen."** You cannot delete a number you do not
trust. When the headline stat might be decorative, the rational response is to keep every
corroborating number visible so you can cross-check — which is exactly what the current home screen
does. Data-truth uncertainty causes data hoarding.

The consequence: fixing the numbers is a **design prerequisite**, not a separate engineering chore.
Redesign first and you build a prettier frame around fake numbers, and the cut cards come back.

### 1.4 The type scale has collapsed

631 numeric `fontSize` declarations across `src/**`:

| px | 6 | 7 | 8 | **9** | 10 | 11 | 12 | 13 | 14 | 15 | 16–17 | 18–24 | 28–52 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| n | 1 | 8 | 70 | **225** | 115 | 91 | 50 | 24 | 12 | 10 | 4 | 14 | 7 |

**66% of all type is ≤10px. 3.3% is ≥18px.** `fontSize: 9` alone is 225 declarations. There is no
mid-range.

This is the measurable form of "too much data on screen" — not the *quantity* of information, but
that **nothing is bigger than anything else**.

`src/views/OverviewView.jsx` compounds it: eight full-width cards, all sharing the same treatment
(`background:'#2a2a48'`, `1px solid #4a4a68`, `borderRadius:6`, `padding:'14px 16px'`, label at
`fontSize:9 letterSpacing:3`). Identical visual weight for eight items of wildly different
importance means the page has no entry point.

Two of those blocks are the same data twice on one screen: the RECENTLY COMPLETED list inside the
status strip (`:50-362`) and the RECENT SESSIONS list (`:1286-1307`), about 70px apart.

### 1.5 The app has no typeface

`'DM Mono'` is referenced **45 times across 16 files**. `index.html` loads no webfont. There is no
`@font-face` anywhere in the repo.

**Every screen renders in the Courier/monospace fallback, and always has.** `NOTES.md` records this
as faithful-to-production for sync purposes — correct there. For the app it is simply a bug.

But the bolder observation is that fixing the link is not the right fix. `conventions.md` describes
the house identity as *"dark-only, data-dense, monospace-numeral."* **Monospace-numeral is right.
Monospace-everything is what reads as homemade.** Every commercial reference — Strava, Whoop, Hevy,
TrainingPeaks — pairs a UI sans for chrome, labels and prose with tabular or monospaced figures for
data. Courier for section labels, button text and body copy is the single loudest signal that this
is a personal project.

See §6.1 for the recommendation. This is the highest ratio of perceived polish to effort anywhere in
the brief.

### 1.6 `THEME.muted` fails WCAG AA on the standard card background

Computed contrast ratios against `src/constants/theme.js`:

| Foreground | on `bg` #08080d | on `surface` #1a1a2e | on `raised` #2a2a48 |
|---|---|---|---|
| `text` #e8e8f0 | 16.40 | 14.00 | 11.31 |
| `textSubtle` #aaaacc | 8.88 | 7.58 | 6.13 |
| **`muted` #7e7e9a** | 5.08 | **4.34 ✗** | **3.50 ✗** |
| `textFaint` #6c6c88 | **3.94 ✗** | **3.36 ✗** | **2.72 ✗** |
| `textDim` #5a5a74 | **3.00 ✗** | **2.56 ✗** | **2.07 ✗** |

`THEME.muted` is the most-used text colour in the app, `THEME.raised` is the standard card
background, and the pair is **3.50:1** — below the 4.5:1 AA threshold. `conventions.md` currently
recommends exactly this pairing for section labels.

CI already gates Lighthouse accessibility at **≥ 0.78 as an error** (`lighthouserc.json`). Both a
real defect and free headroom.

### 1.7 The 767px fork turned one product into two

`src/main.jsx:289` is `{isMobile ? <MobileApp/> : <App/>}` — two entirely separate trees, not a
responsive layout. Only `ErgLiveView` and `CoachView` are shared. Eight desktop tabs have no mobile
equivalent. `RecoveryView.jsx` (781 lines) and `MobileRecovery.jsx` (632 lines) are the same feature
built twice, disagreeing about the data.

Three uncoordinated breakpoints exist: 767 (`hooks/useIsMobile.js`), 900 (`isWide`,
`src/App.jsx:183`), 600 (`isMid`, `src/App.jsx:184` — **dead, never read**).

The fork *caused* §1.3's divergence. Two trees owning one concept produce two answers.

### 1.8 There is no styling seam

Every component styles itself with inline `style` objects reading a hardcoded `THEME`. **None accept
`className`, `style`, `sx`, or any escape hatch** — appearance is controlled only by semantic props
(`accent`, `size`, `dimmed`, `done`). There is no stylesheet, no provider, no context.

Two consequences, and the second is the one that bites:

1. **A restyle is an edit to every component file.** There is no central lever. The 973 hardcoded hex
   literals are a symptom of this, not the cause.
2. **Theming, light mode and density options are not currently possible.** Not "deferred" —
   structurally unavailable. There is nowhere for the decision to enter.

This is the constraint that turns §5's primitives from a convenience into a prerequisite. It also
narrows §2.3: **a `density` prop cannot propagate through components that have no seam to receive
it.** Either the new primitives ship a seam the existing eleven lack, or density stays impossible.

The recommendation is in §5.1. It is a deliberate divergence from `conventions.md`'s
no-escape-hatch rule, and it should be made knowingly rather than by accident.

### In one sentence

> SplitIQ has thirteen tabs because a tab was the only container it ever had; it has too much on
> screen because eight subsystems render at identical weight in 9px Courier; and none of it can be
> cut until the desktop numbers stop being decorative.

---

## 2. Target information architecture

### 2.1 Thirteen tabs → five destinations

| # | Destination | Question it answers | Absorbs |
|---|---|---|---|
| 1 | **Today** | *What am I doing today, and am I ready?* | `overview` (rebuilt), mobile `analytics` hero |
| 2 | **Train** | *Do the thing.* | `live`, `logger`, `log` (capture), `plan` |
| 3 | **Progress** | *Am I getting better?* | `erg`, `strength`, `calendar`, `log` (history), training load |
| 4 | **Body** | *What state am I in?* | `recovery`, `mobility` (doing), nutrition |
| 5 | **Coach** | *Why am I doing this?* | `coach` (Ask) + Playbook (§2.2) |

**Nothing is deleted. Everything is re-addressed.** Every current tab has a named home, which is what
makes this shippable as re-parenting rather than as a rewrite.

Second-level navigation uses one pattern — a `SegmentedNav` strip under the page title. This
*standardises* the two hand-rolled instances from §1.1 rather than adding a third.

### 2.2 Reference content goes on a shelf, inside Coach

Moving to **Coach → Playbook**: `ProgramView` phases/cycle/annual, `JournalView`'s four ledgers, the
full `ADAPTIVE_RULES` set and `RULE_EVOLUTION` log currently behind a `<details>` in
`OverviewView.jsx`, the hardcoded SEQUENCING RULES array (`OverviewView.jsx:1309-1358`),
`SRPE_GUIDE`, and the mobility routine library. Mobility's *doing* side stays in Body.

**Why Coach and not a sixth tab:** the Playbook answers the same question the chat answers — *why am
I doing this?* One question, one address. Coach is also one of only two views already shared across
the `main.jsx:289` fork, making it the lowest-risk merge point in the codebase.

The consequence for Today is the important part: every home-screen block whose job is *explanation*
becomes a **"Why?" affordance that deep-links into the Playbook**. That is the single largest cut to
Today, and it is principled — it follows from what the block *is*, not from how much room it takes.
Cutting explanation stops being a loss of information and becomes a change of address.

`ProgramView`'s internals are not touched — one line of nav config. Decomposition rides with #77;
#183 already excludes it from hex migration.

### 2.3 Converge onto the mobile IA — phone is primary

Decided 2026-08-22. Android ships via Capacitor, and the phone is what sits next to the erg.
Desktop's job becomes *the same five destinations with room to breathe*, not a different product.

This does not require deleting the fork immediately. Three stages, each independently shippable:

1. **Nav semantics** — same five ids, same order, same content ownership on both trees.
2. **Per-destination layout** convergence.
3. Only then does `main.jsx:289` become `<AppShell density={isMobile ? 'compact' : 'comfortable'}>`.

The fork survives as a **density** decision long after it stops being an **IA** decision. Along the
way `isWide` (900) and dead `isMid` (600) are deleted — one breakpoint, one source.

**Stage 3 is gated on §1.8.** Density is not a prop that can be threaded through today's components;
they have no seam to receive it. It requires the token-module mechanism in §5.1. Stages 1 and 2
deliver most of the value and need no seam at all — so this ordering is not a dependency trap.

### 2.4 StrengthLogger becomes a mode, not a place

Entered from Today's primary CTA or from Train: push in, do the workout, pop back.

1. **It cannot be a peer.** `src/StrengthLogger.jsx` is a vanilla-JS app — a ~110-line CSS template
   string with `.slog`-scoped classes, a `SKELETON` innerHTML string, imperative
   `document.createElement` throughout. React's only role is `dangerouslySetInnerHTML` plus a mount
   effect. It cannot consume shared components without the rewrite that is #79's job. Making it a
   *mode* requires touching none of that.
2. **It is the correct commercial pattern.** Hevy, Strong and Fitbod all treat an active workout as
   a full-screen mode that suppresses global chrome. Logging is a state you are in, not a page you
   are on.
3. **It fixes a live z-index bug by construction.** `#restBar` is z-110 and outranks `BottomTabBar`
   at z-100; `#toast` at z-80 renders *below* the nav. Suppressing the tab bar during a workout
   resolves this without renumbering anything.

Worth noting: StrengthLogger's private CSS (`--radius:12px`, `.card`, `.pill`, `.btn` with
sec/ghost/danger/good/sm/xs variants, `.section-title`) is **the closest thing this repo has to a
design system** — and it lives in the one file that cannot share it. Mine it for values; do not
couple to it.

---

## 3. Principles for the Today screen

Six principles, each named and *testable* — the tests matter, because §1.4 shows this screen
re-accumulates by default.

**P1 · One headline answer per screen.** Every screen answers one question, and the answer appears in
type ≥28px before any 9px text does. Today's question: *am I recovered, and what am I doing?*
Exactly one primary action button.
*Test:* screenshot the top 400px at 390×844 — someone who has never seen the app can state the
answer. Today the top 400px shows a date, a phase label, a week counter, a readiness score, a
coloured badge and a workout item: six competing answers.

**P2 · Hierarchy is size and position; colour is domain meaning.** The accent→meaning mapping
(cyan = erg/aerobic, purple = upper, green = lower/done, gold = threshold, orange = elevated load,
teal = cycling, grey = rest) is **real domain logic and must be preserved** — it is the one part of
`conventions.md` that was designed rather than accreted. Which is exactly why it must not be spent
on decoration: the app currently colour-codes section labels by *topic* (SEQUENCING RULES green
`:1320`, NUTRITION STATUS red `:1085`, TRAINING LOAD orange `:925`), so a green label means
"nutrition heading" in one place and "UT1/done" in another. That collision devalues the vocabulary
everywhere it is legitimately used.
*Test:* render in greyscale — reading order survives unchanged. And: every accent in the Today
subtree traces to a session type or a status, never to a heading.

**P3 · Every number on Today is live, or it is not on Today.**
*Test:* the `views/today/` subtree imports nothing from `constants/` except `theme.js`, `tokens.js`,
nutrition targets and `sessionStatus.js`.
*Today, five of eight blocks fail this.* That ratio is the honest measure of how much of this
redesign is really a data problem.

**P4 · Reference is pulled, never pushed.** Static explanation is one tap from the thing it explains
and appears in zero default scrolls.
*Test:* no `<details>` and no inline prose array literals in `views/today/`.

**P5 · Three screenfuls, hard cap.**
*Test:* Playwright asserts `document.body.scrollHeight <= 3 * window.innerHeight` on Today. Cheap,
objective, CI-enforceable — the only thing that will stop the screen growing back to 1,361 lines.

**P6 · One card, one section label, one stat tile.** No bespoke card markup in the Today subtree.
*Test:* zero raw `background:'#2a2a48'`, zero raw `borderRadius:`, zero raw `letterSpacing: 3` in
`views/today/`.
Without P6 this is a one-off polish job and Progress and Body get hand-rolled again from scratch.

---

## 4. The proposed Today screen

Hero decided 2026-08-22: **"Am I recovered?"** — a readiness score.

Note the dependency this creates: readiness is computed today from the static `recoveryLog`
constant, so **the chosen hero is blocked on the data-truth fix**. Interim option is a TSB hero,
already live on mobile via `useTSSHistory`.

### 4.1 Five blocks

| | Block | Content | Type weight |
|---|---|---|---|
| 0 | Header | `SPLITIQ` · date · phase chip (`BUILD · wk 4/6`) | 13 / 11 / 10 |
| 1 | **Readiness hero** | One number, one plain-English sentence. Nothing else. | 52 / 14 |
| 2 | **Today's session** | Label, duration, watt band, pacer cue, one adaptive-adjustment line, **one CTA**. "Why?" → Coach. | 20 / 14 / 11 |
| 3 | Next up | 3 rows: date + label | 12 |
| 4 | This week | Sessions done/planned, weekly TSS, 40px sparkline | 24 / 10 |
| 5 | Recent | 3 rows, tap for detail | 12 |

Target ~250 lines across `views/today/*` — satisfying #114's 800-line rule by construction.

### 4.2 Disposition of the current eight blocks

**(a) Today status strip** `:50-362` — **SPLIT into four.** One block doing five jobs in 312 lines;
splitting it is what makes hierarchy possible at all. Date + phase + week → header chip. Readiness +
signal → **hero, promoted to 52px**. Today's `WorkoutItem`s → session card. UPCOMING → block 3.
RECENTLY COMPLETED → **merge into block 5**.

**(b) Phase context card** `:365-468` — **MOVE → Playbook.** The arc strip and Doing / Why now / Not
yet / Next gate prose is static `PHASE_CONTEXT`. Weekly orientation, not daily. Fails P4. A one-line
header chip carries everything genuinely daily.

**(c) 4-up stat grid** `:471-527` — **CUT 2, MOVE 2, REPLACE.** SESSIONS LOGGED and ERG DISTANCE are
cumulative vanity totals that barely move day to day — and `totalErgDist` is literally `55000`
hardcoded (`App.jsx:204`), a decorative number in prime real estate. LATEST WATTS and SQUAT e1RM are
progress facts → **Progress** (and `strengthTrend` is stale anyway). Replace with block 4, which
answers *am I on track?* rather than reporting a number that never meaningfully changes.

**(d) Adaptive Engine card** `:530-747` — **DEMOTE to one line.** *(Decided 2026-08-22.)* 217 lines
rendering a rules engine's source of truth on the home screen — the highest-value single cut on the
page. Keep one line inside the session card: *"Volume trimmed 10% — low HRV"*, tappable. The full
`ADAPTIVE_RULES` set and `RULE_EVOLUTION` log → Playbook. It is documentation, not status.

**(e) Today's Prescription** `:750-905` — **MERGE into block 2.** UT1/UT2 bands and the pacer cue
*are* today's session. Today currently has two separate cards about today; that duplication costs
155 lines for zero information gain and is a first-order driver of the density complaint.

**(f) Training Load card** `:908-1065` — **SPLIT.** TSB survives as the hero's supporting line.
CTL/ATL tiles and the 160px `LineChart` → **Progress**: a 30-day trend answers a weekly question and
is the largest render cost on the page. Optionally keep a 40px sparkline in block 4. Blocked on the
data fix — reads static `DAILY_TSS` today and fails P3.

**(g) Nutrition Status** `:1068-1283` — **MOVE → Body.** Daily in kind, but it is a *second
headline*, which breaks P1 outright. Also reads the static `nutritionLog` and fails P3. If a daily
cue is wanted it earns **one line** in block 4 — once intake is live.

**(h) RECENT SESSIONS + SEQUENCING RULES** `:1286-1358` — **MERGE + CUT.** Recent sessions merges
with (a)'s duplicate list. SEQUENCING RULES is an 8-item hardcoded array that has not changed and
will not change → Playbook. It is a poster on the wall, and posters do not belong on a dashboard.

**Net: 8 cards → 5 blocks. ~1,361 lines → ~250.** Three of the five blocks did not exist as such
before; they are extractions from (a), which was already carrying them at 9px.

---

## 5. Missing primitives

None of §4 is buildable today. There is no shared `Card`, `StatTile`, `SectionHeader`, `Button`,
`Pill`, `Badge`, `Grid` or `Modal` — every one is hand-rolled inline in every view. All proposals
below are inline-style React components; no CSS, no `className`.

### 5.1 The new primitives must ship the seam the existing eleven lack

Per §1.8, no current component accepts a styling override, so theming and density are structurally
impossible. If the ten primitives below are built the same way, that stays true forever and §2.3
stage 3 never happens.

**Recommendation — two seams, both narrow:**

1. **Every primitive accepts and merges a `style` prop last.** `style={{...base, ...style}}`. One
   line per component. This is a deliberate divergence from `conventions.md`'s no-escape-hatch rule,
   and it is worth taking: the rule was protecting consistency that the 973 loose hex literals show
   was never actually held. The domain components (`LogEntry`, `WorkoutItem`, `LiveMetric`) can keep
   their closed contracts — the divergence applies to *layout* primitives only, where the whole job
   is to be composed into arrangements their author did not anticipate.

2. **Density enters through the token module, not through props.** `tokens.js` exports
   `spaceFor(density)` / `typeFor(density)`; `AppShell` resolves density once and primitives read
   the resolved scale. This avoids threading a `density` prop through every component — which is
   the same prop-drilling mistake `isWide` already makes (`App.jsx:183`, drilled into five views).

Without seam 1, every future visual change is another 973-literal sweep. Without seam 2, the
desktop/mobile convergence in S5 has no mechanism.

| # | Component | Replaces | Proposed props |
|---|---|---|---|
| 1 | `Card` | the background/border/radius/padding quadruple — the `'14px 16px'` padding literal alone appears 42× | `{ children, tone, accent, padding, interactive, onClick }` |
| 2 | `SectionLabel` | the `fontSize:9 letterSpacing:3` label, ~45× | `{ children, accent, action }` |
| 3 | `Banner` | `borderLeft:'3px solid'` explainer, **36 occurrences** across 9 files | `{ accent, title, children, dashed }` |
| 4 | **extend `LiveMetric`** | — see below | `+ { sub, trend }` |
| 5 | `StatRow` / `Grid` | `gridTemplateColumns: isWide ? …` and the `isWide` prop-drill | `{ cols, gap, children }` |
| 6 | `SegmentedNav` | the two incompatible strips from §1.1 | `{ items, value, onChange, size }` |
| 7 | `Pill` / `Badge` | StrengthLogger `.pill`; `BenchmarkBadge` is a one-off of the same idea | `{ children, tone, variant, size }` |
| 8 | `Button` | desktop has none — `App.jsx:313-337` hand-rolls it inline | `{ children, onClick, variant, size, full, disabled }` |
| 9 | `AppShell` | absorbs `main.jsx:289` as a **prop** instead of a tree fork | `{ tabs, active, onTabChange, density, title, children }` |
| 10 | `Sheet` | "Why?" drill-downs, full-screen StrengthLogger | `{ open, onClose, title, size, children }` |

**Do not build `StatTile`.** `src/components/LiveMetric.jsx` already covers ~80% — `label / value /
unit / accent / size (large 52 · normal 34 · small 22) / dimmed`, with `null → '--'` — and it is
already published with authored docs. Two extra props beat a parallel component.

### What the existing eleven cover

`LiveMetric` → primitive 4 (extend). `BottomTabBar` → part of primitive 9. `LogEntry`, `WorkoutItem`,
`WorkoutTarget` → domain rows, keep as they are. The four tooltips and `PaceTrendChart` → Recharts
adapters, not layout. `ErrorFallback` → one-off.

**The gap in one sentence: the SplitIQ package documents domain components and contains zero layout
primitives.** Adding `Card`, `SectionLabel`, `Banner`, `Button`, `Pill` and `SegmentedNav` to
`componentSrcMap` — with docs in the existing style — is what turns the package from a component
gallery into a design system, and gives Claude Design something real to design *with*.

Per `NOTES.md`, each new component needs three coordinated edits — `entry.jsx`,
`cfg.componentSrcMap`, and `docs/<Name>.md` with `category:` frontmatter — plus a hand-written
`dtsPropsFor` contract, which has no drift detection.

---

## 6. Tokens

`src/constants/theme.js` is 23 **colour** tokens and nothing else. No spacing, type, radius, shadow,
z-index or breakpoint scale exists.

**Shipping mechanism: a new `src/constants/tokens.js` of plain JS objects, not CSS variables.**
`src/utils/themeCss.js` already emits `:root{--color-*}` and **nothing in the app reads them** — zero
`var(--color` hits outside StrengthLogger's private set. Repeating that for spacing would be worse,
not better.

The load-bearing decision: **`TYPE` entries are spreadable style fragments, not scalars.** Under an
inline-styles-only constraint this is the only shape that keeps application to one line:

```js
style={{ ...TYPE.label, color: THEME.accent, marginBottom: SPACE.sm }}
```

### 6.1 Typography — the boldest recommendation in this brief

**Split the typeface by role. Sans for chrome, mono for figures.**

| Role | Face | Why |
|---|---|---|
| Section labels, buttons, prose, nav, coach chat | **UI sans** | Courier at 9–12px is the homemade tell |
| Metric values, splits, watts, paces, tables, tooltips | **Monospace, tabular figures** | Genuinely correct — digits must not jitter as they tick |

Concretely: one variable sans with real weights for everything that is not a number, and a numeral
face actually *loaded* for everything that is. Self-host both; do not add a Google Fonts request to
an app that ships as an Android APK from `file://`.

> **Superseded on the face, not the argument.** This section proposed Inter or IBM Plex.
> `HANDOFF.md` §1 sets **Archivo, minimum weight 500** — see §8.1. The split argued for here still
> holds; the specific families named above do not.

This directly amends `conventions.md`'s old *"dark-only, data-dense, monospace-numeral"* identity.
Note it keeps **monospace-numeral** — that part is right and worth protecting. What changes is that
monospace stops being the default for everything else, and that dark is no longer the ground.

Expected impact: larger than the entire layout redesign, for a fraction of the work. It is the
difference between a terminal readout and a product. **Ship it first, independently of every other
slice** — it touches `index.html`, a `fontFamily` token, and the 45 existing references.

### 6.2 TYPE scale

```
hero    { size: 52, weight: 700, letterSpacing: -1,    lineHeight: 1   }   // one per screen
display { size: 32, weight: 700, letterSpacing: -0.5,  lineHeight: 1.1 }
title   { size: 20, weight: 700, letterSpacing: -0.25, lineHeight: 1.2 }
body    { size: 14, weight: 400, lineHeight: 1.5 }    // ← barely exists today: 12 uses
bodySm  { size: 12, weight: 400, lineHeight: 1.5 }
label   { size: 11, weight: 600, letterSpacing: 1, lineHeight: 1.3, uppercase }
caption { size: 10, weight: 400, lineHeight: 1.4 }
micro   { size:  9, weight: 600, letterSpacing: 3, lineHeight: 1.3, uppercase }  // SECTION LABELS ONLY
```

**`fontSize: 9` stops being the default and becomes reserved for section labels.** Prose moves
9/10/11 → 12/14. Per §1.4 that reassigns most of 419 declarations — most of "commercial fitness app
ready," and most of the Lighthouse accessibility headroom.

This *preserves* the house detail `conventions.md` describes — tiny tracked uppercase section labels
— while removing 9px from everything that is not a section label.

### 6.3 SPACE — 4px base

```
{ xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 }
```

Observed today: `gap` 6×30, 8×23, 10×17; `marginBottom` 10×59, 4×48, 6×45, 8×43, 12×36. **This scale
retires 6→8 and 10→12**, nudging roughly 200 call sites by ±2px. Flagged plainly: the largest
visual-drift risk in the brief, and the repo has **no visual-regression testing** — one Playwright
smoke spec, and `OverviewView`'s own test file is 89 lines of "renders without crashing" against a
1,361-line view. Take the nudge deliberately, with screenshot baselines first.

### 6.4 RADIUS

```
{ sm: 6, md: 12, lg: 16, pill: 999 }
```

Measured: 192 `borderRadius` declarations across 9 values — `6`×104 dominant, `12`×3.

**Standardise cards on 12**, keeping 6 for chips and inputs. Commercial fitness apps read at 12–16;
12 is already mobile's value and StrengthLogger's `--radius:12px`.

`conventions.md` records the current style as "6–10px radii" — but per its authors the radii were
never designed, so this needs no justification beyond looking better. It does need `conventions.md`
updated in the same change, or the design agent will keep reproducing the old value.

### 6.5 The rest

```
SURFACE = { base: bg, card: raised, sunken: surfaceAlt, field: bg }
SHADOW  = { sheet: '0 -8px 32px #00000080' }   // 8-digit hex, never rgba() — #183 convention
LAYER   = { base: 0, sticky: 10, nav: 100, sheet: 200, toast: 300, modal: 400 }
BREAKPOINT = { compact: 767 }                   // one value; deletes isWide 900, dead isMid 600
```

`LAYER` fixes a live bug class: `BottomTabBar` is 100, StrengthLogger `#restBar` is 110, `#toast` is
80 — **the toast currently renders below the nav.**

### 6.6 Two colour corrections (these belong to #183, not the type pass)

1. ~~**`muted` on cards fails AA** (§1.6)~~ — **dissolved by the light palette.** The finding was
   real against the dark tokens, but those values are being deleted. `HANDOFF.md` §1 sets `muted`
   to `#43485a` against white cards: 9.08:1, comfortably AA. Do not carry the `#9494b4` proposal
   forward — it was a repair to a palette that no longer exists.
2. **The live contrast question is now the inverse one.** Every light role token clears AA on white
   `surface` (`accent` 5.60, `positive` 5.38, `caution` 5.06, `warning` 5.82, `accentAlt` 7.08) and
   **fails on the `bg` ground** (3.42, 3.28, 3.09, 3.55, 4.33). Role colours are card colours; on
   the ground use `text` or `muted`. That rule is now stated in `conventions.md`, and it is the
   constraint §1.6 would have been had it been written against the light system.

### 6.7 One legitimate use of CSS variables

Extend `.design-sync/gen-css.mjs` to emit `--space-*`, `--radius-*`, `--font-size-*` and the font
stacks into `base.css`. That file **is** consumed — by design-sync previews and by Claude Design.
This does not violate the app-side constraint; it means the design agent designs against the same
scale the app builds against. Per `NOTES.md`, re-run `gen-css.mjs` as step one of every sync, and
wire the faces via `cfg.extraFonts` so designs keep matching.

---

## 7. Sequencing

Each slice is one Issue → branch → PR → CI, tests in the same PR.

```
S-1 type  ──────────────────────────────────────────────► (independent, ship first)

S0 tokens ──► S1 primitives ──► S3 nav 13→5 ──► S4 Today ──► S5 converge ──► S7 logger
                                                   ▲             │
S2 data truth ─────────────────────────────────────┘             │
                                                                 ▼
             #183 slices 2c/2d ──► S6.0 baselines ──► S6a…S6e spacing + radius
```

| Slice | What | Value | Risk | Depends |
|---|---|---|---|---|
| **S-1** | **Typography split** (§6.1). Self-host a UI sans + a real mono; `fontFamily` tokens; swap the 45 references | **Highest ratio in the brief** | low | — |
| **S0** | `constants/tokens.js`. Zero call sites changed | Unblocks everything | nil | — |
| **S1** | `components/ui/*` primitives **with the §5.1 seam**; extend `LiveMetric`; register in design-sync | High | low | S0 |
| **S2** | **Data truth.** Wire desktop to `useTSSHistory`/`useVitals`/`useStrengthPRs`; collapse duplicate `DAILY_TSS`; resolve or document `rowing_cp` 205 vs displayed 190 (#176) | **Highest** | medium | — |
| **S3** | Nav 13→5 + `AppShell` + hash routing. Views keep rendering unchanged, at new addresses | Kills complaint #2 | med-low | S1 |
| **S4** | Today rebuild; delete `OverviewView.jsx` (1,361 lines) | Kills complaint #1 | **highest** | S0–S3 |
| **S5** | Mobile adopts shared nav config; `main.jsx:289` → `density` prop | Halves future feature cost | medium | S3, S4 |
| **S6** | Spacing + radius pass, per destination. **S6.0 = screenshot baselines first** | Visible | high *visual* | S0, S4, #183 |
| **S7** | StrengthLogger as full-screen flow | Med-high | medium | S3, S5 |

**S-1 and S2 are the two to do first.** S-1 because it is the cheapest large perceived change and
blocks nothing. S2 because without it S4 builds a prettier frame around fake numbers (§1.3) — it also
drops `App.jsx` toward ~350 lines, direct progress on #114.

### The #183 boundary — the one hard rule

S6 must land **after** #183's slices 2c (desktop views) and 2d (mobile + `App.jsx`), because #183 is
rewriting colour literals in the same lines. The clean split is **by CSS property**:

> **S6 touches `padding` / `margin` / `gap` / `borderRadius` and never a colour hex.
> #183 touches colour hexes and never a size.**

The `muted` contrast fix is therefore #183's, not S6's. S-1 and the TYPE scale touch `fontSize` and
`fontFamily` — neither is contested by #183, so they can proceed in parallel.

### Standing exclusions

- **`ProgramView.jsx` / `ProgramYear.jsx` internals: untouched.** One line of nav config in S3.
  Decomposition rides with #77; already excluded from #183.
- **`StrengthLogger.jsx` internals: untouched.** Rewrite is #79. S7 changes only how it is entered.
- ~~No light mode~~ — **overtaken.** `HANDOFF.md` §1 makes light the only theme and drops dark
  entirely, via the token seam (`THEME` values become `var(--color-*)`, colour-named keys renamed
  to roles). That reframes #183 rather than deferring it: the goal is no longer "migrate hex
  literals to `THEME`" but "no hex literal survives in any component file at all", which is
  #183's acceptance criterion arrived at from the other direction.
- No `rgba()`, no Recharts colour props — still deferred by #183.
- No file over ~800 lines (#114); coverage ratchets up only.
- Any `web/src/**` change triggers the Android build (`ci-android.yml`).

---

## 8. Questions

### 8.1 Resolved

1. **Typeface — Archivo, minimum weight 500.** Set by `HANDOFF.md` §1 alongside the light redesign,
   which is where the weight floor comes from: Archivo below 500 fails on light grounds at the sizes
   this app uses, so any component still setting `fontWeight: 400` has to be raised in the same pass.
   §6.1's argument for splitting a UI sans from a numeral face still stands on its own terms, but the
   face it reached for does not — this supersedes it, and the `'DM Mono'` call sites move to Archivo
   rather than acquiring the face they currently name.
2. **The styling seam — superseded by the token seam, not built.** §5.1 proposed a `style` prop
   merged last on ten layout primitives, on the reasoning that theming is otherwise structurally
   impossible (§1.8). `HANDOFF.md` §1 reaches the same goal by a different route: `THEME`'s values
   become `var(--color-*)` strings and a `data-theme` attribute on the app root redefines them
   beneath it. Component source keeps its shape — `color: THEME.accent` still works, resolving
   through the cascade instead of a prop — so the alias maps (`const C = {…}`) survive untouched and
   no escape hatch is needed for theming. §1.8's diagnosis was right; its prescription is not the one
   being built. **A `style` seam may still be wanted for *layout* composition** — arranging
   primitives in ways their author did not anticipate is a different problem from theming, and the
   token seam does not solve it. That question is open again, and belongs with whoever builds the
   primitives.
3. **`rowing_cp` 205W vs displayed 190** (#176) — resolved, and not either way this brief predicted.
   #203 removed the mirror itself rather than reconciling the two numbers: `CRITICAL_POWER.cpEstimate`
   is gone, the static `PACE_ZONES` table is gone, and `deriveCalibrationStatus()` now resolves from
   the `anchors.rowing_cp` row at render time — or reports the anchor as unavailable instead of
   falling back to a stale constant. No second CP remains to disagree with the first, so **S2
   inherits no work here.** Do not reintroduce a seed CP constant or a static zone table as a
   convenience: `trainingConfig.test.js` fails if either returns.

### 8.2 Still open

4. **Nutrition** — moved to Body. 215 lines suggests it matters; if intake is adjusted daily it
   earns one line on Today, but only once it is live.
5. **Radius 6→12 and ±2px spacing drift across ~200 call sites, with no visual-regression net.** The
   price of a real scale. Mitigation is S6.0 baselines, but that is new CI surface.
6. **Five destinations or six?** Program sits in the Playbook. If it is read and revised weekly it
   may deserve its own destination. Genuine coin-flip; one line in `constants/nav.js` either way.
7. **Hash routing on Android.** Deep links and back are impossible today (`App.jsx:164` is
   `useState`). Capacitor serves from `file://`, so hash routing not history — and `MobileApp.jsx`
   already wires the hardware back button, so the two interact and need testing on a real device.
8. **Coverage ratchet.** Deleting `OverviewView.jsx` *raises* measured coverage. But S2 rewires
   `App.jsx`, which is in the denominator. Decide in advance that a threshold bump is a PR-config
   change, not a reason to stall a slice.
