---
category: Charts
---

# PaceTrendChart

The erg pace trend — a Recharts `ComposedChart` plotting `pace_500m` over time
with the training zones drawn behind it as translucent reference bands.

The Y axis is **inverted** (faster pace is higher on the chart) and its domain is
computed from the data plus the zone edges, so the bands and the line always
share a frame. Points are drawn by `CustomDot`: a hollow cyan ring normally, a
filled cyan disc when `hardPush` is set on that session. Hovering a point opens
`PaceTooltip`.

`data` is a list of enriched sessions ordered newest-first — the component
reverses it internally and drops any entry without `pace_500m`. `paceZones` comes
from `PACE_ZONES` in the app's training config; pass `showBands={false}` to plot
the bare line. `height` defaults to 180 and the width always fills the parent, so
give it a sized container.

```jsx
<PaceTrendChart
  data={sessions}
  paceZones={PACE_ZONES}
  height={220}
/>
```
