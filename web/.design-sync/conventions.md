## How SplitIQ is built

SplitIQ is the training dashboard for a single rower — erg, strength and bike.
It is a **dark-only, data-dense, monospace-numeral** surface. Designs that look
like a light-mode SaaS app are wrong for it.

### Setup: no provider, one stylesheet

There is **no ThemeProvider, context, or router** to wrap anything in. Every
component is self-contained and renders correctly on its own. The only setup is
linking `styles.css` — that is what paints the dark ground and defines the
tokens. Without it components still render, but on a white page, which is wrong.

### The styling idiom: inline styles + CSS variables

**This system has no CSS classes.** Every component styles itself with inline
`style` objects read from a `THEME` object. Do not write `className` on a
SplitIQ component and do not invent class names like `.card` or `.btn-primary` —
nothing will resolve them. The components also do **not** accept `className`,
`style`, `sx`, or any styling escape hatch: their appearance is controlled only
by the semantic props in each `<Name>.d.ts` (`accent`, `size`, `dimmed`,
`highlight`, `done`, …).

For your **own** layout glue around them, use the CSS custom properties from
`styles.css`, or import the same values as a JS object:

```js
const { THEME } = window.SplitIQ;   // THEME.cyan === '#00d4ff'
```

Token names are identical in both forms (`--color-<key>` / `THEME.<key>`), and
the keys keep their camelCase:

| Group | Tokens |
|---|---|
| Ground | `bg` `surface` `surfaceAlt` `raised` `field` |
| Lines | `border` `divider` `neutral` |
| Text | `text` `textSubtle` `textFaint` `textDim` `muted` `grey` `white` |
| Accents | `cyan` `green` `gold` `orange` `red` `purple` `pink` `teal` |

Accents carry meaning — do not pick them decoratively. `cyan` is erg/aerobic and
the primary accent, `green` is done/healthy/UT1, `gold` is threshold or a target
prompt, `orange` is elevated load, `red` is error or redline, `purple` is upper
strength, `teal` is cycling, `grey`/`neutral` is rest.

### Text colour: which pairings actually pass

The palette contains greys that fail WCAG AA on the system's own panels. Measured
against the real token values:

| Foreground | on `bg` | on `surface` | on `raised` |
|---|---|---|---|
| `text` | 16.40 | 14.00 | 11.31 |
| `textSubtle` | 8.88 | 7.58 | 6.13 |
| `muted` | 5.08 | **4.34 fails** | **3.50 fails** |
| `textFaint` | **3.94 fails** | **3.36 fails** | **2.72 fails** |
| `textDim` | **3.00 fails** | **2.56 fails** | **2.07 fails** |

**Use `textSubtle` for secondary text on `surface` or `raised` panels** — which is
most secondary text, since those are the standard card backgrounds. `muted` is only
safe directly on `bg`. `textFaint` and `textDim` pass nowhere and should be treated
as decorative-only (hairlines, disabled glyphs), never as readable text.

### Two more exports you will want

- `C` and `ICON` — session-type maps keyed by the same nine strings
  (`'Z2 Aerobic'`, `'Threshold'`, `'VO₂ Intervals'`, `'Sharpener'`, `'Rest'`,
  `'Upper Strength'`, `'Lower Strength'`, `'Combined'`, `'Cycling'`). Use these
  keys as `entry.type` so `LogEntry` colours itself correctly.
- `derivePaceZones(cp)` — builds the real training-zone table `PaceTrendChart`
  draws its bands from. Pass the current critical power in watts; the app reads
  that live from the `rowing_cp` anchor. There is deliberately no static zone
  table to import.

### Where the truth is

Read the real files before styling — they beat this summary:

- `_ds/<folder>/styles.css` and the `_ds_bundle.css` it imports — the tokens and
  the page ground, verbatim.
- `components/<group>/<Name>/<Name>.prompt.md` — what each component is for,
  which props change its appearance, and a worked example.
- `components/<group>/<Name>/<Name>.d.ts` — the exact prop contract.

Groups: `session` (LogEntry, WorkoutItem, WorkoutTarget), `metrics`
(LiveMetric), `charts` (PaceTrendChart), `tooltips` (ErgTooltip, LoadTooltip,
StrengthTooltip, PaceTooltip), `feedback` (ErrorFallback), `mobile`
(BottomTabBar).

### A typical screen

Library components for the data, your own inline styles in the same idiom for
the frame around them:

```jsx
const { LiveMetric, LogEntry, THEME } = window.SplitIQ;

<div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      background: THEME.surface,
      border: `1px solid ${THEME.border}`,
      borderRadius: 10,
      padding: '22px 26px',
    }}
  >
    <LiveMetric label="SPLIT" value="2:04.1" unit="/500M" size="large" />
    <LiveMetric label="WATTS" value={151} unit="W" />
    <LiveMetric label="HR" value={139} unit="BPM" accent={THEME.green} />
  </div>

  <div style={{ fontSize: 9, letterSpacing: 2, color: THEME.textSubtle }}>THIS WEEK</div>
  <LogEntry
    entry={{
      type: 'Z2 Aerobic', _isErg: true, label: 'UT2 60min', date: '6/19',
      duration: '60min', srpe: 5, distance_m: 13850, avg_watts: 138, avg_hr: 132,
    }}
  />
</div>
```

Note the house details: tiny uppercase tracked section labels (`fontSize: 9`,
`letterSpacing: 2`, `color: textSubtle`), 6–10px radii, 1px `border` hairlines on
`surface`/`raised` panels, and numbers in the monospace face.
