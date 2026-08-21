---
category: Session
---

# WorkoutTarget

The collapsed prescription banner for today's planned session — a gold `TARGET`
eyebrow, the session label, and a disclosure caret. Expanding it reveals the
prescribed duration, the sRPE target, and the coach note.

With no session it degrades to the muted `NO PLANNED SESSION TODAY` line rather
than rendering nothing, so the slot in the layout stays stable.

```jsx
<WorkoutTarget
  session={{
    label: 'UT1 45min',
    duration: 45,
    srpe: 5,
    notes: 'Hold 150-160W. Rate 20-22. Stop if the hamstring talks.',
  }}
/>
```
