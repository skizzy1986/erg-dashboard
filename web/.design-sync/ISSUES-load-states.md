# Load states — issues to open

Two states the training-load surfaces can be in that no screen currently draws.
Both were introduced by the switch from the static `DAILY_TSS` seed to the live
`useTSSHistory` hook (PR branch `fix/s2c-strength-prs-cp`). Paste each block
into a new issue.

---

## Issue 1 — Progress: draw the pending state for training load

**Labels:** `design`, `frontend`

### Problem

`App.jsx` distinguishes a slow first read (`loadPending`) from genuinely absent
data, and issue #196 established that pending must **not** flash an outage line
and then replace it with real numbers. The Progress screen has no pending
treatment — it assumes CTL/ATL/TSB and the session bars always arrive.

### What's needed

A pending state for the Load pane covering:

- the three-up stat row (fitness / fatigue / form)
- the session-bar chart and its fatigue ribbon
- the derived caption (which states a comparison and cannot be written until the
  data lands)

### Constraints

- No outage copy, no error styling, no zeroes standing in for real values.
- The layout must not reflow when the numbers arrive — reserve the space.
- Fatigue/fitness/form keep their accent colours; the placeholder is the
  numerals, not the labels.
- Silence beats a spinner per element — one quiet indication for the card.

### Acceptance

- [ ] With `loadPending: true` the pane renders its full layout, no numbers, no
      outage language
- [ ] Nothing shifts position when data arrives
- [ ] Derived captions are absent while pending rather than partially written
- [ ] Covered by a test asserting pending ≠ unavailable (mirrors
      `OverviewView.test.jsx:154`)

---

## Issue 2 — Progress: draw the unavailable state for training load

**Labels:** `design`, `frontend`

### Problem

`loadUnavailable` (`latest == null && !loadPending`) means the load series
genuinely has nothing in it. `OverviewView.jsx:959` handles this; Progress does
not, so the pane would render an empty chart frame with no explanation.

### What's needed

An unavailable treatment for the Load pane that says what is missing and what
would fix it. The likely cause is no logged sessions in the window, which is
actionable — a first-run or long-layoff state, not a system failure.

### Constraints

- Explain the cause in plain language, no error tone for what is usually an
  empty log.
- Point at the action (log a session) rather than describing the outage.
- The Erg, Strength and History sub-tabs read from different sources and must
  stay usable when Load is unavailable.
- One card-level message, not a message per metric.

### Acceptance

- [ ] With `latest == null` and `loadPending: false` the pane explains the gap
      and offers the next action
- [ ] No empty chart frame, no dashes standing in for numbers
- [ ] The other three sub-tabs are unaffected
- [ ] Covered by a test with `latest={null} loadUnavailable={true}`

---

## Note for whoever picks these up

`strengthTrend` is still hardcoded in `App.jsx` on `fix/s2c-strength-prs-cp`, so
the Strength sub-tab's "stale source" caveat stays accurate until `useStrengthPRs`
is wired on desktop. That's a separate slice (S2).
