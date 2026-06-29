# Agent routing — which agent for which job

> The full Agency library (232 agents, 16 divisions) plus 12 erg pipeline agents
> are installed in `.claude/agents/`. This file is the map: pick the right one
> fast instead of scrolling 244 files. Background on the library is in CLAUDE.md
> ("Agency Agents"); the build pipeline is in FACTORY.md.

## Always give Agency agents erg context

Agency agents are generic — they know nothing about rowing, CTL/ATL, or the schema.
Paste this when you invoke one:

> Personal rowing/cycling/strength training dashboard (React 18 + Vite, Supabase,
> Vercel, Capacitor/Android). `sessions` table = all workouts; `vitals` table =
> daily RHR/HRV/sleep/bodyweight. Training-load model is CTL/ATL/TSB. Domain
> detail lives in `.claude/skills/` (training-science, supabase-patterns,
> architecture, testing-patterns).

## First choice: build through the pipeline, not loose agents

For anything that ships code, use the command — it sequences the right pipeline
agents and gates on your approval. Reach for individual Agency agents only for the
advisory/planning work in the table below.

| Command | Use for |
|---|---|
| `/feature <desc>` or `/orchestrate` | New feature or bug fix — full chain: research → spec → build → test → review → PR |
| `/refactor <module>` | One strangler-fig extraction from `erg-dashboard.jsx` |
| `/research <topic>` | Investigate an API/library/concept before building |

Pipeline agents (in `.claude/agents/`, driven by the orchestrator): `researcher`,
`story-writer`, `spec-writer`, `backend-builder`, `frontend-builder`,
`test-verifier`, `implementation-validator`, `code-reviewer`, `refactor-agent`.

## Advisory Agency agents — task → agent

Only four divisions are high-value for a solo dashboard. The rest (game-dev, GIS,
sales, real-estate, …) are noise here.

### Product — what to build next
| Task | Agent |
|---|---|
| Re-rank the backlog, decide what's next | `product-manager` |
| Plan a focused batch / "sprint" of issues | `product-sprint-prioritizer` (Sprint Prioritizer) |
| Turn raw user feedback into priorities | `feedback-synthesizer` |

### Project management — sequencing & tracking
| Task | Agent |
|---|---|
| Track in-flight issues/PRs, flag stalls | `project-management-project-shepherd` (Project Shepherd) |
| Turn a rough idea into well-formed, sequenced issues | `project-manager-senior` |
| Map a multi-step effort into a dependency-ordered plan | `experiment-tracker` / `project-shepherd` |

### Testing — quality & coverage
| Task | Agent |
|---|---|
| Interpret a coverage report, find the weak spots | `testing-test-results-analyzer` (Test Results Analyzer) |
| Validate an API/integration before wiring it in | `api-tester` |
| Audit accessibility of a view | `accessibility-auditor` |
| Performance-profile a slow view or query | `performance-benchmarker` |

### Support — ops & reporting
| Task | Agent |
|---|---|
| Supabase / Vercel health, deploy or runtime issues | `infrastructure-maintainer` |
| Turn dashboard data into a written readout | `analytics-reporter` |
| Optimise a repetitive manual process | `workflow-optimizer` |

## Rule of thumb

Advisory agents **inform, plan, and validate** — they don't write app code. Code
ships only through the pipeline (`/feature`, `/orchestrate`, `/refactor`) and lands
as a PR per WORKFLOW.md. If an Agency agent's output is a recommendation, the next
step is an Issue, not a commit.
