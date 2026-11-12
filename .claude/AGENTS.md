# Agent routing — which agent for which job

> The Agency library (232 agents, 16 divisions) is committed, but only the 24
> agents named in this file's tables are loadable — they sit in `.claude/agents/`
> and **staff the factory pipeline** (the 12 project pipeline agents were retired
> 2026-07-02; git history is their archive). The other 208 are parked
> byte-identical in `.claude/agent-library/`, which Claude Code does not load
> (#483). Background on the library is in CLAUDE.md ("Agency Agents"); the
> pipeline is defined in `.claude/skills/orchestrate/SKILL.md` and explained in
> FACTORY.md.

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
| `/refactor <module>` | One strangler-fig extraction (App.jsx remainder, ProgramView #77, StrengthLogger #79) |
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

Only five divisions are high-value for a small React/Supabase training app, and only
the agents routed below are loaded. The rest (game-dev, GIS, sales, real-estate, …)
are parked in `.claude/agent-library/`.

### Design — the visual system
Now a real lane; see [`DESIGN.md`](../DESIGN.md). Always prepend
`.claude/skills/erg-context.md` **and** `web/.design-sync/HANDOFF.md`.

| Task | Agent |
|---|---|
| Draft a screen or component against the brief before it is built | `design-ui-designer` |
| IA questions — the mobile nav cut to four destinations, the Today screen, destination count | `design-ux-architect` |
| Review a diff for token or property-boundary violations | `design-brand-guardian` |
| Contrast, labels and focus pass on a view | `testing-accessibility-auditor` |

Deliberately unrouted, and parked in `.claude/agent-library/`: `design-whimsy-injector`,
`design-image-prompt-engineer`, `design-visual-storyteller`,
`design-inclusive-visuals-specialist`, `design-persona-walkthrough`,
`design-ux-researcher`. A single-user training dashboard has no brand, marketing or
persona surface.

### Product — what to build next
| Task | Agent |
|---|---|
| Re-rank the backlog, decide what's next | `product-manager` |
| Plan a focused batch / "sprint" of issues | `product-sprint-prioritizer` (Sprint Prioritizer) |
| Turn raw user feedback into priorities | `product-feedback-synthesizer` |

### Project management — sequencing & tracking
| Task | Agent |
|---|---|
| Track in-flight issues/PRs, flag stalls | `project-management-project-shepherd` (Project Shepherd) |
| Turn a rough idea into well-formed, sequenced issues | `project-manager-senior` |
| Map a multi-step effort into a dependency-ordered plan | `project-management-experiment-tracker` / `project-management-project-shepherd` |

### Testing — quality & coverage
| Task | Agent |
|---|---|
| Interpret a coverage report, find the weak spots | `testing-test-results-analyzer` (Test Results Analyzer) |
| Validate an API/integration before wiring it in | `testing-api-tester` |
| Audit accessibility of a view | `testing-accessibility-auditor` |
| Performance-profile a slow view or query | `testing-performance-benchmarker` |

### Support — ops & reporting
| Task | Agent |
|---|---|
| Supabase / Vercel health, deploy or runtime issues | `support-infrastructure-maintainer` |
| Turn dashboard data into a written readout | `support-analytics-reporter` |
| Optimise a repetitive manual process | `testing-workflow-optimizer` |

## Re-promoting a parked agent

`git mv .claude/agent-library/<file>.md .claude/agents/`, add a row for it above, update the 24/208 counts (here, `CLAUDE.md`, `FACTORY.md`), and land it as a PR. Every loadable agent's description is paid on every request — promote for a recurring job, not a one-off.

## Rule of thumb

Agency agents both **advise and build** — but code ships only through the gated
pipeline (`/feature`, `/orchestrate`, `/refactor`) and lands as a PR per
WORKFLOW.md, never as a direct commit from a loose agent. If an agent invoked
outside the pipeline produces a recommendation, the next step is an Issue, not
a commit.
