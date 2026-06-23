---
name: architecture
description: >
  Target folder structure, layer rules, and migration line-number map for the
  erg-dashboard refactor. Read when asked where to put code, how to structure
  a new feature, or how to safely extract a module from erg-dashboard.jsx.
---

## Target Structure

```
src/
  constants/
    colors.js         C (session type colors), ICON, LIFT_COLOR, HR_ZONES
    calibration.js    CALIBRATION_STATUS, CRITICAL_POWER, POWER_DURATION, FTP_TEST
    program.js        PHASES, STRENGTH_TEMPLATES, BUILD1_SESSIONS, REP_SCHEMES,
                      LOWER_DIFFERENTIATION, VOLUME_EXTRAS
    season.js         SEASON, SEASON_2, EVENT_LADDER, EVENT_PATHWAY, ANNUAL_ARC,
                      ATHLETE_BACKGROUND, MICROCYCLE
    guide.js          SRPE_GUIDE, NUTRITION_PRINCIPLES, STRENGTH_PRINCIPLES,
                      PREHAB_NOTE, TECHNIQUE_WORK, MOVEMENT_SCREEN,
                      MOBILITY_WARMUP, NIGGLES, TECHNOGYM_CONVERSION,
                      DAILY_ROUTINE, ADAPTIVE_RULES, RULE_EVOLUTION
    logs.js           recoveryLog, nutritionLog, bpLog, mobilityLog, bloodsLog,
                      DECISION_LOG, HYPOTHESES, RULE_FIRING_HISTORY,
                      CONFIDENCE_MIGRATION, ergTrend, DAILY_TSS

  hooks/
    useSessions.js    Supabase fetch + merge with seed; returns { sessions, dbStatus }
    useTrainingLoad.js calcTrainingLoad → { loadData, latestCTL, latestATL, latestTSB }
    useReadiness.js   calcReadiness per day → { readiness, verdict }
    useRosterMode.js  getRosterMode, resolveDay, dayStatus

  utils/
    analysis.js       analyzeBarometer, evaluateRules, checkConsistency,
                      deriveTargets, autoregulate
    formatting.js     fmtPace, normType, workoutAccent, assessMacro,
                      macroColor, bpCategory
    schedule.js       getToday, getUpcomingSessions, logEntriesForDate,
                      daySessions, getRosterMode, resolveDay

  components/
    ErrorBoundary.jsx Error isolation wrapper (class component)
    LogEntry.jsx      Collapsible session log entry
    WorkoutItem.jsx   Single-session box for calendar/schedule views
    LogSessionForm.jsx Modal form for logging a strength session (Supabase insert)
    charts/
      LoadChart.jsx   TSB/CTL/ATL LineChart + LoadTooltip
      ErgChart.jsx    HR130 barometer + ErgTooltip
      StrengthChart.jsx e1RM trend + StrengthTooltip

  views/
    OverviewView.jsx    Tab: home dashboard (lines 2864–3223)
    CalendarView.jsx    Tab: 17-day calendar (lines 2108–2175)
    ProgramView.jsx     Tab: periodization, templates, rules (lines 2176–2863)
    PlanView.jsx        Tab: upcoming planned sessions (lines 2072–2107)
    ErgView.jsx         Tab: erg analytics, HR130 (lines 3224–3413)
    StrengthView.jsx    Tab: e1RM trends (lines 3414–3505)
    MobilityView.jsx    Tab: mobility routines (lines 3506–3579)
    RecoveryView.jsx    Tab: HRV/RHR/sleep, readiness (lines 3580–3755)
    LogView.jsx         Tab: session history (lines 3756–3793)
    JournalView.jsx     Tab: decision log, hypotheses (lines 3794–3871)

  App.jsx     Global state + nav tabs + ErrorBoundary + view dispatch (~200 lines)
  main.jsx    Auth gate (unchanged)
  supabaseClient.js  Supabase init (unchanged)
```

## Layer Rules

| Layer | Rule |
|---|---|
| constants/ | Plain JS only. No imports. No React. No functions — data only. |
| utils/ | Pure functions. No React hooks. No side effects. Fully unit-testable. |
| hooks/ | React hooks only. Supabase calls via React Query (useQuery/useMutation). |
| components/ | Reusable JSX. Receives props. No direct Supabase calls. |
| views/ | Tab-level JSX. Receives props from App.jsx. Orchestrates components. |
| App.jsx | useState, navigation, ErrorBoundary wrapper. No business logic. |

## Refactor sequence (follow this order strictly)

1. constants/ (extract all hardcoded arrays and objects first)
2. utils/ (pure functions — write tests immediately after extraction)
3. hooks/ (React hooks — mock Supabase in tests)
4. components/ (import back into monolith and confirm render)
5. views/ (extract one at a time — confirm prop threading each time)
