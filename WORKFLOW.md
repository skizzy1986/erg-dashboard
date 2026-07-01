# WORKFLOW — how work flows through erg-dashboard

> The single, standing process for planning and shipping changes. It replaces
> the `coach/work-orders/` system (now deprecated). If you're new here, read this
> top to bottom once — it's short on purpose.

## The one rule

**Every change is a GitHub Issue → a branch → a Pull Request → CI → `main`.**

No work happens off this rail. The backlog lives in GitHub Issues, status lives
on a GitHub Projects board, and `main` is always releasable because branch
protection won't let anything in without green CI.

```
Idea ──▶ Issue ──▶ branch ──▶ commits ──▶ PR ──▶ CI gates ──▶ squash-merge ──▶ main
        (backlog)  (1 per     (small,     (Closes  (lint /     (delete
                    issue)     focused)     #N)     test /      branch)
                                                    build)
```

## 1. Backlog = GitHub Issues

Anything you might do becomes an Issue. Don't keep work in your head or in
scattered markdown files — if it's worth doing, it's worth one issue.

A good issue has:
- A clear, outcome-shaped **title** ("Deploy Google Health API vitals import",
  not "health stuff").
- A short **body**: what + why, and a checklist of acceptance criteria.
- **Labels** for priority and area (below).
- A **milestone** if it belongs to a themed batch of work.

### Labels
| Label | Meaning |
|---|---|
| `P0` | Do now — blocks other work or keeps the system honest |
| `P1` | Next — the most valuable in-flight feature or foundation |
| `P2` | Later — quality, or large new bets, sequenced after the foundation |
| area labels | `refactor`, `integration`, `testing`, `docs`, `infra`, … |

Priority is **relative and re-sorted often** — it's a stack rank, not a promise.

## 2. One branch per issue

Cut every branch from a freshly-fetched `origin/main`:

```bash
git fetch origin && git checkout -b <type>/<short-slug> origin/main
```

Branch **types**: `feature/`  `fix/`  `refactor/`  `housekeeping/`  `config/`.
Keep branches short-lived and **rebase** (never merge) to stay current:

```bash
git fetch origin && git rebase origin/main
git push --force-with-lease origin <branch>   # safe force — never plain --force
```

One issue per branch keeps PRs small and reviewable. If a branch starts solving
two issues, split it.

## 3. Commit, then open a PR

- Small, focused commits; the pre-commit hook auto-formats staged JS/JSX.
- Open the PR early (draft is fine). Fill in the PR template
  (`.github/PULL_REQUEST_TEMPLATE.md`).
- **Link the issue** in the PR body with a closing keyword so merging
  auto-closes it:

  ```
  Closes #42
  ```

## 4. CI gates (must be green to merge)

Three required checks on every PR (`.github/workflows/ci-web.yml`):

| Gate | Checks |
|---|---|
| **Lint & Format** | ESLint + Prettier + `npm audit --audit-level=high` |
| **Test & Coverage** | Vitest passes; line ≥50%, function ≥30%, branch ≥35% |
| **Build** | `npm run build` exits 0 (runs after Test) |

`main` is protected: no direct pushes, branch must be up to date, all checks
green. A coverage comment posts automatically. The coverage numbers are the
source of truth in `web/vite.config.js` (`test.coverage.thresholds`) — update
them there, then mirror here.

## 5. Merge and clean up

- **Squash-merge** to keep `main` history linear and one-commit-per-issue.
- Delete the branch.
- The linked issue closes itself via `Closes #N`; the Projects board moves it to
  Done.

---

## The status board — "Split IQ" (GitHub Projects)

The **Split IQ** board is the at-a-glance answer to "what's happening." All work is
directed through it. Columns:

```
Todo  →  In-progress  →  In-review  →  Done
```

Issues enter in **Todo**, move to **In-progress** when you start a branch, to
**In-review** when the PR opens, and to **Done** on merge.

> **Board automation (one-time UI setup).** The board itself ("Split IQ") already
> exists. GitHub Projects boards and their built-in workflows can't be configured by
> repo automation, so turn these on once in the UI — *Project → ⋯ → **Workflows*** —
> so items flow without manual dragging:
> 1. **Auto-add to project** → filter `is:issue is:open` (and a second rule for
>    `is:pr is:open`) → sets **Status = Todo**. This pulls every new issue/PR in.
> 2. **Item reopened / added** → **Status = Todo**.
> 3. **Pull request merged** and **Item closed** → **Status = Done**.
>    (Pair with `Closes #N` in the PR body — see §3 — so a merge closes the issue and
>    moves it to Done in one step.)
> 4. Move to **In-progress** / **In-review** by hand when you start a branch / open a
>    PR (Projects has no native "branch created" trigger).

> **Committed auto-add fallback.** `.github/workflows/add-to-project.yml` adds new
> issues/PRs to Split IQ from CI as a belt-and-suspenders layer behind the built-in
> auto-add rule. It stays a **no-op until** you add the `ADD_TO_PROJECT_PAT` secret,
> because the default `GITHUB_TOKEN` can't write to a user-owned project. To enable:
> create a **classic PAT** with `project` + `repo` scope (or a fine-grained PAT with
> project write), add it as repo secret **`ADD_TO_PROJECT_PAT`**, then set the board's
> project number in `project-url` inside that workflow.

---

## How this composes with the software factory

The `.claude/` agent pipeline (`/feature`, `/orchestrate`, `/refactor`,
`/research` — see `FACTORY.md`) is **how a single issue gets built**, not a
competing tracker. It already ends in *PR → CI → merge*, so it slots straight
into this rail:

```
Issue ──▶ /feature or /orchestrate ──▶ research → spec → build → test → review
      └─────────────────────────────────────────────────▶ PR (Closes #issue)
```

Pick an issue, run the pipeline (or hand-build for small changes), and the output
is a PR linked back to the issue. Same rail, every time.

## Doctrine SHA

The `doctrine_sha` anchor (Supabase `anchors` table) pins the canonical commit of
the doctrine docs — `CLAUDE.md` + `.claude/skills/training-science.md` — so Code
and Coach agree which doctrine version is live. **When you change either doc, the
anchor must be superseded to the new `main` commit.** That update is a DB write in
Coach's content lane (Scott authorises), not a git change.

You don't have to remember: the **Doctrine SHA guard**
(`.github/workflows/doctrine-sha-guard.yml`) fires whenever those docs land on
`main` and opens/updates a single tracking issue carrying the new SHA. Close the
issue once Coach has superseded the anchor.

## Project-management agents

The Agency agent library is installed (see `.claude/agents/`). The most useful
for running this workflow:
- **`product-manager`** / **`product-sprint-prioritizer`** — decide what's next,
  re-rank the backlog.
- **`project-management-project-shepherd`** — track in-flight issues/PRs and flag
  stalls.
- **`senior` project manager** (`project-manager-senior`) — turn a rough idea
  into well-formed, sequenced issues.

These are generic — always give them erg context (React + Supabase; `sessions` /
`vitals` tables; CTL/ATL training-load model). Domain knowledge lives in
`.claude/skills/`.

---

*Supersedes `coach/work-orders/WORK_ORDERS.md`. Adopted 2026-06-29.*
