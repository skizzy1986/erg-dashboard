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
  constants/            ACTUAL flat layout. The colors/calibration/program/season/
                        guide/logs split was the original plan; the files were
                        extracted flat instead — THIS is the real convention, name
                        new constant files to match it:
    ui.js             C (session-type colors), ICON
    trainingConfig.js SRPE_GUIDE, SRPE_SCALE, CALIBRATION_STATUS, CRITICAL_POWER,
                      POWER_DURATION, FTP_TEST, HR_ZONES, PACE_ZONES, HR130_POWER,
                      EST_MHR, RHR_BASELINE, HRV_BASELINE
    schedule.js       PHASES, PHASE_CONTEXT, MICROCYCLE, SEASON, SEASON_2,
                      EVENT_LADDER, VOLUME_PROGRESSION
    exercises.js      STRENGTH_TEMPLATES, REP_SCHEMES, LOWER_DIFFERENTIATION,
                      PREHAB_NOTE, STRENGTH_PRINCIPLES
    nutrition.js      MACRO_TARGETS, NUTRITION_TARGETS, MF_PROGRAM, DEFICIT_PROGRAM,
                      FUELLING, NUTRITION_PRINCIPLES
    tssData.js        DAILY_TSS
    (logs.js + coaching.js — recoveryLog, nutritionLog, bpLog, DECISION_LOG,
     HYPOTHESES, RULE_FIRING_HISTORY, ADAPTIVE_RULES, DAILY_ROUTINE, RULE_EVOLUTION,
     ergTrend — are still inside the monolith; PR1 (#68) extracts them flat.)

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

  views/                Extract by TAB ID, one per PR. Find each tab by its
                        section heading / tab constant in erg-dashboard.jsx —
                        do NOT trust absolute line numbers: the monolith is
                        ~8,715 lines and every extraction shifts the offsets.
    CoachView.jsx       ✓ extracted    AI coach tab
    ErgView.jsx         ✓ extracted    erg analytics, HR130, pace/splits
    ErgLiveView.jsx     ✓ extracted    live PM5 Bluetooth
    JournalView.jsx     tab `journal`  — decision log, hypotheses        (PR5, #72)
    RecoveryView.jsx    tab `recovery` — HRV/RHR/sleep, readiness         (PR6, #73)
    OverviewView.jsx    tab `overview` — home dashboard (~1,370 lines)    (PR7, #74)
    StrengthView.jsx    tab `strength` — e1RM trends                      (PR8, #75)
    MobilityView.jsx    tab `mobility` — mobility routines                (PR9, #76)
    CalendarView.jsx    tab `calendar` — 17-day calendar                  (#78)
    PlanView.jsx        tab `plan`     — upcoming planned sessions        (#78)
    LogView.jsx         tab `log`      — session history                  (#78)
    program/            tab `program`  — ~3,071 lines, SPLIT (see below)  (#77)

  views/program/        The Program tab is too large for one ProgramView.jsx.
                        Decision recorded in H0 (#67): split across ~3 PRs into —
    ProgramView.jsx       shell + tab navigation
    ProgramPhases.jsx     PHASES, ANNUAL_ARC
    ProgramMicrocycle.jsx 2-week roster
    ProgramYear.jsx       EVENT_PATHWAY year view

  App.jsx     Global state + nav tabs + ErrorBoundary + view dispatch (~200 lines;
              not reached yet — entry point is still main.jsx + erg-dashboard.jsx)
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
