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
| UI         | React 19 + Vite                | Frontend single-page app             |
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
      mobile/       Mobile-only shared components (BottomTabBar)
    services/       Device/native integrations (pm5Bluetooth.js)
    views/          Extracted dashboard tabs (desktop + mobile)
      mobile/       Mobile tab views
      program/      ProgramView split-out pieces (#77)
    App.jsx         Entry shell/router (~447 lines) — the former erg-dashboard.jsx monolith
    StrengthLogger.jsx Large component, not yet extracted (~1,665 lines)
    main.jsx        Auth gate (Supabase email/password login)
  .design-sync/   The design surface — HANDOFF.md (normative light redesign),
                  DESIGN_BRIEF.md, CLAUDE.md (design-session briefing),
                  conventions.md (agent prompt header), NOTES.md, and the
                  machine contract read by config.json. See DESIGN.md.
supabase/
  functions/        Edge Functions (vitals-import, vitals-import-api,
                    vitals-sync, coach-chat)
coach/
  PROJECT_MANAGEMENT_ANALYSIS.md  PM/workflow analysis (2026-06-29)
  work-orders/      DEPRECATED — historical specs; tracking is now GitHub Issues
.github/
  workflows/    GitHub Actions CI (ci-web.yml, ci-android.yml)
  dependabot.yml  Weekly grouped dependency updates (npm + actions)
  PULL_REQUEST_TEMPLATE.md  PR checklist template
.claude/
  agents/       Agency agent library (232 agents, 16 divisions) — staffs the pipeline
  skills/       Pipeline definitions (/orchestrate, /feature, /refactor, /research),
                /daily task brief, erg-context.md spawn preamble, and domain
                knowledge docs
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

## Design System

> Front door: **[`DESIGN.md`](DESIGN.md)**. Read it before changing anything visual.

Authority order: `web/.design-sync/HANDOFF.md` (normative — the light redesign) >
`DESIGN_BRIEF.md` (prescriptive — IA and scales) > `conventions.md` (descriptive — how it
looks today, and what the design agent is prompted with).

**The app is dark today. Light is the target — and dark is kept as a second theme, not
deleted** (the erg room is dark at 5am). `web/src/constants/theme.js` still holds 23
colour-named hex tokens; the light, role-named `var(--color-*)` system is specified but has
not shipped. Do not assume light until the flip lands.

**The property boundary** keeps three workstreams from colliding in the same lines:
colour hexes belong to **#183**, `padding`/`margin`/`gap`/`borderRadius` to **S6**, and
`fontFamily`/`fontSize`/`fontWeight`/`letterSpacing`/`lineHeight` to **S-1**. A PR stays on
one side of it.

`npm run check:design-sync` guards the machine contract in CI. Re-syncing the claude.ai/design
project needs an interactive `/design-login` and cannot be done from a remote agent session.

## Architecture: Strangler Fig Refactor

The monolith decomposition is complete (#52, closed by PR #145 on 2026-07-11):
the former `web/src/erg-dashboard.jsx` is now `web/src/App.jsx` — a ~447-line
shell/router that composes the extracted views. Remaining large files:
`views/ProgramView.jsx` (~1,900 lines, being split into `views/program/*`, #77)
and `StrengthLogger.jsx` (~1,665 lines, untested, #79). The migration order
that got here (kept for reference):

1. Extract constants and utils (zero risk — pure JS, no JSX)
2. Extract hooks (low risk — same data, reorganised)
3. Extract components (test each after extraction)
4. Extract views (one at a time, confirm props thread correctly)
5. Rename entry point to `App.jsx`

**Rule: One extraction at a time. Never attempt a big-bang rewrite.**
Use `/refactor` to run each extraction step safely.

## Supabase Schema

**14 tables, 23 migrations** (project `swdrueaserjzhuxnzmeu`, ap-northeast-1) as of
2026-07-01. The core calendar, the strength subsystem (Cowork-built, now in active
coach use), and the context store (Code↔Coach shared memory, added by #94):

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
| `coach_messages`    | In-app Coach chat rail (see Coaching data model)                     |
| `backup_snapshots`  | Daily full-DB JSON snapshots (backup cron)                           |
| `coach_log`         | **Context store** — append-only diary + decision record (Coach's content) |
| `anchors`           | **Context store** — current calibration + phase state (one live row/key)  |

**`sessions` columns:** `date` (**text `M/D/YY`, unpadded** — the write column),
`date_iso` (**generated `date`, read-only** — derived from `date` by
`session_date_to_iso()`, indexed, and the only correct thing to `order by`; an
insert that names it is rejected, and a `date` that will not parse is rejected by
the `sessions_date_parseable` check), `type`, `label`, `duration`,
`srpe`, `prs`, `exercises` (jsonb), `coach_note`, `status`, `coach_flag`,
`avg_watts`, `avg_hr`, `distance_m`, `source` (default `portal`; Coach writes
`coach`), `user_id`. **No watt-target columns — targets live in `label` +
`coach_note`.** Status values: `"actual"`, `"completed"`, or `"logged"` (all mean
completed — `"logged"` is written by the live PM5 Bluetooth save path, `"actual"`/
`"completed"` by bulk-imported history), `"planned"` (prescription), or
`"cancelled"`.

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

**Context store (`coach_log` + `anchors`) — the single source of truth both tools
read (Coach via MCP, Code via DB).** Native `date`/`timestamptz` throughout (not the
legacy `sessions.date` text pattern); RLS single-owner policy like the modern tables.

- **`coach_log`** — append-only diary + decision record. Columns: `date`,
  `entry_type` (`diary` | `decision` | `observation`), `body` (the narrative/
  reasoning), `author` (`coach` | `scott`), `tags` (text[]), `supersedes` (nullable
  self-FK), `created_at`. **Never edit a row in place** — to reverse a past decision,
  insert a NEW row with `supersedes` pointing at the one it overrides. History is the
  record of *why we changed our mind*.
- **`anchors`** — current calibration + phase state. Columns: `key`, `value` (text),
  `unit`, `status` (`provisional` | `unvalidated` | `confirmed`), `source`,
  `valid_from`, `superseded_at` (nullable), `note`. **One live row per key** — a
  partial unique index on `(user_id, key) where superseded_at is null` makes "current
  value per key" a one-row read. To update, set `superseded_at = now()` on the old row
  and insert the new one (don't overwrite). Live keys: `rowing_cp`, `bike_ftp`,
  `current_phase`, `current_block`, `doctrine_sha`.
- **`doctrine_sha`** pins the canonical doctrine commit (this file +
  `.claude/skills/training-science.md`). Doctrine *prose stays in git*; only the SHA
  lives in a row, so both tools agree which version is live.
  **This anchor is self-maintaining — it is the one exception to "Scott authorises".**
  Two halves: `.github/workflows/doctrine-sha-guard.yml` *detects* drift on any push
  touching the doctrine docs and opens a tracking issue (CI has no DB access, so it
  cannot fix it), and the **`Supabase Doctrine_SHA anchor update`** Routine *applies* the
  supersede nightly at 01:00 UTC, then closes that issue. It no-ops when the anchor
  already matches, only ever touches `doctrine_sha`, and stops rather than improvises
  on any ambiguity. Do not hand-supersede this key unless the Routine is disabled.
- **Lanes:** Code owns the schema (tables, structural seed, migrations); Coach owns
  row content (diary, decisions, anchor updates) via scoped writes; Scott authorises
  — **except `doctrine_sha`**, which is mechanically derived from a git commit rather
  than a judgement about training, and so is automated (above). Every other anchor —
  `rowing_cp`, `bike_ftp`, `current_phase`, `current_block`, `drag_factor` — still
  needs Scott, because each encodes a decision, not a fact.

**Data-layer gotchas (honour on every write):**
- Supply the `user_id` UUID explicitly on inserts — `auth.uid()` is the column
  default but does not resolve through the MCP connector.
- Order `sessions` chronologically with **`date_iso`** (generated + indexed), never the
  text `date` — lexical order silently returns the wrong rows under a `LIMIT`. On
  descending, pass `NULLS LAST` (`nullsFirst: false` from supabase-js). Do not use
  `to_date(...)`: it is STABLE, so it cannot be indexed or used in a generated column.
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
  Rowing zones off this anchor: **UT2 113–144 / UT1 144–164 / AT 164–185 W**.
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

## Observability (Sentry)

Sentry is the runtime-error and auditing rail. The org is **`splitiq-29` and it is
EU-region** (`https://de.sentry.io`) — this matters everywhere: the ingest host is
`*.ingest.de.sentry.io`, `@sentry/vite-plugin` needs `url: 'https://de.sentry.io'`
(it defaults to `sentry.io` and would not find the org), and every Sentry MCP call
needs `regionUrl: 'https://de.sentry.io'`. Frontend project: **`erg-dashboard`**.

| Piece | Where |
|---|---|
| `Sentry.init` + `captureError()` | `web/src/utils/sentry.js` (gated on `VITE_SENTRY_DSN` — no DSN, no-op) |
| Root boundary | `web/src/main.jsx` (`Sentry.ErrorBoundary`) |
| Per-tab boundary | `web/src/App.jsx` — isolates a broken tab **and** reports via `componentDidCatch` |
| Supabase failure sink | `web/src/utils/queryErrorHandlers.js`, wired into the `QueryCache`/`MutationCache` in `main.jsx` |
| Release + source maps | `web/vite.config.js`, on Vercel production builds only |
| CSP allowlist | `web/vercel.json` — `connect-src` **must** include the ingest host |

Two failure modes are silent and have bitten this repo before, so check them first
when Sentry looks dark:

1. **CSP.** If `connect-src` in `web/vercel.json` lacks `https://*.ingest.de.sentry.io`,
   every envelope is blocked in the browser and nothing reaches Sentry, DSN or not.
2. **Release mismatch.** The SDK's `release` and the string the plugin uploads
   artifacts under must be identical, or Sentry serves minified frames without
   erroring. Both derive from `sentryRelease` in `web/vite.config.js` — keep it that way.

`browserTracingIntegration()` is **not** a default integration in the browser SDK;
`tracesSampleRate` does nothing without it. There is a test asserting this.

Session Replay is deliberately **not** enabled — it costs ~35-50 KB gzip against
~40 KB of headroom under the 400 KB budget in `web/scripts/check-bundle-size.mjs`.

Env vars are documented in `web/.env.example`. Runtime (`VITE_SENTRY_DSN`) and
build-time (`SENTRY_ORG`/`SENTRY_PROJECT`/`SENTRY_URL`/`SENTRY_AUTH_TOKEN`) are set in
the Vercel dashboard, not in the repo.

### Edge functions — project `erg-dashboard-functions`

Separate project so the Deno issue stream stays legible next to the frontend's. All
four functions report through `supabase/functions/_shared/sentry.ts`. Set `SENTRY_DSN`
as an Edge Function secret (Dashboard → Edge Functions → Secrets); without it every
export in that module is a no-op, so local `supabase functions serve` stays silent.

Two rules in that module are load-bearing, not preferences:

- **`defaultIntegrations: false`.** The Deno SDK does not instrument `Deno.serve`, so
  there is no per-request scope, and the edge runtime reuses an isolate across
  requests. Global breadcrumbs and context would leak into the *next* caller's event.
  Everything request-specific goes through `withScope` instead.
- **`await Sentry.flush()` before returning.** The isolate can be frozen the moment
  the Response resolves, discarding anything still queued in the transport.

**Cron + uptime.** The free plan allows one cron monitor and one uptime monitor.
The cron monitor is on `vitals-import` (check-ins emitted from inside the function,
since the scheduler lives outside the repo; the schedule is upserted from
`MONITOR_SCHEDULE` in code). The uptime monitor points at
`https://erg-dashboard-eight.vercel.app/`. Adding monitors for the other jobs needs a
plan upgrade.

## CI & Quality Gates

Every PR is gated by three GitHub Actions jobs that must pass before merge:

| Job | What it checks |
|---|---|
| `Lint & Format` | ESLint errors + Prettier formatting + `npm audit --audit-level=high` |
| `Test & Coverage` | All Vitest tests pass; coverage meets the ratcheting thresholds in `web/vite.config.js` (`test.coverage.thresholds` — the **only** source of truth for the numbers), raised as extractions add tests |
| `Build` | `npm run build` exits 0 (runs only after Test passes) |

Coverage thresholds live in `web/vite.config.js` (`test.coverage.thresholds`) and
**ratchet upward**. Scope is explicit — `coverage.all` + `include: ['src/**']`
with `StrengthLogger.jsx`, `main.jsx`, `test-setup.js`, and pure-data
`constants/**` excluded (the former monolith, now `App.jsx`, is fully included) — so the gate measures real coverage instead of
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

All development flows through the canonical pipeline defined **once** in
`.claude/skills/orchestrate/SKILL.md`. There is no orchestrator agent — the
skill prompt, running in the main conversation, orchestrates: it classifies
the request, spawns Agency-library agents per stage, and stops at three human
approval gates. It never advances without explicit go-ahead.

```
/feature <description>   →  alias for /orchestrate
/orchestrate <idea>      →  the canonical pipeline
/refactor <module>       →  strangler-fig extraction (Minimal Change Engineer)
/research <topic>        →  research only (Trend Researcher)
/daily                   →  today's 30-min task list (read-only, no pipeline)
/audit [period]          →  rank Sentry issues, verify against code, file GitHub Issues
```

### The canonical chain (stage → Agency agent)

| Stage | Agent | Writes? |
|---|---|---|
| 1. Research (codebase) | `Codebase Onboarding Engineer` | no |
| 2. Story | `Product Manager` | no |
| — **GATE 1: right problem? criteria correct?** | | |
| 3. Spec | `Workflow Architect` | no |
| — **GATE 2: design safe? approve before any code** | | |
| 4. Build + tests | `Backend Architect` / `Frontend Developer` | yes |
| 5. Test verification | `Test Results Analyzer` | no |
| 6. Review + Validate | `Code Reviewer` + `Reality Checker` (parallel judges) | no |
| — **GATE 3: ship?** | | |
| 7. Deliver | main thread — branch → PR → CI → merge | — |

Every spawn is prefixed with `.claude/skills/erg-context.md` (the canonical
context preamble) plus a stage addendum from the skill — the agents are
generic; the skill makes them erg-aware. Models are pinned per stage via the
Agent tool's `model` parameter (sonnet for research/story/verify/review; opus
for spec/build/validate). Read-only stages are prompt-enforced and checked
with `git status` before/after each spawn.

## Agency Agents (the full library staffs the factory)

The **complete Agency agent library** (`msitarzewski/agency-agents`) is
installed: **16 divisions, 232 agents**. As of 2026-07-02 the library **staffs
the pipeline** — the 12 project-specific pipeline agents were retired (git
history is their archive). Agency agents both advise *and* build, but code
still ships only through the gated pipeline and lands as a PR per
`WORKFLOW.md` — never as a direct commit from a loose agent.

> **Which agent for which job?** See **[`.claude/AGENTS.md`](.claude/AGENTS.md)** —
> a task → agent routing map so the 232-file library is navigable, not sprawl.

Installed in **two locations** (2026-06-29):
- Globally at `~/.claude/agents/` (the upstream installer's default).
- Committed into this repo's `.claude/agents/` (so they persist and version with
  the project). **Never edit the library files** — all erg-specific behaviour
  (context, model pins, read-only discipline, persona reframing) is applied at
  spawn time by the skills, so the 232 files stay pristine and re-installable.

Agency agent files are division-prefixed (e.g. `project-management-project-shepherd.md`,
`product-manager.md`, `testing-test-results-analyzer.md`). To list divisions or
re-install: clone the upstream repo and run
`./scripts/install.sh --tool claude-code --list teams` (or `--no-interactive` to
install all). The 16 divisions: academic, design, engineering, finance,
game-development, gis, marketing, paid-media, product, project-management, sales,
security, spatial-computing, specialized, support, testing.

### Most relevant divisions for this solo dashboard

Beyond the pipeline roles above, most of the 232 are irrelevant to a personal
React/Supabase app (game-dev, GIS, real-estate, sales, …). The high-value
advisory ones:

| Division | Use for |
|---|---|
| **product** | What to build next; re-ranking the backlog (`product-manager`, `product-sprint-prioritizer`) |
| **project-management** | Sequencing and tracking issues/PRs (`project-management-project-shepherd`, `project-manager-senior`) |
| **testing** | Coverage interpretation, perf, API validation, a11y |
| **support** | Supabase/Vercel health, analytics reporting |

Workflow and backlog live in GitHub Issues/Projects — see `WORKFLOW.md`.

### Important: provide erg-dashboard context

Agency agents are generic — they have no knowledge of rowing, CTL/ATL, Supabase
schema, or the project architecture. **Prepend the full contents of
`.claude/skills/erg-context.md` to every spawn** — the pipeline skills do this
automatically; do the same when invoking an Agency agent directly. Deeper
domain knowledge lives in `.claude/skills/training-science.md` and
`.claude/skills/supabase-patterns.md`.

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
plus the schema above.**

The in-app Anthropic-API path (`coach_messages` table, the Coach tab) was revived on
2026-08-22 by #199. **The client assembles the training context and posts it**:
`buildTrainingContext` in `web/src/hooks/useCoach.js` composes load, readiness,
today's prescription and the recent microcycle from the same tested utilities the
dashboard itself uses (`calcTrainingLoad`/`sessionLoad`, `computeReadiness`,
`COMPLETED_STATUSES`, `toISODate`), and `coach-chat` is a thin Anthropic proxy that
holds no data logic of its own. It used to rebuild that context server-side against
column names `vitals` does not have and a `status` filter no row matched, so the
Coach silently ran on an empty context — **do not reintroduce a second builder in the
edge function.**

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
- Coverage thresholds (the ratchet in `web/vite.config.js` — the only source of truth for the numbers) are enforced in CI — new code should include tests, and the numbers only go up
