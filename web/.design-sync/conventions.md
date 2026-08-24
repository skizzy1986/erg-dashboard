## How SplitIQ is built

SplitIQ is the training dashboard for a single rower — erg, strength and bike.
It is a **light, data-dense, monospace-numeral** surface with pastel accents.
Designs that look like a generic light-mode SaaS app are still wrong for it: the
density and the numeric discipline are the identity, not the ground colour.

> **Revised 2026-08-22.** This document previously described SplitIQ as
> dark-only. That has been overturned in review. The dark theme is retained as a
> second theme — the erg room is dark at 5am and the live screen wants it — but
> **light is primary**, and new work should be designed on the light ground.

### Setup: no provider, one stylesheet

There is **no ThemeProvider, context, or router** to wrap anything in. Every
component is self-contained and renders correctly on its own. The only setup is
linking `styles.css`.

⚠️ **The bundled `styles.css` still paints the dark ground**, via
`html, body { background: var(--color-bg) !important }`. Until the token pass
lands, a light page must override the token itself — specificity cannot beat
`!important`:

```css
:root { --color-bg: #c3cade; }
```

### The styling idiom: inline styles + CSS variables

**This system has no CSS classes.** Every component styles itself with inline
`style` objects read from a `THEME` object. Do not write `className` on a
SplitIQ component and do not invent class names like `.card` or `.btn-primary`.
The eleven existing components also do **not** accept `className`, `style`,
`sx`, or any styling escape hatch: their appearance is controlled only by the
semantic props in each `<Name>.d.ts` (`accent`, `size`, `dimmed`, `highlight`,
`done`, …). New *layout* primitives are the deliberate exception — see the
brief's §5.1.

For your **own** layout glue around them, use the CSS custom properties from
`styles.css`, or import the same values as a JS object:

```js
const { THEME } = window.SplitIQ;
```

### Accents carry meaning — and are now a pair, not a value

The accent→meaning mapping is domain logic and is unchanged: `cyan` is
erg/aerobic and the primary accent, `green` is done/healthy/UT1 and lower
strength, `purple` is upper strength, `gold` is threshold or a target prompt,
`orange` is elevated load, `red` is error or redline, `teal` is cycling,
`grey`/`neutral` is rest. Never pick one decoratively, and never colour a
section heading by topic.

On a light ground each accent resolves to **two** values. A pastel cannot carry
text at a readable contrast, so the wash is for surfaces and the ink is for
type:

| Meaning | Wash (surfaces) | Ink (type, borders, dots) |
|---|---|---|
| cyan · erg / aerobic | `#eef6fb` | `#0a7093` |
| green · done / UT1 / lower | `#eef8f3` | `#10795a` |
| gold · threshold / target | `#fdf6e0` | `#8a6a10` |
| orange · elevated load | `#fce9de` | `#a34c1c` |
| red · redline | `#fbdde3` | `#a32040` |
| purple · upper strength | `#f0eafd` | `#5f45b0` |
| teal · cycling | `#e3f4f1` | `#10786c` |

### Ground, cards and text

```
app ground   #bcc5dd   blue-grey — never white
card         #ffffff   1px #c8cee0 hairline + 0 1px 2px #1c1e2a1a
inset        #eef4fb   one step back toward the ground, inside a card
text         #1c1e2a
body         #4a4f63
label on card    #43485a
label on ground  #43485a   (verified 4.5:1+ against #bcc5dd)
```

**Pick a text neutral against the ground it actually sits on, then stop moving
the ground.** A label inside a card and a label on the app ground are two
different measurements. Four separate AA failures were shipped during this
revision, every one of them a colour chosen against a background that was
darkened afterwards.

### Measured contrast — the light palette

Computed from the real hex pairs above. AA body text needs 4.5:1.

| Ink | on card `#ffffff` | on inset `#eef4fb` | on ground `#bcc5dd` |
|---|---|---|---|
| text `#1c1e2a` | 16.55 | 14.95 | 9.59 |
| body `#4a4f63` | 8.10 | 7.32 | 4.69 |
| label `#43485a` | 9.07 | 8.20 | 5.26 |

Accent inks, each against its own wash and against the card:

| Accent ink | on its wash | on card | on ground `#bcc5dd` |
|---|---|---|---|
| accent `#0a7093` | 5.12 | 5.59 | **3.24 fails** |
| positive `#10795a` | 4.95 | 5.37 | **3.11 fails** |
| caution `#8a6a10` | 4.68 | 5.06 | **2.93 fails** |
| warning `#a34c1c` | 4.94 | 5.82 | **3.37 fails** |
| critical `#a32040` | 5.83 | 7.39 | **4.28 fails** |
| accentAlt `#5f45b0` | 6.03 | 7.08 | **4.10 fails** |
| accentAlt2 `#a3407a` | 5.00 | 5.87 | **3.40 fails** |
| cycling `#10786c` | 4.70 | 5.35 | **3.10 fails** |

**No accent ink passes AA directly on the app ground.** Coloured type belongs on
a card or on its own wash — the ground takes only the three neutrals above. This
is the single most likely way to reintroduce the contrast failures this revision
already paid for once.

Token file: `splitiq-light-tokens.css`.

### Type

**Archivo for language, IBM Plex Mono with tabular figures for measurement.**
Anything that is a split, watt, pace, TSS, weight or tabular date is mono;
anything that is a label, button, sentence or nav item is sans. A number inside
a sentence stays in the sentence's face.

Four ranks on any one screen: `52` hero · `20` title · `14` body · `9` section
label. `fontSize: 9` is reserved for section labels and is not the default for
anything else.

**Weight floor 500.** On a light ground Archivo at 400 reads thin and strains.
Body 500, secondary 600, labels and all figures 700. Nothing is set lighter
than 500 — this replaces the contrast the dark ground used to supply for free.

Section labels keep the house detail: tiny, uppercase, tracked
(`fontSize: 9`, `letterSpacing: 2–3`), now at weight 700 and in the neutral
above rather than a topic colour.

### Radii and spacing

Cards `12px`. Chips, inputs and inset rows `6–8px`. Pills `999px`.
Spacing on a 4px base: `2 · 4 · 8 · 12 · 16 · 24 · 32`.

### Charts must carry their own scale

A trend line with no axis is decoration. Every chart on a SplitIQ surface owes
the reader four things:

1. **A labelled axis** in real units, with the bounds derived from the data so
   nothing clips.
2. **Two groundings** — against the athlete's own recent history ("heaviest week
   logged"), and against a personal reference band with discriminating power
   (±1 SD around the window mean, or a trailing percentile — never the min/max
   envelope of the same window being plotted, which contains every point by
   construction).
3. **A score headline with a plain-language label under it** — `463` /
   "heaviest week logged", `−8.9` / "Neutral".
4. **A caption that names what is measured and what is modelled.** Bars are
   sessions that happened; the fatigue ribbon is a model.

Prefer discrete bars over interpolated lines where the underlying events are
discrete: one bar per session makes rest days visible as gaps instead of
smoothing over them. This is the treatment used by the Load pane — copy it.

Any sentence in a caption that states a count, a rank or a comparison is
computed in `renderVals()`, never typed as literal copy. Hand-typed claims drift
from the data the moment the data moves.

### One reading, one derivation — share the module

Matching a number by tuning until the digits agree is not deriving it the same
way. Two screens once both showed form −8.9 while one had CTL 51.1 and the other
CTL 16.4: the difference had been matched, the components had not, and every
computed caption downstream ("10.9 short of CTL 62") only held under its own CTL.

Put the model in one plain `.js` file — the series, the seed, the EMA constants,
the readiness deductions, the TSB band function — load it from each DC's
`<helmet>` as a classic script that assigns a global, and read it in
`renderVals()`. `splitiq-load.js` is that file; the desktop overview and Coach
both read it.

Guard the load order: `if (!window.SIQ) return {}` in `renderVals()`, plus a
short interval in `componentDidMount` that `forceUpdate`s once the global
appears. Without it a slow script leaves the screen on placeholders.

The band function is part of the model, not the screen. The app's own
`tsbColor` thresholds are +10 / −10 / −30, so −8.9 is **Neutral** and green
everywhere. Two screens colouring one number differently is the same defect as
two screens computing it differently.

### A coverage claim needs a series with the gaps in it

"personal · 17/28 days" is a claim about the data, so it must be counted from
the data — `arr.filter(v => v != null).length`, never a literal. The trap is
one step earlier: a mock series with all 28 values cannot support a 17/28 label,
and a tile claiming eleven missing days beside a chart drawing twenty-eight
solid bars is a contradiction on one screen. Put the nulls in the series, then
count them; the chart's gaps and the tile's fraction then agree by construction.

The same applies to staleness: derive "no reading in N days" from the last
non-null index, and derive the deduction's points from that N.

### Session type is a design-system key, not a coarse discipline

Mock data that carries only `erg` / `str` / `bike` cannot colour a chart or fill
a TYPE column correctly. Those three collapse six real types into one accent —
a threshold piece comes out cyan, a `Lower A` comes out purple — which is
exactly the decorative accent use the table above forbids, and a table stating
"Z2 Aerobic" beside `VO2 8x500m` is stating something false.

Carry the design system's own nine session-type strings per row
(`'Z2 Aerobic'`, `'Threshold'`, `'VO₂ Intervals'`, `'Sharpener'`, `'Rest'`,
`'Upper Strength'`, `'Lower Strength'`, `'Combined'`, `'Cycling'`) and key the
ink map off those. `LogEntry` already expects them as `entry.type`. Keep the
coarse discipline as a separate field if a layout needs it — one drives
equipment, the other drives colour and label.

Build chart legends from the types actually present in the window, not a fixed
list, so the legend can never name a type the chart doesn't contain.

### Per-item styles in `sc-for` need one trailing hole

Inside an `sc-for`, a hole used as a *value* inside a declaration
(`height:{{ b.h }};background:{{ b.color }}`) does not resolve per item — the
declaration is dropped and colours collapse to a single value. Precompute one
whole-declaration string per item and place the hole at the **end** of the style
attribute:

```html
<div style="flex:1;border-radius:2px 2px 0 0;{{ b.style }}"></div>
```
```js
bars = tail.map(p => ({ style: 'height:' + pct + '%;background:' + colour }));
```

### Redefine the token, don't fight the rule

`_ds_bundle.css` sets `:root{--color-bg:#08080d}` and `html, body{background:var(--color-bg)}`.
A helmet rule like `html body{background:#c3cade}` loses to it, and the page
renders dark-on-dark outside whatever mock is on it. Set the token instead:

```css
:root{--s:Archivo,…;--m:'IBM Plex Mono',…;--color-bg:#c3cade}
```

Every new light screen needs this line. It is the first thing to check when a
page renders on a black ground.

### Percentage padding is not a vertical position

`padding-top: 64%` resolves against the containing block's **width**, not its
height — on a 300px-wide, 82px-tall track, `64%` is 192px, and every point in a
scatter lands in the same wrong place. `align-items` on a flex *item* does
nothing either; it only applies to containers.

Position points with definite pixels inside a `position:relative` track:

```js
const yPx = v => (hi - v) / (hi - lo) * TRACK;   // TRACK = 82
dotStyle = 'position:absolute;top:' + (yPx(v) - d / 2) + 'px';
```

Derive reference bands and axis labels from the same `yPx` and the same
`hi`/`lo` as the points. Hand-set band percentages drift the moment the scale
changes, and a band that disagrees with its own dots is worse than no band.

### A NaN in a style string vanishes silently

`'height:' + NaN.toFixed(1) + '%'` produces `height:NaN%`, which the browser
drops as an invalid declaration while the rest of the same style attribute still
parses. The element renders at zero height with its background intact — a bar
chart degrades into a legend with no marks and no error anywhere.

This bit the Load pane for days: `calcTrainingLoad` returns `ctl`/`atl`/`tsb`
but the bars read `p.tss`, which the rows never carried.

Guard any computed dimension before it reaches the style string:

```js
const v = Number(p.tss);
if (!Number.isFinite(v)) return { style: 'height:0;background:transparent' };
```

And make derived series carry their inputs, not just their outputs — push
`{ date, tss, ctl, atl, tsb }` so a chart can draw what went in as well as what
came out.

### Where the truth is

- `_ds/<folder>/styles.css` and the `_ds_bundle.css` it imports.
- `components/<group>/<Name>/<Name>.prompt.md` — what each component is for.
- `components/<group>/<Name>/<Name>.d.ts` — the exact prop contract.

Groups: `session` (LogEntry, WorkoutItem, WorkoutTarget), `metrics`
(LiveMetric), `charts` (PaceTrendChart), `tooltips` (ErgTooltip, LoadTooltip,
StrengthTooltip, PaceTooltip), `feedback` (ErrorFallback), `mobile`
(BottomTabBar).

### A typical screen

Library components for the data, your own inline styles in the same idiom for
the frame around them:

```jsx
const { LiveMetric, LogEntry } = window.SplitIQ;

<div style={{ padding: 16, background: '#bcc5dd', display: 'flex', flexDirection: 'column', gap: 12 }}>
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      background: '#ffffff',
      border: '1px solid #c8cee0',
      borderRadius: 12,
      boxShadow: '0 1px 2px #1c1e2a1a',
      padding: '22px 26px',
    }}
  >
    <LiveMetric label="SPLIT" value="2:04.1" unit="/500M" size="large" />
    <LiveMetric label="WATTS" value={151} unit="W" />
    <LiveMetric label="HR" value={139} unit="BPM" accent="#10795a" />
  </div>

  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: '#43485a' }}>THIS WEEK</div>
  <LogEntry
    entry={{
      type: 'Z2 Aerobic', _isErg: true, label: 'UT2 60min', date: '6/19',
      duration: '60min', srpe: 5, distance_m: 13850, avg_watts: 138, avg_hr: 132,
    }}
  />
</div>
```

⚠️ The eleven published components still render their own dark internals and
have no seam to receive a theme. Until the brief's §5.1 token work lands, a
light screen composed from them will be visually mixed. Treat that as the
blocking dependency it is, not a polish item.
