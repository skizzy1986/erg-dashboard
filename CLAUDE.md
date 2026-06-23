# ERG DASHBOARD — Project Intelligence

> Claude reads this file at the start of every session. It provides context
> so Claude can work effectively without needing background explanations.
> Think of it as a briefing document for a new team member.

## What This App Is

A personal coaching dashboard for rowing (erg), strength, and cycling training.
Built by Scott, designed with Claude, deployed on Vercel + Supabase.

**Vision**: Replace commercial apps (Strava, Garmin Connect, Concept2 Logbook,
TrainingPeaks, Ergzone) with a unified, fully personalised training system.

## Tech Stack

| Layer      | Technology                     | Purpose                              |
|------------|--------------------------------|--------------------------------------|
| UI         | React 18 + Vite                | Frontend single-page app             |
| Charts     | Recharts                       | Data visualisation                   |
| Math       | mathjs                         | Linear regression for aerobic trend  |
| Backend    | Supabase                       | Postgres DB, Auth, Edge Functions    |
| Hosting    | Vercel                         | Auto-deploy on git push              |
| Testing    | Vitest + React Testing Library | Unit and component tests             |

## Key Commands

```bash
npm run dev      # Start dev server → http://localhost:5173
npm run build    # Production build → dist/
npm run preview  # Preview production build locally
npm test         # Run Vitest test suite
npm run lint     # ESLint check
npm run format   # Prettier format
```

## Project Structure

```
src/
  constants/    Hardcoded config, seed data, reference tables
  hooks/        Custom React hooks (data fetching, derived state)
  utils/        Pure functions — analysis, formatting, scheduling
  components/   Shared UI components (LogEntry, WorkoutItem, charts)
  views/        One component per dashboard tab (10 views)
  App.jsx       Navigation, state, view dispatch (~200 lines)
  main.jsx      Auth gate (Supabase email/password login)
supabase/
  functions/    Edge Functions (vitals-import from Google Health CSV)
coach/
  work-orders/  Feature specs and task tracking
.claude/
  agents/       Specialist AI subagents (see Development Workflow below)
  skills/       Domain knowledge documents Claude reads when relevant
  commands/     Slash commands for common workflows (/feature, /research, etc.)
  settings.json Hooks configuration (automation triggers)
```

## Code Style

- Plain JavaScript and JSX — no TypeScript yet
- No comments unless the WHY is non-obvious
- Inline styles throughout (existing pattern — do not switch to CSS modules)
- No new abstractions beyond what the task requires
- Component files: PascalCase (e.g., LogEntry.jsx)
- Utility/hook files: camelCase (e.g., formatting.js, useSessions.js)
- Tests: co-located in `__tests__/` subdirectories or `*.test.js`

## Architecture: Strangler Fig Refactor

The main file (`src/erg-dashboard.jsx`, ~3,900 lines) is being decomposed
into a modular structure. The safe migration order:

1. Extract constants and utils (zero risk — pure JS, no JSX)
2. Extract hooks (low risk — same data, reorganised)
3. Extract components (test each after extraction)
4. Extract views (one at a time, confirm props thread correctly)
5. Rename entry point to `App.jsx`

**Rule: One extraction at a time. Never attempt a big-bang rewrite.**
Use `/refactor` to run each extraction step safely.

## Supabase Schema

| Table    | Purpose                                        |
|----------|------------------------------------------------|
| sessions | All workouts — erg, strength, cycling, rest    |
| vitals   | Daily health — RHR, HRV, sleep, bodyweight     |

sessions columns: `date, type, label, duration, srpe, exercises, watts, hr, distance, status`

Status values: `"logged"` (completed) or `"planned"` (prescription).

## Training Science Domain

> These terms appear throughout the code. Understanding them helps you
> understand what the app is calculating.

- **CTL** (Chronic Training Load) — 42-day exponential average of daily TSS.
  Represents your fitness level. Goes up slowly with consistent training.
- **ATL** (Acute Training Load) — 7-day average. Represents current fatigue.
  Rises quickly after hard weeks, drops during rest.
- **TSB** (Training Stress Balance) = CTL - ATL. Positive = fresh/rested.
  Negative = fatigued. The "form" number.
- **sRPE** — How hard a session felt on a 1–10 scale (subjective).
- **CP** (Critical Power) — The highest power you can sustain indefinitely.
  Currently estimated at ~190W; CP test planned for 1 Jul.
- **Polarized TID** — 80% easy (Zone 2), 20% hard (threshold/VO₂max).
- **Microcycle** — One week training pattern. Home weeks = loading. FIFO = deload.

## Integration Roadmap

Planned external data sources (to be built after refactor foundation is solid):

1. **Strava** — OAuth2 activity sync → sessions table
2. **Garmin Connect** — daily HRV/RHR/sleep → vitals table
3. **Concept2 Logbook** — erg session auto-import
4. **TrainingPeaks / Ergzone** — replaced by native plan engine

## Development Workflow (Software Factory)

All development flows through the **orchestrator** — the master coordinator
that routes requests, spawns specialist agents in sequence, and gates on your
approval at every stage. Never advances without explicit go-ahead.

```
/feature <description>   →  orchestrator runs the full pipeline
/refactor <module>       →  orchestrator runs the refactor pipeline
/research <topic>        →  orchestrator runs research only
```

### Pipeline (orchestrator coordinates these agents in order)

```
researcher   →  investigates APIs, docs, patterns
spec-writer  →  turns description into acceptance criteria + file targets
             ↑ USER APPROVES SPEC BEFORE BUILD BEGINS
feature-builder  →  implements following the architecture rules
test-verifier    →  writes and runs Vitest tests
code-reviewer    →  APPROVE / REQUEST CHANGES verdict
             ↑ USER APPROVES BEFORE COMMIT
```

### Specialist agents (used directly for focused tasks)

| Agent | Use when |
|---|---|
| `researcher` | Deep-dive into an API before committing to an approach |
| `spec-writer` | Write a spec without the full pipeline |
| `feature-builder` | Implement from an already-approved spec |
| `test-verifier` | Add tests to existing code |
| `code-reviewer` | Review a diff before committing |
| `refactor-agent` | Extract one module from erg-dashboard.jsx |

## Safety Constraints

- Never push directly to main — always use feature branches
- Never hardcode credentials — use `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Never delete Supabase rows without confirming with the user first
- Always run `npm run build` before marking a feature complete
- Always run `npm test` before committing
