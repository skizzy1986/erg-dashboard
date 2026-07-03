# The erg-dashboard agent factory

How feature work runs here, adapted from the "software factory with Claude Code" model. The point: stop doing every job in one chat. Each job is a focused agent with its own tools and clean context; humans approve at three gates.

## The five layers
1. **Context** — explore before building (`codebase-researcher` runs first).
2. **Knowledge** — `CLAUDE.md` (durable facts), these agents, and the `.claude/` config.
3. **Agents** — twelve pipeline specialists in `.claude/agents/`, each with least-privilege tools (plus the 232-agent Agency advisory library — see `.claude/AGENTS.md` for the routing map):
   - `codebase-researcher` (Read/Grep/Glob) · `researcher` (+WebSearch/WebFetch) · `story-writer` (Read) · `spec-writer` (Read/Grep/Glob) — read-only
   - `backend-builder`, `frontend-builder`, `feature-builder`, `test-verifier`, `refactor-agent` (Read/Edit/Write/Bash) — write
   - `implementation-validator`, `code-reviewer` (Read/Grep/Glob) — read-only judges
   - `orchestrator` — coordinates the chain
4. **Workflow** — the chain in `.claude/commands/orchestrate.md`, with three human gates.
5. **Delivery** — PR + the validator's verdict + confirm Vercel goes READY.

## How tool access replaces the governance "least-privilege"
The lane/least-privilege idea we hand-rolled (read-only by default, escalate to write) is now **per-agent tool restrictions**: research/story/spec/validate physically cannot write or run commands; only the builders can. That is the gate, enforced by the tool, not by anyone's restraint — and it is finer-grained than a connector-wide read-only toggle.

## Run it
- `/orchestrate <feature idea>` — runs the whole chain with the three approval gates.
- Or invoke an agent directly for a one-off (e.g. ask for `codebase-researcher` before a manual change).
- Start smaller if twelve feels like a lot: researcher → builder → validator is a valid minimal chain.

## Gates (don't skip)
1. After the **story** — right problem?
2. After the **spec** — safe design?
3. After **validation** — ship?

## Notes for this repo
- The app is plain JS/JSX (no TypeScript), Supabase + Vercel; see `CLAUDE.md`.
- Backups exist (daily in-DB + weekly off-site); confirm a fresh snapshot before any destructive migration.
- This supersedes the Drive-file work-order loop and the `work_orders` table for build coordination.
