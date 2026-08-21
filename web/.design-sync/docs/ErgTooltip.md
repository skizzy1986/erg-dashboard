---
category: Tooltips
---

# ErgTooltip

Recharts tooltip for the erg watts chart. Pass it as the `content` of a Recharts
`<Tooltip>` — Recharts supplies `active` and `payload`, and the component returns
`null` whenever the tooltip is inactive or the payload is empty.

It reads `payload[0].payload` and prints the date and distance as the eyebrow,
the average watts in cyan as the headline, and the 500m pace beneath, tagged
either `hard push` or `Z2`.

```jsx
<Tooltip content={<ErgTooltip />} />
```
