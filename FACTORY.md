# The erg-dashboard agent factory

How feature work runs here, adapted from the "software factory with Claude Code"
model. The point: stop doing every job in one chat. Each job is a focused agent
with clean context; humans approve at three gates. As of 2026-07-02 the factory
is **staffed by the Agency agent library** — the 12 project-specific pipeline
agents were retired (git history is their archive; see the migration PR).

## The five layers

1. **Context** — explore before building (`Codebase Onboarding Engineer` runs first).
2. **Knowledge** — `CLAUDE.md` (durable facts), `.claude/skills/erg-context.md`
   (the spawn preamble), and the domain skills (architecture, supabase-patterns,
   testing-patterns, training-science).
3. **Agents** — the 232-agent Agency library in `.claude/agents/`
   (see `.claude/AGENTS.md` for the routing map). Pipeline roles:
   - `Codebase Onboarding Engineer` (research) · `Product Manager` (story) ·
     `Workflow Architect` (spec) — read-only stages
   - `Backend Architect` / `Frontend Developer` (build + tests) ·
     `Minimal Change Engineer` (refactor extractions) — write stages
   - `Test Results Analyzer` (verify) · `Code Reviewer` + `Reality Checker`
     (parallel judges) — read-only stages
   - `Trend Researcher` (/research sidecar)
4. **Workflow** — the chain in `.claude/skills/orchestrate/SKILL.md` (the ONE
   canonical pipeline definition; `/feature` is an alias), with three human gates.
   There is no orchestrator agent — the skill prompt orchestrates from the main
   conversation, which is what lets it stop and wait at each gate.
5. **Delivery** — PR + both judges' verdicts + confirm Vercel goes READY.

## Tool discipline is prompt-level now (know the trade)

The retired project agents enforced least-privilege in frontmatter (`tools:`);
read-only stages physically could not write. Agency library agents inherit all
tools, so the discipline moved to the spawn layer: every read-only stage gets
the READ-ONLY instruction from `erg-context.md`, and the orchestrating skill
runs `git status --short` before and after each read-only spawn — any new diff
is a stage failure. This is enforcement by instruction plus verification, not
by tool restriction; it is a real (accepted, documented) downgrade, backstopped
by the human gates and the PR diff.

Erg-specific behaviour — context, per-stage model pins, persona reframing —
is applied at spawn time by the skills. **Library files are never edited**, so
they stay pristine and re-installable from upstream.

## Run it

- `/orchestrate <feature idea>` (or `/feature <desc>`) — the whole chain with
  three approval gates.
- `/refactor <module>` — one strangler-fig extraction via `Minimal Change Engineer`.
- `/research <topic>` — investigation only, via `Trend Researcher`.
- Or invoke an Agency agent directly for a one-off — always prepend
  `.claude/skills/erg-context.md`.

## Gates (don't skip)

1. After the **story** — right problem?
2. After the **spec** — safe design? No code before this approval.
3. After **review + validation** — ship?

## Notes for this repo

- The app is plain JS/JSX (no TypeScript), Supabase + Vercel; see `CLAUDE.md`.
- Backups exist (daily in-DB + weekly off-site); confirm a fresh snapshot before
  any destructive migration.
- This supersedes the Drive-file work-order loop and the `work_orders` table for
  build coordination.
- If an Agency agent proves a poor fit for a pipeline role, the escape hatch is
  ONE thin project agent for that role, as a documented exception — not a return
  to the 12.
