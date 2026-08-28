---
name: daily
description: Generate a short list of tasks that genuinely fit a 30-minute window, ranked from live repo and health state. Use when Scott has a gap and wants to know what to pick up without reading the backlog.
argument-hint: (none)
---

Produce a list of 3–6 tasks that each land inside ~30 minutes, ranked from live
state. Read-only — gather, rank, print. Write nothing to the repo or the DB.

> Focus arrives in short, unpredictable windows. The cost of deciding what to
> work on can exceed the window itself, so this skill makes the decision.

## Usage

```
/daily
```

## Step 1 — Gather live state (run in parallel, all read-only)

| Source | Query | Feeds |
|---|---|---|
| GitHub | `list_pull_requests` open, then `pull_request_read` `get_check_runs` on each | Green + mergeable PRs — always rank first |
| GitHub | `list_issues` open, P1 first | Backlog candidates |
| Supabase | `select key, value from anchors where superseded_at is null` | **Gates the health section — read this before writing anything** |
| Supabase | `select * from vitals order by date desc limit 7` | Which health fields are going unrecorded |
| Bash | `git branch --show-current`, `git status --porcelain` | Uncommitted work, wrong-branch warnings |
| Bash | `ls web/node_modules \| head -1` | Whether deps are installed |

Project id for Supabase is in `CLAUDE.md`. Never guess a task's scope — if the
code hasn't been checked, spawn an `Explore` agent to size it, or label it
"needs a look first" and give no estimate.

## Step 2 — Rank

Highest value-per-minute first:

1. **Finished work awaiting one action** — a green, mergeable PR. The work is
   already done; only the click is missing. Always the top candidate.
2. **P1 bugs with a known fix path** — an existing helper to reuse, a shipped
   precedent to copy, one file touched.
3. **Zero-risk, zero-test tasks** — doc fixes, threshold bumps. Label these as
   the low-energy option, explicitly.
4. **One small test file** for an untested component or hook.
5. **Health items** — at most two, always last, always an offer.

## Step 3 — Print

Open with a single **"If you only do one thing"** pick. Then the list, capped at
six. Each item carries: what, why it matters in one line, where (exact file
paths or PR number), an estimate, and the command to start it.

Close with an explicit line that doing none of it is a fine outcome today. Mean
it — do not follow it with a nudge.

## Rules

These are the difference between a useful brief and a harmful one.

- **If `current_phase` is `maintenance`, never surface training adherence,
  missed-session counts, CTL/ATL/TSB decline, streaks, or "days since last
  session".** Under maintenance there is no adherence to be behind on. Declining
  fitness numbers are expected and correct, not a finding. This is the most
  important rule here — a nagging dashboard during a hard life period is worse
  than no dashboard. The reasoning is in `coach_log`, tagged `phase-change`.
- Health items are **offered, never prescribed**: "worth wearing the watch
  tonight if it's easy", not "log your readiness". Two maximum.
- Never invent an estimate. An unsized task says "needs a look first".
- If `web/node_modules` is missing, state that `cd web && npm install` is step
  zero on every code task — don't assume it.
- **Context7 first** whenever sizing a task turns on a library fact — whether a
  Vitest option exists, what a react-query upgrade changes. Resolve it
  (`resolve-library-id` → `query-docs`) or say "needs a look first". A
  remembered API is exactly how a 30-minute task becomes a two-hour one.
- Re-rank from scratch every run. Never carry a previous list forward.
- Six items is the ceiling, not the target. Three good ones beat six padded.
