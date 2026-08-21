---
category: Session
---

# LogEntry

One row in the training log. Collapsed it shows the modality icon, the session
label, date, duration and sRPE; clicking the row expands it to the detail body.

The whole appearance is driven by `entry.type`, which is looked up in the `C`
(colour) and `ICON` maps from the design system — `Z2 Aerobic`, `Threshold`,
`VO₂ Intervals`, `Sharpener`, `Rest`, `Upper Strength`, `Lower Strength`,
`Combined`, `Cycling`. An unknown type falls back to grey with a `•` icon.

Two detail bodies exist and the entry picks one:

- **Erg** (`entry._isErg`) — expands to a metric grid of distance, average watts
  and average heart rate. A planned erg row carries null metrics, so it shows
  the prescription (label + `coachNote`) instead of the grid.
- **Strength** — expands to an exercise table (name, weight, volume, e1RM), with
  a 🏆 badge in the header when `entry.prs` is set.

`entry.status === 'planned'` switches the left accent rail from solid to dashed.
`done` fades the whole row to 50% opacity.

```jsx
<LogEntry
  entry={{
    type: 'Z2 Aerobic',
    _isErg: true,
    label: 'UT2 60min',
    date: '6/19',
    duration: '60min',
    srpe: 6,
    distance_m: 12000,
    avg_watts: 150,
    avg_hr: 140,
    coachNote: 'steady aerobic',
  }}
  done
/>
```
