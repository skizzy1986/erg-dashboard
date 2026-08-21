---
category: Tooltips
---

# LoadTooltip

Recharts tooltip for the training-load chart — the CTL / ATL / TSB stack.

CTL is labelled cyan, ATL orange, and **TSB is colour-coded by value**: green
above +10, gold down to -10, orange down to -30, red below that. TSB is printed
with an explicit `+` when positive. A TSS row is appended below a divider only
when that day actually carried load (`tss > 0`), and an optional `note` is
appended to the date eyebrow.

```jsx
<Tooltip content={<LoadTooltip />} />
```
