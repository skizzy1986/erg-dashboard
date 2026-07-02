# Agent routing — which agent for which job

> The full Agency library (232 agents, 16 divisions) is installed in
> `.claude/agents/` and **staffs the factory pipeline** (the 12 project pipeline
> agents were retired 2026-07-02; git history is their archive). This file is
> the map: pick the right agent fast instead of scrolling 232 files. Background
> on the library is in CLAUDE.md ("Agency Agents"); the pipeline is defined in
> `.claude/skills/orchestrate/SKILL.md` and explained in FACTORY.md.

## Always give Agency agents erg context

Agency agents are generic — they know nothing about rowing, CTL/ATL, or the
schema. **Prepend the full contents of `.claude/skills/erg-context.md` to every
spawn.** The pipeline skills do this automatically; do the same when invoking
one directly.

## First choice: build through the pipeline, not loose agents

For anything that ships code, use the command — it sequences the right agents
with the right context and gates on your approval.

| Command | Use for |
|---|---|
| `/feature <desc>` or `/orchestrate` | New feature or bug fix — full chain: research → story → spec → build+test → verify → review+validate → PR |
| `/refactor <module>` | One strangler-fig extraction (erg-dashboard.jsx remainder, ProgramView #77, StrengthLogger #79) |
| `/research <topic>` | Investigate an API/library/concept before building |

### Pipeline roles (stage → Agency agent)

| Stage | Agent |
|---|---|
| Research (codebase) | `Codebase Onboarding Engineer` |
| Story | `Product Manager` |
| Spec | `Workflow Architect` |
| Build + tests | `Backend Architect` / `Frontend Developer` |
| Test verification | `Test Results Analyzer` |
| Review + Validate | `Code Reviewer` + `Reality Checker` |
| Refactor extraction | `Minimal Change Engineer` |
| External research | `Trend Researcher` |

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

Agency agents both **advise and build** — but code ships only through the gated
pipeline (`/feature`, `/orchestrate`, `/refactor`) and lands as a PR per
WORKFLOW.md, never as a direct commit from a loose agent. If an agent invoked
outside the pipeline produces a recommendation, the next step is an Issue, not
a commit.
