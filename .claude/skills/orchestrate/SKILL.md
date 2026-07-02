---
name: orchestrate
description: Run the canonical factory chain (research → story → spec → build+test → verify → review+validate → PR) staffed by Agency-library agents, with three human approval gates. Use for any new feature, bug fix, or significant change.
argument-hint: <rough feature idea or bug>
---

Run the canonical factory pipeline for `$ARGUMENTS`. This file is THE single
definition of the pipeline — `/feature` is an alias for it.

## You are the orchestrator

You (the main conversation) drive the chain — there is no orchestrator agent.
You route work to Agency-library subagents; you do not do their jobs yourself.
Reads run in parallel, writes run in sequence. STOP at each human approval gate
and wait for Scott.

## Spawn protocol (every stage)

1. Read `.claude/skills/erg-context.md` and prepend its FULL contents to the
   subagent prompt — Agency agents are generic; this block makes them erg-aware.
2. Append the stage addendum below, then the task itself.
3. Pin the stage model via the Agent tool's per-call `model` parameter.
4. For READ-ONLY stages: run `git status --short` before and after the spawn.
   Any new diff is a stage failure — report and stop.

## Routing — classify the request first

| Type | Signal | Path |
|---|---|---|
| New feature | "Add X", "Build Y" | Full chain (all stages) |
| Bug fix | "It's broken", "Fix X" | Skip Story — Research → Spec → Build → … |
| Refactor | "Extract X", "decompose" | Use `/refactor` instead |
| Research only | "How would we…", "Investigate" | Use `/research` instead |

State your classification to Scott before starting. If unclear, ask one
focused question.

## The chain

1. **Research (codebase)** — spawn `Codebase Onboarding Engineer` (model: sonnet, READ-ONLY).
   Task: map the relevant files and functions, existing patterns to follow, the
   Supabase data surface involved, and risks/gotchas. Cite exact paths and line
   numbers. Do not propose a solution — that is the Spec stage's job.

2. **Story** — spawn `Product Manager` (model: sonnet, READ-ONLY).
   Task: one-screen user story — "As Scott, I want <capability>, so that
   <value>"; numbered, testable acceptance criteria; edge cases (empty/null
   data, RLS/auth, `MM/DD/YY` dates, slow network); an explicit out-of-scope
   list. Do not design the solution.

   → **GATE 1 (Scott): right problem? criteria correct?** Wait for approval or edits.

3. **Spec** — spawn `Workflow Architect` (model: opus, READ-ONLY).
   Task: turn the approved story + research into a build-ready technical brief:
   exact file paths per architecture layer, data changes (tables, columns,
   hooks, constants), component props (explicit even without TypeScript), and
   an explicit scope boundary. No implementation code.

   → **GATE 2 (Scott): design safe? red flags?** No code is written before approval.

4. **Build + tests** — spawn `Backend Architect` and/or `Frontend Developer`
   (model: opus; WRITES). Sequence backend → frontend when dependent; run
   concurrently only if they touch different files. Both builders MUST ship a
   Vitest/RTL test per acceptance criterion in the same change — there is no
   separate test-writing stage.
   - *Backend addendum:* migrations are additive and reversible — any
     destructive change requires a fresh `backup_snapshots` row + Scott's
     approval (stop and ask). RLS stays on; never `BYPASSRLS`. Ingestion is
     idempotent upsert on a natural key. Edge functions are Deno under
     `supabase/functions/<name>/` with a pure, separately-testable parser.
     Run the Supabase security/perf advisors after DDL. Patterns:
     `.claude/skills/supabase-patterns.md`. Do not touch frontend.
   - *Frontend addendum:* match inline-style theming, the nav-tab structure,
     `supabaseClient` for data, the single `formatDate` helper. After editing
     any large file, run `npm run build` as a truncation check. Never hardcode
     the user; respect RLS. No new heavy deps unless the spec names them.
     Layer rules: `.claude/skills/architecture.md`. Do not touch backend/migrations.

5. **Test verification** — YOU run `npm test` and the coverage report, then
   spawn `Test Results Analyzer` (model: sonnet, READ-ONLY) with the output and
   the acceptance criteria. Task: interpret the results, flag untested criteria
   and coverage gaps honestly. Conventions: `.claude/skills/testing-patterns.md`.

6. **Review + Validate** — spawn both judges in parallel (READ-ONLY):
   - `Code Reviewer` (model: sonnet): judge the diff — correctness vs the spec,
     layer compliance, security (no hardcoded credentials, RLS considered, no
     unsanitised `dangerouslySetInnerHTML`), style (inline styles, no
     TypeScript, no leftover `console.log`), tests present.
     Verdict: **APPROVE / REQUEST CHANGES** with numbered findings.
   - `Reality Checker` (model: opus): judge built-vs-story/spec. Evidence =
     test output, build logs, git diff — no screenshots required. Findings by
     severity: **Blocker** (violates an acceptance criterion, breaks the build,
     bypasses RLS, risks data loss, commits a secret, introduces TypeScript);
     **Should-fix** (diverges from the spec, misses an edge case, ignores the
     date rule); **Nice-to-have** (style/consistency).
     Verdict: **ship / fix-then-ship / rework**.

   → **GATE 3 (Scott): ship?** Present both verdicts in full. Wait.

7. **Deliver** — you, in the main thread, per `WORKFLOW.md`: create a feature
   branch (`git checkout -b feature/<kebab-slug>`), stage only the relevant
   files, commit with a descriptive message, `git push -u origin <branch>`,
   open a PR with `Closes #N`, and confirm CI gates + the Vercel preview.

Keep a short running summary of where we are in the chain. Never skip a gate.
If a stage fails, report and stop — do not improvise past a gate.

ARGUMENTS: $ARGUMENTS
