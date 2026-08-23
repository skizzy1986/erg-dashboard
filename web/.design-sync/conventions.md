## How SplitIQ is built

SplitIQ is the training dashboard for a single rower — erg, strength and bike.
It is a **light, data-dense** surface: pastel grounds, white cards, darker inks.
Dark mode was dropped — light is the only theme, and designs that assume a dark
ground are wrong for it.

### Setup: no provider, one stylesheet

There is **no ThemeProvider, context, or router** to wrap anything in. Every
component is self-contained and renders correctly on its own. The only setup is
linking `styles.css` — that is what paints the ground and defines the tokens.
Without it components still render, but unstyled.

### The styling idiom: inline styles + CSS variables

**This system has no CSS classes.** Every component styles itself with inline
`style` objects read from a `THEME` object. Do not write `className` on a
SplitIQ component and do not invent class names like `.card` or `.btn-primary` —
nothing will resolve them. The components also do **not** accept `className`,
`style`, `sx`, or any styling escape hatch: their appearance is controlled only
by the semantic props in each `<Name>.d.ts` (`accent`, `size`, `dimmed`,
`highlight`, `done`, …).

`THEME` values are `var(--color-*)` strings, not hex literals, so they resolve
through the cascade. For your **own** layout glue, use either form — the names
are identical (`--color-<key>` / `THEME.<key>`), and keys keep their camelCase:

```js
const { THEME } = window.SplitIQ;   // THEME.accent === 'var(--color-accent)'
```

| Group | Tokens |
|---|---|
| Ground | `bg` `surface` `surfaceAlt` `raised` `field` |
| Lines | `border` `divider` `neutral` |
| Text | `text` `textSubtle` `textFaint` `textDim` `muted` |
| Roles | `accent` `positive` `caution` `warning` `critical` `accentAlt` `accentAlt2` |

Role tokens carry meaning — do not pick them decoratively. `accent` is
erg/aerobic/watts and the primary action colour, `positive` is in-band, logged
and strength, `caution` is rest timers, ramp flags and warmup sets, `warning` is
end-session and over-band, `critical` is deep fatigue only, `accentAlt` is
strength secondary and mobility, `accentAlt2` is prehab. `neutral` is rest.

**The keys are roles, not colours, and that is load-bearing.** A token named for
its hue does not survive a theme change — `accent` is `#0a7093`, which is not
cyan. Never reintroduce a colour-named key.

### Colour rules that are easy to get wrong

**Role colours are card colours, not ground colours.** Every role token clears
AA on white `surface` (`accent` 5.60, `positive` 5.38, `caution` 5.06, `warning`
5.82, `accentAlt` 7.08) but **fails on the `bg` ground** (3.42, 3.28, 3.09,
3.55, 4.33). Put coloured text on a card. On the ground, use `text` (10.11) or
`muted` (5.54).

**Contrast is fixed against the ground the token lands on.** `muted` at
`#43485a` is chosen against white cards (9.08). It is not a value to nudge for a
different surface — if a new ground appears it needs its own token, not a
shifted one.

**Minimum font weight 500.** Archivo below 500 fails on light grounds at the
sizes used here. There is no 400-weight text in this system.

### Layering

`z-index`: sheet 200, backdrop 150, nav 100. Nothing else competes.

### Layout

Give tracks **definite heights**. Percentage heights on `flex` children do not
resolve the way they appear to and are the most common source of a layout that
looks right in one viewport and collapses in the next.

### Charts must carry their own scale

The rules most likely to be violated by future work, because a decorative line
chart looks finished:

- A **labelled axis in real units**. Not a bare sparkline.
- **Two groundings**: the metric's own recent history, plus a personal reference
  band with discriminating power. **Never** the min/max envelope of the window
  being plotted — that band always contains the data and therefore says nothing.
- A **score headline** with a plain-language label.
- A **caption naming what is measured versus modelled**. Bars that are sessions
  that happened and a ribbon that is estimated are not the same kind of thing
  and must not read as one.

**Any caption stating a count, rank or comparison is computed, never typed.** A
hardcoded "3rd best this month" is wrong the day after it is written.

### Two more exports you will want

- `C` and `ICON` — session-type maps keyed by the same nine strings
  (`'Z2 Aerobic'`, `'Threshold'`, `'VO₂ Intervals'`, `'Sharpener'`, `'Rest'`,
  `'Upper Strength'`, `'Lower Strength'`, `'Combined'`, `'Cycling'`). Use these
  keys as `entry.type` so `LogEntry` colours itself correctly.
- `derivePaceZones(cp)` — builds the real training-zone table `PaceTrendChart`
  draws bands from. The app calls it with the live CP anchor (205W today);
  there is no static zone table to import.

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
    <LiveMetric label="HR" value={139} unit="BPM" accent={THEME.positive} />
  </div>

  <div style={{ fontSize: 9, letterSpacing: 2, fontWeight: 500, color: THEME.muted }}>
    THIS WEEK
  </div>
  <LogEntry
    entry={{
      type: 'Z2 Aerobic', _isErg: true, label: 'UT2 60min', date: '6/19',
      duration: '60min', srpe: 5, distance_m: 13850, avg_watts: 138, avg_hr: 132,
    }}
  />
</div>
```

Note the house details: tiny uppercase tracked section labels (`fontSize: 9`,
`letterSpacing: 2`, `color: muted`), 6–10px radii, 1px `border` hairlines on
`surface` panels, and numbers in the numeral face.
