---
category: Session
---

# WorkoutItem

A single day in the programme calendar. The optional left `rail` carries the day
marker (`top` / `big` / `bottom` — e.g. `MON` / `1` / `wk4`), and the body shows
the session label with its slot and completion tick.

The accent colour is derived from the session label text by `workoutAccent`, so
"Upper 1" reads purple, "Lower 2" green, threshold work gold, intervals orange,
and anything restorative neutral grey. Erg aerobic is the cyan default.

The row is only expandable when the session actually has detail (`note`, `fuel`
or `meal`); without it the cursor stays default and clicking does nothing. Pass
`highlight` to mark today — it tints the row and prints a `● TODAY` marker.
`session={null}` renders the empty-day placeholder.

```jsx
<WorkoutItem
  session={{
    label: 'Upper 1',
    done: true,
    slot: 'AM',
    note: 'Bench + pull focus',
    fuel: 'Oats + whey pre',
    meal: { pre: 'Banana', post: 'Rice + chicken' },
  }}
  rail={{ top: 'MON', big: '1', bottom: 'wk4' }}
  highlight
/>
```
