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
.github/
  workflows/    GitHub Actions CI (ci.yml — lint, test, build)
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

## CI & Quality Gates

Every PR is gated by three GitHub Actions jobs that must pass before merge:

| Job | What it checks |
|---|---|
| `Lint & Format` | ESLint errors + Prettier formatting + `npm audit --audit-level=high` |
| `Test & Coverage` | All Vitest tests pass; line ≥70%, function ≥70%, branch ≥60% |
| `Build` | `npm run build` exits 0 (runs only after Test passes) |

Coverage thresholds are defined in `vite.config.js` (`test.coverage.thresholds`).
A PR comment with a coverage summary is posted automatically by
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

## Agency Agents (4 Installed Divisions)

In addition to the 12 project-specific pipeline agents, 26 general-purpose specialist agents
from **The Agency** (`msitarzewski/agency-agents`) are installed. These are advisory and
operational agents — they inform, plan, validate, and support, but do **not** write code
directly or replace the core pipeline.

To update: `./scripts/install.sh --tool claude-code --division product,project-management,support,testing`

### Division summary

| Division | Mandate | Most useful agents for this project |
|---|---|---|
| **Product** | What to build and when | `product-manager`, `sprint-prioritizer` |
| **Project Management** | How to sequence and track | `senior-project-manager`, `experiment-tracker` |
| **Support** | Operational health | `analytics-reporter`, `infrastructure-maintainer` |
| **Testing** | Quality gates and validation | `reality-checker`, `evidence-collector`, `api-tester`, `performance-benchmarker`, `test-results-analyzer` |

### When to use agency agents

| You need to... | Agent |
|---|---|
| Decide what to build next | `product-manager` |
| Break a feature into sprint tasks | `senior-project-manager` |
| Analyse training data reporting | `analytics-reporter` |
| Check Supabase/Vercel health | `infrastructure-maintainer` |
| Visual QA before pushing | `evidence-collector` → `reality-checker` |
| Interpret coverage report | `test-results-analyzer` |
| Benchmark render/query performance | `performance-benchmarker` |
| Validate Strava/Garmin API calls | `api-tester` |
| Compare library options | `tool-evaluator` |
| Audit accessibility on a new view | `accessibility-auditor` |

### Agency agent relevance map

**Product (5 agents)**

| Agent | Relevance | Use case |
|---|---|---|
| `product-manager` | High | Roadmap ownership and prioritisation decisions |
| `sprint-prioritizer` | High | Choosing which features to tackle next |
| `feedback-synthesizer` | Medium | Synthesising Scott's own feature requests |
| `behavioral-nudge-engine` | Medium | Motivational and engagement features |
| `trend-researcher` | Low | Personal app — market research not needed |

**Project Management (7 agents)**

| Agent | Relevance | Use case |
|---|---|---|
| `senior-project-manager` | High | Breaking features into tasks before `/feature` |
| `experiment-tracker` | Medium | Tracking A/B experiments on features |
| `project-shepherd` | Medium | Tracking in-flight work across work orders |
| `studio-producer` | Low | Solo project — portfolio management not needed |
| `studio-operations` | Low | Solo — team efficiency not applicable |
| `jira-workflow-steward` | Low | No Jira in this project |
| `meeting-notes-specialist` | Low | Solo — no meetings |

**Support (6 agents)**

| Agent | Relevance | Use case |
|---|---|---|
| `analytics-reporter` | High | Training metrics, KPI dashboards, Supabase query reports |
| `infrastructure-maintainer` | High | Supabase + Vercel reliability and performance |
| `executive-summary-generator` | Medium | Sprint progress summaries |
| `support-responder` | Low | Single user — no customer support |
| `finance-tracker` | Low | Not applicable |
| `legal-compliance-checker` | Low | Not applicable |

**Testing (8 agents)**

| Agent | Relevance | Use case |
|---|---|---|
| `evidence-collector` | High | Screenshot-based UI regression QA |
| `reality-checker` | High | Pre-deploy production readiness gate |
| `test-results-analyzer` | High | Interpreting CI coverage reports |
| `performance-benchmarker` | High | Dashboard render times and query latency |
| `api-tester` | High | Validating Strava/Garmin/Supabase API integrations |
| `tool-evaluator` | Medium | Evaluating new libraries or integration options |
| `workflow-optimizer` | Medium | Improving the agent pipeline itself |
| `accessibility-auditor` | Medium | WCAG compliance on new views |

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

## Cowork Change Procedure

Changes made outside the Claude Code factory (Cowork sessions, manual edits,
work-order housekeeping, edge-function updates) follow the same PR workflow:

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
- Coverage thresholds (70% lines/functions, 60% branches) are enforced in CI — new code should include tests
