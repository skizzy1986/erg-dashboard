# Erg Dashboard

Personal coaching dashboard for rowing (erg), strength, and cycling training. Replaces Strava, Garmin Connect, Concept2 Logbook, and TrainingPeaks with a unified, fully personalised training system.

Deployed at Vercel. Backend on Supabase.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| UI | React 18 + Vite 8 |
| Charts | Recharts 2 |
| Math | mathjs 15 (CTL/ATL/TSB regression) |
| Server state | TanStack React Query 5 |
| Backend | Supabase (Postgres + Auth + Edge Functions / Deno) |
| Bluetooth | Web Bluetooth API — Concept2 PM5 GATT |
| AI | Anthropic API (Claude, streamed via Edge Function) |
| Mobile | Capacitor 7 (Android APK) + vite-plugin-pwa (installable PWA) |
| Hosting | Vercel (auto-deploy on push to main) |
| Testing | Vitest 4 + React Testing Library 16 |
| Linting | ESLint 9 + Prettier 3 + Husky pre-commit |

---

## Features

**Training analytics**
- CTL / ATL / TSB (Chronic Training Load, Acute Training Load, Training Stress Balance) — 42-day and 7-day exponential moving averages over daily TSS
- Linear regression aerobic trend projection
- Polarized TID tracking (Zone 2 vs threshold/VO₂max split)

**Session types supported**: erg, strength, cycling, rest

**Live erg (PM5 Bluetooth)**
- Connects to Concept2 PM5 via Web Bluetooth
- Streams pace, watts, stroke rate, HR, and distance in real time
- Saves completed session directly to Supabase

**Vitals**
- Daily RHR, HRV, sleep hours, bodyweight ingested from Google Health Connect
- Readiness scoring algorithm (RHR + HRV + sleep → daily readiness)
- Trend charts and history log

**AI coaching**
- Streaming chat interface powered by Claude (claude-haiku / claude-sonnet)
- Coach context includes Scott's profile, current training phase, and recent load

**Strength**
- 5 programmer-authored templates (Upper 1/2, Lower 1/2, Prehab+Shoulder)
- 873-exercise library with set/rep schemes
- Personal record tracking and strength trend charts

**Mobile**
- Responsive PWA — installable on iOS/Android from browser
- Offline session save queue (syncs when reconnected)
- Android debug APK built in CI via Capacitor

---

## Project Structure

```
erg-dashboard/          ← repo root (Husky, docs)
├── web/                ← entire app lives here
│   ├── src/
│   │   ├── main.jsx                  auth gate → desktop App or MobileApp
│   │   ├── erg-dashboard.jsx         desktop monolith (~3,900 lines, in refactor)
│   │   ├── StrengthLogger.jsx        extracted strength logging module
│   │   ├── constants/                domain data (config, exercises, nutrition, schedule, ui)
│   │   ├── hooks/                    React Query hooks (sessions, vitals, coach, PM5, offline, etc.)
│   │   ├── utils/                    pure functions (trainingLoad, recoveryAnalytics)
│   │   ├── services/                 pm5Bluetooth.js — Concept2 GATT parser
│   │   ├── components/               reusable UI (WorkoutItem, LogEntry, LogSessionForm, tooltips)
│   │   └── views/                    ErgLiveView, CoachView + mobile/ (5 mobile views)
│   ├── vite.config.js
│   └── package.json
├── supabase/
│   ├── migrations/                   4 SQL migration files
│   └── functions/                    3 Deno edge functions (coach-chat, vitals-import, vitals-import-api)
├── coach/
│   └── work-orders/                  git-native feature specs (WO-001 → WO-005)
├── .claude/                          agent definitions, skills, commands, hooks
└── .github/
    └── workflows/                    ci-web.yml, ci-android.yml
```

**Refactor status**: `erg-dashboard.jsx` is being decomposed via the strangler-fig pattern — extracted so far: `StrengthLogger`, `ErgLiveView`, `CoachView`, full mobile app ecosystem, all hooks, utils, and constants. Desktop tab views are next.

---

## Local Development

All commands run from the `web/` directory.

```bash
cd web
npm install
npm run dev          # dev server → http://localhost:5173
npm run build        # production build → dist/
npm run preview      # preview production build locally
npm test             # Vitest test suite
npm run lint         # ESLint check
npm run format       # Prettier auto-fix
npm run format:check # Prettier check (used in CI)
```

**Environment variables** (create `web/.env.local`):

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

These are injected at build time by Vite. Production values are stored in Vercel environment settings.

---

## Database

Four Supabase tables, all protected by Row Level Security (each user sees only their own rows):

| Table | Purpose | Key columns |
|-------|---------|-------------|
| `sessions` | All workouts | `date, type, label, duration, srpe, exercises, watts, hr, distance, status, source, prs` |
| `vitals` | Daily health metrics | `date, rhr, hrv, sleep, bodyweight, source, sleep_score` |
| `exercises` | Shared lift reference library | `id, name, category` |
| `coach_messages` | AI coaching chat history | `role, content, model` |

`sessions.status` is either `"logged"` (completed) or `"planned"` (prescription).

### Edge Functions (Deno, deployed on Supabase)

| Function | Purpose | Schedule |
|----------|---------|----------|
| `coach-chat` | Streams Claude fitness coaching responses | On demand |
| `vitals-import` | Ingests daily health CSV from Google Sheets | 03:00 UTC daily |
| `vitals-import-api` | (WO-005) Replaces CSV with Google Health API direct call | Pending deployment |

---

## Integrations

| Integration | Status | Notes |
|-------------|--------|-------|
| Supabase (DB + Auth) | Live | Email/password auth, RLS, Edge Functions |
| Vercel | Live | Auto-deploy on push; preview deploys on PRs |
| Google Health Connect → Sheets | Live | Fitbit syncs → Google Health → CSV export → daily cron |
| Anthropic API (Claude) | Live | Streaming coach chat via `coach-chat` Edge Function |
| Concept2 PM5 (Bluetooth) | Live | Web Bluetooth GATT, real-time rowing metrics |
| Slack | Live | Webhook to `#build` — deploy status + edge function alerts |
| Google Health API (direct) | WO-005 draft | Replaces CSV path; required before Fitbit Web API shutdown (Sept 2026) |
| Strava OAuth | Planned | Activity sync → `sessions` table |
| Garmin Connect | Planned | Daily HRV/RHR/sleep → `vitals` table |
| Concept2 Logbook | Planned | Auto-import erg sessions |

---

## CI/CD & Quality Gates

Two GitHub Actions workflows run on every PR:

**`ci-web.yml`** — three sequential jobs, all required before merge:
1. **Lint & Format** — ESLint + Prettier format check + `npm audit --audit-level=high`
2. **Test & Coverage** — Vitest; line ≥ 70%, function ≥ 70%, branch ≥ 60%; posts coverage summary as PR comment
3. **Build** — `npm run build` (gated on Test passing)

**`ci-android.yml`** — builds on pushes to main and `claude/**` / `feature/**` / `fix/**` branches:
1. Build web assets (with Supabase env vars injected)
2. Build debug APK via Capacitor + Gradle; artifact retained 14 days

**Branch protection**: direct pushes to `main` are blocked. All changes go through a PR with passing CI.

**Pre-commit hook** (Husky + lint-staged): ESLint `--fix` and Prettier `--write` run automatically on staged `*.js` / `*.jsx` files before every commit.

---

## Deployment

**Vercel only** — `web/vercel.json` configures the project (CSP headers, SPA rewrite, framework=vite). Connect the repo once; every merge to `main` auto-deploys. PR branches get preview deploys.

Supabase edge functions are deployed separately via the Supabase CLI (`supabase functions deploy <name>`).

---

## Development Workflow

All feature work runs through the orchestrator agent pipeline described in `FACTORY.md` and `CLAUDE.md`:

```
/feature <description>   →  researcher → spec → build → test → review → PR
/refactor <module>       →  safe strangler-fig extraction, one module at a time
/research <topic>        →  investigation only, no code
```

Feature specs are tracked as work orders in `coach/work-orders/`. See `CLAUDE.md` for full project intelligence (architecture rules, training science domain, CI gates, safety constraints).
