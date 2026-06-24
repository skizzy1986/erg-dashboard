---
name: training-science
description: >
  Domain knowledge about rowing training, CTL/ATL/TSB, HR zones, periodization,
  and the athlete's current program. Read when working on analytics, readiness
  scoring, load management, session planning, or integration with fitness data
  sources (Garmin, Strava, Concept2).
---

## Athlete Profile

- **Name**: Scott
- **Primary sport**: Indoor rowing (Concept2 erg) + supporting strength + cycling
- **Current phase**: Base — building aerobic foundation before higher intensity
- **MHR**: 170 bpm
- **CP estimate**: ~190W (critical power test pending 1 Jul)
- **Key race target**: 2000m erg (the "2k" — the standard rowing benchmark)

## Training Load Model (Banister / Coggan)

**TSS** (Training Stress Score) — how much stress a session creates. Calculated
from duration, intensity (watts or sRPE), and the athlete's threshold.

**CTL** (Chronic Training Load) — fitness proxy. 42-day exponential moving average
of daily TSS. Goes up slowly with consistent training, falls during extended rest.

**ATL** (Acute Training Load) — fatigue proxy. 7-day exponential moving average.
Rises quickly after hard training, drops quickly during recovery.

**TSB** (Training Stress Balance) = CTL − ATL. The "form" number.
- Positive TSB → athlete is fresh (fitness > fatigue)
- Negative TSB → athlete is tired (fatigue > fitness)
- Typical race-day TSB target: +10 to +25

The EMA formula: `new = prev * (1 - 1/days) + todayTSS * (1/days)`

## Heart Rate Zones (based on MHR = 170)

| Zone | Name | % MHR | BPM Range | Purpose |
|------|------|--------|-----------|---------|
| Z1   | UT2  | <60%   | <102      | Active recovery |
| Z2   | UT1  | 60–75% | 102–128   | Aerobic base (primary zone) |
| Z3   | AT   | 75–85% | 128–145   | Aerobic threshold |
| Z4   | TR   | 85–92% | 145–156   | Lactate threshold |
| Z5   | AN   | >92%   | >156      | Anaerobic / VO₂max |

## Readiness Algorithm (current implementation)

Score starts at 100. Deduct:
- RHR elevated >5 bpm above 7-day baseline: −15
- HRV below 7-day rolling average: −20
- Sleep <7 hours: −10 per hour short (so 6h sleep = −10, 5h = −20)
- TSB < −15 (deep fatigue zone): −20

Verdict thresholds:
- ≥80: READY (green)
- 60–79: CAUTION (amber)
- <60: REST (red)

## Power@HR130 — The Aerobic Barometer

The primary performance metric in the Erg tab. Measures watts produced
at exactly 130 bpm heart rate. Rising trend = improving aerobic fitness.

Implementation: linear regression on 8+ {date, watts, hr} data points,
filtered to rows where hr ≈ 130 ± 5 bpm. Uses mathjs `linearRegression`.
Returns slope (W/day), R² (confidence), and a verdict (rising/plateaued).

## Periodization Model

**Annual structure**: Base → Build → Competition → Transition

**Microcycle**: alternating weeks
- Home week = loading (full training roster)
- FIFO week = deload (reduced volume, maintain intensity)
The roster alternates starting from a fixed anchor date.

**Training intensity distribution (Seiler polarized model)**:
- ~80% Z2 aerobic (UT1) — the majority of all sessions
- ~20% hard (AT/TR/AN) — threshold intervals, VO₂max, race-pace work

**Strength philosophy**: Supports rowing, not primary. Lower body (squat, deadlift,
Romanian deadlift, leg press) and upper pull (rows, pullups) are priority.
Upper push (bench, overhead) is secondary.

## Key Erg Metrics

| Metric | Description |
|--------|-------------|
| Split | Pace per 500m — lower is faster (e.g., 1:58/500m) |
| Watts | Power output — higher is better |
| spm | Strokes per minute — rate |
| DF | Drag factor — erg resistance setting (usually 115–130) |
| 2k time | 2000m time trial — the primary benchmark |

## Concept2 Ergometer Notes

- Sessions logged in Concept2 Logbook (future: auto-import via API)
- Current manual entry via Logger tab
- DF (drag factor) should be standardised session to session for valid comparisons
