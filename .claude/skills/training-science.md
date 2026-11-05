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

Every personal value lives in the Supabase `anchors` table, not in git. Read it
live and quote each value with its status (`provisional` | `unvalidated` |
`confirmed`):

| Anchor key | What it holds |
|---|---|
| `rowing_cp` | Rowing critical power (W) — every rowing zone derives from it |
| `bike_ftp` | Bike functional threshold power (W) |
| `hr_max_working` | Working max heart rate (bpm) — every HR zone derives from it |
| `drag_factor` | Standard erg drag factor |
| `current_phase` / `current_block` | Where the athlete is in the plan |
| `training_model` | The current intensity model, in words |
| `season_goal` | The target the season is built around |
| `athlete_profile` | Short non-numeric background |
| `niggle:<slug>` | One row per active injury; `note` carries the guardrail |

No row → say the value is unavailable. Never fall back to a remembered number.

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

## Heart Rate Zones (fractions of `hr_max_working`)

The bands are percentages of the live `hr_max_working` anchor. The app computes
the bpm at render time with `deriveHrBands(mhr)` from the `pctLow`/`pctHigh`
fractions on `HR_ZONES` (`web/src/constants/trainingConfig.js`); with no anchor it
shows "—" rather than guessing.

| Zone | Name | % of `hr_max_working` | Purpose |
|------|------|-----------------------|---------|
| UT2  | Aerobic base | < 70 % | Long, conversational aerobic work |
| UT1  | Aerobic development | 70–80 % | Upper aerobic, sustainable 45–60 min |
| AT   | Threshold | 80–87 % | Lactate threshold |
| TR   | VO₂ / transport | 87–92 % | VO₂max intervals |
| AN   | Anaerobic | > 92 % | Race pace |

Worked example only (MHR 180, not the athlete's): UT1 = 126–144 bpm.

## Rowing Power Zones (fractions of `rowing_cp`)

`derivePaceZones(cp)` returns the watt bands: UT2 55–70 %, UT1 70–80 %, AT
80–90 % of CP. Worked example — CP ~200 W (example only): UT2 110–140 / UT1 140–160 / AT 160–180 W.
`npm run check:zones` recomputes this line against the code and requires it to exist.

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
filtered to rows where hr ≈ 130 ± 5 bpm. The least-squares fit is
hand-rolled in `views/ErgView.jsx` (`analyzeBarometer`); `mean`/`sampleStdDev`
come from `utils/stats.js`. mathjs was removed in #54 — it cost ~52 KB gzipped
for two summary statistics, and never had a `linearRegression` function.
Returns slope (W/day), R² (confidence), and a verdict (rising/plateaued).

## Periodization Model

**Annual structure**: Base → Build → Competition → Transition

**Microcycle**: alternating weeks
- Loading week (full training volume)
- Deload week (reduced volume, maintain intensity)
The alternation starts from a fixed anchor date.

**Training intensity distribution**: set by the live `anchors.training_model` row
(its `valid_from` dates the change); the reasoning sits in `coach_log` decisions.
Do not restate the model here — code and prose cite the anchor.

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
