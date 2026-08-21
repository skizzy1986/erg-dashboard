---
category: Tooltips
---

# PaceTooltip

Recharts tooltip for `PaceTrendChart`. Prints the display date, the formatted
500m split as the cyan headline, and a caption line with average watts and the
training zone.

It is already wired as the chart's tooltip content, so you only need it directly
when building a chart of your own over the same enriched-session shape.

```jsx
<Tooltip content={<PaceTooltip />} />
```
