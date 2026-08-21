---
category: Tooltips
---

# StrengthTooltip

Recharts tooltip for the strength e1RM chart. Prints the date as the eyebrow and
the estimated one-rep max in kg as the headline.

Unlike the other tooltips it takes its headline colour from `payload[0].stroke`,
so the number matches the colour of the series being hovered — which is what
makes it readable on a multi-lift chart.

```jsx
<Tooltip content={<StrengthTooltip />} />
```
