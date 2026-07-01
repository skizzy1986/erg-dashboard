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
npm run dev           # Start dev server → http://localhost:5173
npm run build         # Production build → dist/
npm run preview       # Preview production build locally
npm test              # Run Vitest test suite
npm run lint          # ESLint check (blocks CI if it fails)
npm run format        # Prettier format (auto-fix)
npm run format:check  # Prettier check (used in CI — no writes)
npx vitest run --coverage  # Run tests with coverage report
```

## Project Structure

```
web/                The app lives under web/ (Vite + Capacitor monorepo layout)
  src/
    constants/      Hardcoded config, seed data, reference tables
    hooks/          Custom React hooks (data fetching, derived state)
    utils/          Pure functions — analysis, formatting, scheduling
    components/     Shared UI components (LogEntry, WorkoutItem, charts)
    views/          Extracted dashboard tabs (desktop + mobile)
    erg-dashboard.jsx  Monolith being decomposed (~9,700 lines — see refactor)
    StrengthLogger.jsx Large component, not yet extracted (~1,665 lines)
    main.jsx        Auth gate (Supabase email/password login)
supabase/
  functions/        Edge Functions (vitals-import from Google Health API)
coach/
  PROJECT_MANAGEMENT_ANALYSIS.md  PM/workflow analysis (2026-06-29)
  work-orders/      DEPRECATED — historical specs; tracking is now GitHub Issues
.github/
  workflows/    GitHub Actions CI (ci-web.yml, ci-android.yml)
  dependabot.yml  Weekly grouped dependency updates (npm + actions)
  PULL_REQUEST_TEMPLATE.md  PR checklist template
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

The main file (`web/src/erg-dashboard.jsx`, **~9,700 lines** as of 2026-06-29 —
the refactor is in progress and tracked in GitHub issue #52) is being decomposed
into a modular structure. `App.jsx` has not been reached yet. The safe migration
order:

1. Extract constants and utils (zero risk — pure JS, no JSX)
2. Extract hooks (low risk — same data, reorganised)
3. Extract components (test each after extraction)
4. Extract views (one at a time, confirm props thread correctly)
5. Rename entry point to `App.jsx`

**Rule: One extraction at a time. Never attempt a big-bang rewrite.**
Use `/refactor` to run each extraction step safely.

## Supabase Schema

**13 tables, 22 migrations** (project `swdrueaserjzhuxnzmeu`, ap-northeast-1) as of
2026-07-01. The core calendar plus the strength subsystem (Cowork-built, now in
active coach use):

| Table               | Purpose                                                         |
|---------------------|-----------------------------------------------------------------|
| `sessions`          | Master training calendar — all modalities (erg, strength, bike, rest) |
| `vitals`            | Daily health — RHR, HRV, sleep, bodyweight + Google-Health activity  |
| `templates`         | Strength session templates (5, coach-origin: 2 Upper / 2 Lower / Prehab) |
| `template_exercises`| Per-template prescriptions (sets/reps/rpe/`set_plan` jsonb/timed)     |
| `strength_workouts` | Completed strength session container; links to calendar + template   |
| `strength_sets`     | Per-set actuals (weight/reps/rpe/warmup/hold) — real logged data only |
| `workout_assignments`| Template→date prescription (pending/in_progress/completed/skipped)   |
| `exercises`         | Exercise library — 873 rows, **text ids**                            |
| `exercise_media`    | Demo media per exercise (reference content, not user data)           |
| `exercise_prefs`    | Per-user, per-exercise preferences (e.g. rest seconds)               |
| `coach_messages`    | Legacy/experimental in-app chat rail (see Coaching data model)       |
| `backup_snapshots`  | Daily full-DB JSON snapshots (backup cron)                           |

**`sessions` columns:** `date` (**text `MM/DD/YY`**), `type`, `label`, `duration`,
`srpe`, `prs`, `exercises` (jsonb), `coach_note`, `status`, `coach_flag`,
`avg_watts`, `avg_hr`, `distance_m`, `source` (default `portal`; Coach writes
`coach`), `user_id`. **No watt-target columns — targets live in `label` +
`coach_note`.** Status values: `"logged"` (completed) or `"planned"` (prescription).

**`vitals`:** `date` is a real `date` type; upsert on `(user_id, date)`. RHR/HRV/
sleep/bodyweight and the Google-Health columns (`steps_count`, `distance_m`,
`active_minutes`, `calories_kcal`) auto-fill via the vitals-import cron.
**`readiness` + `soreness` are the only manual inputs** (morning check-in).

**Strength logging convention:** a coach-logged strength session is a
`strength_workouts` container with `status='completed'`, `origin='coach'`, linked
to the calendar via `session_id → sessions.id` and to the template via
`template_id`; the breakdown goes in `notes` and `prs` lands on the `sessions`
row. Only populate `strength_sets` when real per-set data exists (in-app logging)
— never fabricate reps from Fitbod session-level stickers. `workout_assignments`
is not yet wired into the coach flow.

**Data-layer gotchas (honour on every write):**
- Supply the `user_id` UUID explicitly on inserts — `auth.uid()` is the column
  default but does not resolve through the MCP connector.
- Order `sessions` chronologically with `to_date(date,'MM/DD/YY')` (date is text).
- `UNIQUE(date, label)` on `sessions` — temp-suffix labels before bulk shuffles
  (`set label = label || '~tmp'`).
- Vitals upsert: `on conflict (user_id, date) do update`.
- DDL via `apply_migration` (named), not raw `execute_sql`.
- Read back every write.

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
  **~205W provisional (rowing)**; revalidate via rested 1-min + 4-min tests.
  Rowing zones off this anchor: **UT2 113–144 / UT1 144–164 / AT 164–205 W**.
- **Current model — pure base + strength** (reverted from polarised on 2026-06-29):
  rowing is aerobic volume only (UT1/UT2 — no programmed threshold/VO₂); the bike
  is a complementary Z1/Z2 aerobic carrier, never a programmed intensity source;
  strength is **2 Upper + 2 Lower per week**, Lowers ≥3 days apart, alternating
  RDL-led / quad-unilateral to manage the rehab hamstring.
- **Microcycle** — One week training pattern. Home weeks = loading. FIFO = deload.

## Integration Roadmap

**Live now:** **Google Health API** auto-syncs daily vitals into the `vitals`
table (RHR/HRV/sleep/bodyweight + steps/distance/active-minutes/calories) via the
`vitals-import` edge function + cron. No manual health-export step.

Planned external data sources (to be built after refactor foundation is solid):

1. **Strava** — OAuth2 activity sync → sessions table
2. **Garmin Connect** — daily HRV/RHR/sleep → vitals table
3. **Concept2 Logbook** — erg session auto-import
4. **TrainingPeaks / Ergzone** — replaced by native plan engine

## CI & Quality Gates

Every PR is gated by three GitHub Actions jobs that must pass before merge:

| Job | What it checks |
|---|---|
| `Lint & Format` | ESLint errors + Prettier formatting + `npm audit --audit-level=high` |
| `Test & Coverage` | All Vitest tests pass; coverage meets the ratcheting thresholds in `web/vite.config.js` — baseline **48% lines / 46% functions / 40% branches** (set by the #62 keystone), raised as extractions add tests |
| `Build` | `npm run build` exits 0 (runs only after Test passes) |

Coverage thresholds live in `web/vite.config.js` (`test.coverage.thresholds`) and
**ratchet upward**. Scope is explicit — `coverage.all` + `include: ['src/**']`
with the not-yet-extracted monolith, `StrengthLogger.jsx`, `main.jsx`, and
pure-data `constants/**` excluded — so the gate measures real coverage instead of
passing by accident on whatever files a test happened to import. Each refactor
extraction removes its file from `exclude` and lands tests in the **same** PR;
the thresholds are then raised toward it. The numbers only go up. A PR comment
with a coverage summary is posted automatically by
`davelosert/vitest-coverage-report-action`.

**Branch protection on `main`:** direct pushes are blocked. All changes must
go through a PR with passing CI. Branches must be up to date before merging.

**Pre-commit hook (Husky + lint-staged):** `eslint --fix` and
`prettier --write` run automatically on staged `*.js` / `*.jsx` files before
every local commit. This eliminates the most common cause of CI lint failures.
The hook does NOT run tests (kept under 5 seconds).

**Dependabot:** opens one grouped PR per week for minor/patch updates across
both npm packages and GitHub Actions versions.

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
             → push to feature branch → PR → CI gates → merge
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

## Agency Agents (full library installed)

In addition to the 12 project-specific pipeline agents, the **complete Agency
agent library** (`msitarzewski/agency-agents`) is installed: **16 divisions,
232 agents**. They are advisory and operational — they inform, plan, validate,
and support, but do **not** write code directly or replace the core pipeline.

> **Which agent for which job?** See **[`.claude/AGENTS.md`](.claude/AGENTS.md)** —
> a task → agent routing map so the 244-file library is navigable, not sprawl.

Installed in **two locations** (2026-06-29):
- Globally at `~/.claude/agents/` (the upstream installer's default).
- Committed into this repo's `.claude/agents/` (so they persist and version with
  the project). Total there = 244 = 232 Agency + the 12 pipeline agents.

Agency agent files are division-prefixed (e.g. `project-management-project-shepherd.md`,
`product-manager.md`, `testing-test-results-analyzer.md`). To list divisions or
re-install: clone the upstream repo and run
`./scripts/install.sh --tool claude-code --list teams` (or `--no-interactive` to
install all). The 16 divisions: academic, design, engineering, finance,
game-development, gis, marketing, paid-media, product, project-management, sales,
security, spatial-computing, specialized, support, testing.

### Most relevant divisions for this solo dashboard

Most of the 232 are irrelevant to a personal React/Supabase app (game-dev, GIS,
real-estate, sales, …). The high-value ones:

| Division | Use for |
|---|---|
| **product** | What to build next; re-ranking the backlog (`product-manager`, `product-sprint-prioritizer`) |
| **project-management** | Sequencing and tracking issues/PRs (`project-management-project-shepherd`, `project-manager-senior`) |
| **testing** | Coverage interpretation, perf, API validation, a11y |
| **support** | Supabase/Vercel health, analytics reporting |

Workflow and backlog live in GitHub Issues/Projects — see `WORKFLOW.md`.

### Important: provide erg-dashboard context

Agency agents are generic — they have no knowledge of rowing, CTL/ATL, Supabase schema, or
the project architecture. Always give them relevant context when invoking:

> "This is a personal rowing/cycling training dashboard (React + Supabase). The `sessions`
> table tracks all workouts; the `vitals` table tracks daily health metrics (RHR, HRV, sleep)."

The domain knowledge they need is in `.claude/skills/training-science.md` and
`.claude/skills/supabase-patterns.md` — paste the relevant sections when context matters.

## MCP Servers

### Context7

Context7 is connected in every session and provides current, version-specific
library documentation. Use it before WebSearch for any library in the stack.

**Two-step lookup — always in this order:**
1. `resolve-library-id` (params: `libraryName`, `query`) → returns a `/org/repo` ID
2. `query-docs` (params: `libraryId`, `query`, optional `tokens`) → returns docs

**Use Context7 for:** React, Vite, Vitest, `@supabase/supabase-js`,
`@testing-library/react`, Recharts, `@tanstack/react-query`, ESLint, Prettier.

**Fall back to WebSearch when:** `resolve-library-id` returns no results, or the
library is a tooling utility unlikely to be indexed (Husky, lint-staged, mathjs,
vite-plugin-pwa).

### Supabase (coaching data model)

The **integration model was ratified 2026-07-01**: Coach (Claude in chat) operates
natively via the **Supabase MCP connector, writing directly to the DB** (`source='coach'`)
— reading vitals, and inserting/updating `sessions`, `strength_workouts`, etc. This
is the live coaching rail, so **Code and Coach share one source of truth: this file
plus the schema above.** The in-app Anthropic-API path (`coach_messages` table) was
trialed and set aside — treat it as legacy/experimental unless revived.

**Bridge discipline persists** even though Code holds repo + schema + deploy: Scott
authorises consequential/destructive/schema changes; review structure before material
writes; read back every write. Honour the data-layer gotchas under *Supabase Schema*
on every insert.

## Change Procedure (PR-centric)

> The standing workflow is defined in **[`WORKFLOW.md`](WORKFLOW.md)**: every
> change is a **GitHub Issue → branch → PR → CI → `main`**. The backlog is GitHub
> Issues; status is the **"Split IQ"** GitHub Projects board. The old `coach/work-orders/` system
> is **deprecated**. The steps below are the same PR flow, kept here for quick
> reference.

Changes made outside the Claude Code factory (manual edits, config, edge-function
updates) follow the same PR workflow:

1. **Branch from fresh `main`** — `git fetch origin && git checkout -b <type>/<short-slug> origin/main`
   - Types: `housekeeping/`, `config/`, `fix/`, `feature/`
   - Always cut from a freshly-fetched `origin/main`, never a stale local `main` or another
     feature branch. Keep branches short-lived and **merge fast** to minimise drift.
2. **Commit** — stage only the relevant files; write a clear message
3. **Push** — `git push origin <branch>`
4. **PR** — open on GitHub; Vercel preview deploys automatically
5. **CI gates** — all three checks must pass (Lint, Test, Build)
6. **Merge** — squash or merge commit; delete the branch

**Keeping a branch current:** if `main` advances while a branch is open, rebase (don't merge)
to keep history linear:

```bash
git fetch origin && git rebase origin/main
# resolve any conflicts, re-run `npm test`, then:
git push --force-with-lease origin <branch>   # safe force — aborts if the remote moved
```

Rebase early and often; a branch that tracks `main` closely rarely conflicts. Never plain
`--force` a shared branch — always `--force-with-lease`.

**Monitoring:** CI results, Vercel deploys, and edge-function runs all post
to `#build` in Slack. Check `#build` to confirm a change landed correctly
without needing to prompt Coach.

## Safety Constraints

- Never push directly to main — always use feature branches; branch protection enforces this
- Branch from a freshly-fetched `origin/main`; keep branches short-lived and rebase (not merge) to stay current — `--force-with-lease` only, never `--force`
- Never hardcode credentials — use `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Never delete Supabase rows without confirming with the user first
- Always run `npm run build` before marking a feature complete
- Always run `npm test` before committing
- Always run `npm run lint` and `npm run format:check` before pushing — CI will fail if either does not pass
- Never bypass the pre-commit hook (`--no-verify`) without an explicit reason
- Coverage thresholds (baseline 48% lines / 46% functions / 40% branches — the ratchet in `web/vite.config.js`) are enforced in CI — new code should include tests, and the numbers only go up
