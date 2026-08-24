---
category: Metrics
---

# LiveMetric

The readout primitive for a single number — used across the live erg screen and
the summary tiles. Renders a small uppercase tracked label, the value in the
monospace face, and an optional unit caption.

Three sizes are built in: `large` (52px value, the hero number), `normal` (34px,
the default) and `small` (22px, for supporting stats). `accent` colours the value
and defaults to `THEME.accent` — pass `THEME.positive`, `THEME.caution`, `THEME.warning`
or `THEME.critical` to carry status. `dimmed` drops the whole tile to 35% opacity for
metrics that aren't live yet; a null or undefined `value` prints `--`.

```jsx
<LiveMetric label="SPLIT" value="1:58.4" unit="/500M" size="large" />
<LiveMetric label="WATTS" value={214} unit="W" accent={THEME.caution} />
<LiveMetric label="HR" value={null} unit="BPM" size="small" dimmed />
```
