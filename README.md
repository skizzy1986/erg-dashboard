# Erg Dashboard

A personal training system for rowing, strength, and cycling — built to replace
Strava, Garmin Connect, Concept2 Logbook, and TrainingPeaks with a single,
fully personalised app.

[![CI — Web](https://github.com/skizzy1986/erg-dashboard/actions/workflows/ci-web.yml/badge.svg)](https://github.com/skizzy1986/erg-dashboard/actions/workflows/ci-web.yml)
[![CI — Android](https://github.com/skizzy1986/erg-dashboard/actions/workflows/ci-android.yml/badge.svg)](https://github.com/skizzy1986/erg-dashboard/actions/workflows/ci-android.yml)

**v1.3.0** · React 18 + Supabase + Capacitor Android · Deployed on Vercel

---

## What This Is

A full-stack training dashboard built by and for a 50+ recreational rower
training toward competitive regattas. Not a generic fitness tracker — every
feature is built to scratch a specific itch that commercial apps don't reach:
live PM5 Bluetooth data in the browser, HRV-aware readiness scoring, an AI
coach with full training context, and training load analytics (TSS/CTL/ATL/TSB)
computed from real session data.

---

## Features

| View | What it does |
|------|-------------|
| **Overview** | TSS/CTL/ATL/TSB training load chart, weekly load summary |
| **Calendar** | Month view of planned vs completed sessions |
| **Program** | Microcycle schedule with prescribed workouts |
| **ERG Live** | Real-time Bluetooth connection to Concept2 PM5 (watts, pace, HR) |
| **Strength Log** | Session logging with PR tracking, rest timers, static hold timer |
| **Mobility** | Mobility session tracking |
| **Recovery** | HRV analytics dashboard, readiness score from Google Health data |
| **Session Log** | Full history with filtering |
| **Journal** | Daily training notes |
| **AI Coach** | Streaming chat with Claude, training-context-aware system prompt |

**Mobile:** Android APK (Capacitor 8) with dedicated mobile views — Analytics,
Recovery, Strength, Session Log, Coach. PWA installable on iOS/web.

**Offline:** Service worker queues sessions written offline; syncs on reconnect.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| State / data fetching | TanStack React Query v5 |
| Charts | Recharts |
| Backend | Supabase (Postgres, Auth, Edge Functions on Deno) |
| Mobile | Capacitor 8 → Android APK; PWA for iOS/web |
| Hosting | Vercel (auto-deploy on push) |
| Bluetooth | `@capgo/capacitor-bluetooth-low-energy` → Concept2 PM5 |
| AI | Anthropic API (streaming) via Supabase Edge Function proxy |
| Testing | Vitest + React Testing Library |
| CI/CD | GitHub Actions |
| Pre-commit | Husky + lint-staged |

---

## Architecture

```
Browser / Android APK
  └── React 18 SPA (web/src/)
        ├── views/          — one component per tab (10 desktop + 5 mobile)
        ├── hooks/          — data fetching (React Query + Supabase), derived state
        ├── components/     — shared UI (charts, forms, log entries)
        ├── utils/          — pure functions: TSS calc, HRV analytics, scheduling
        └── constants/      — training config, exercise library, UI config
              │
              ▼
        Supabase (Postgres + Auth)
        ├── sessions        — all workouts (erg, strength, cycling, rest, planned)
        ├── vitals          — daily RHR / HRV / sleep / bodyweight
        ├── training_load   — computed daily TSS
        ├── strength_logs   — per-set logs with weights and reps
        └── coach_messages  — AI coach conversation history
              │
              ▼
        Supabase Edge Functions (Deno)
        ├── coach-chat        — Anthropic streaming API proxy (JWT-gated)
        ├── vitals-import     — Google Sheets CSV → vitals (legacy cron)
        ├── vitals-import-api — Google Health API → vitals (morning cron)
        └── vitals-sync       — on-demand sync trigger
```

The main file `web/src/erg-dashboard.jsx` (~9,700 lines) is being decomposed
into the modular structure above using a strangler-fig refactor — one safe
extraction at a time, app stays functional throughout.

---

## Development Setup

### Prerequisites

- Node.js 22+
- A Supabase project (free tier works)

### Environment variables

Create `web/.env.local`:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

For the `coach-chat` edge function, set `ANTHROPIC_API_KEY` in the Supabase
Dashboard under Edge Functions → Secrets.

### Local dev

```bash
cd web
npm install
npm run dev          # → http://localhost:5173
```

### Key commands

```bash
npm run dev          # Dev server with HMR
npm run build        # Production build → dist/
npm run preview      # Preview production build locally
npm test             # Vitest test suite
npm run lint         # ESLint
npm run format       # Prettier (auto-fix)
npm run format:check # Prettier check (no writes — used in CI)
npx vitest run --coverage  # Tests + coverage report
```

---

## Project Structure

```
erg-dashboard/
├── web/
│   ├── src/
│   │   ├── constants/        training config, exercise library, UI config
│   │   ├── hooks/            React Query hooks + Supabase data layer
│   │   ├── utils/            TSS calc, HRV analytics, scheduling, formatting
│   │   ├── components/       shared UI components
│   │   ├── views/            desktop views (CoachView, ErgLiveView, …)
│   │   │   └── mobile/       mobile-specific views (MobileApp, MobileRecovery, …)
│   │   ├── services/         pm5Bluetooth.js (BLE abstraction)
│   │   ├── erg-dashboard.jsx monolith being decomposed (~9,700 lines)
│   │   └── main.jsx          auth gate (Supabase email/password)
│   ├── android/              Capacitor Android project
│   ├── capacitor.config.json
│   └── vite.config.js        includes Vitest config + PWA manifest
├── supabase/
│   ├── functions/            Edge Functions (Deno)
│   └── migrations/           SQL migration files
└── .github/
    └── workflows/
        ├── ci-web.yml        lint → test → build
        └── ci-android.yml    build web → sync Capacitor → build APK
```

---

## CI/CD

### Web (`ci-web.yml`) — runs on every push and PR

| Job | What it checks |
|-----|---------------|
| **Lint & Format** | ESLint + Prettier + `npm audit --audit-level=high` |
| **Test & Coverage** | All Vitest tests pass; posts coverage summary as a PR comment |
| **Build** | `npm run build` exits 0 (runs only after Test passes) |

### Android (`ci-android.yml`) — runs on push to main/feature branches

Builds web assets, syncs via `npx cap sync android`, assembles a debug APK
with Gradle. The APK is uploaded as a build artifact (retained 14 days).

### Other automation

- **Branch protection on `main`:** direct pushes blocked; all changes go
  through PRs with passing CI.
- **Vercel:** auto-deploys on push to main; preview URLs on every PR.
- **Dependabot:** weekly grouped PRs for npm and GitHub Actions updates.
- **Pre-commit (Husky + lint-staged):** ESLint + Prettier run automatically on
  staged `.js`/`.jsx` files before every local commit.

---

## Development Workflow

All feature work flows through a **software factory** — a chain of specialist
Claude agents coordinated by an orchestrator, with human approval gates before
code is written and before code is merged.

```
/feature <description>   →  full pipeline
/refactor <module>       →  safe strangler-fig extraction
/research <topic>        →  research only, no code
```

**Pipeline:**

```
researcher  →  spec-writer  →  [APPROVE SPEC]
            →  feature-builder  →  test-verifier  →  code-reviewer
            →  [APPROVE BUILD]  →  PR  →  CI  →  merge
```

Agents live in `.claude/agents/`. The orchestrator never advances to the next
stage without explicit approval.

---

## Roadmap

These are planned but not yet built:

- **Strava OAuth2** — activity auto-sync → sessions table
- **Garmin Connect** — HRV/RHR/sleep import → vitals table
- **Concept2 Logbook** — erg session auto-import
- **TrainingPeaks / Ergzone** — replaced by native plan engine
- **Signed Android release APK** — for Play Store or direct distribution

The foundation for all of these exists: Supabase tables are schema-ready,
the edge function pattern is established, and the vitals import pipeline
(Google Health API) demonstrates the cron + on-demand sync model.

---

## Background

Built by Scott with Claude. Started as a static React artifact; grew into a
full-stack app as training got more serious. The architecture decisions
(Supabase, Capacitor, strangler-fig refactor) reflect real constraints: a
single developer, a phone-first training environment, and a preference for
owning the data rather than being locked into commercial platforms.
