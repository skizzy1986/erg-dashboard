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

### Ideas that start in Discussions

Ideas and prototypes arrive in [Discussions](https://github.com/skizzy1986/erg-dashboard/discussions),
not as issues. One worth building is **promoted**: it becomes an issue here, and the thread
is told so. The loop closes itself when the work ships.

1. **Promote.** Write the issue as usual, titled as an outcome ("When this ships, a user
   can…") with acceptance criteria, and put this line on its own in the body:

   ```
   Discussion: https://github.com/skizzy1986/erg-dashboard/discussions/<n>
   ```

   `Discussion: #<n>` works too. Then reply on the thread with the issue link. The weekly
   *SplitIQ Discussion drafts* task drafts both and does them on Scott's `promote` reply.
2. **Build.** Branch, PR and merge as below. The PR closes the issue the normal way
   (`Closes #<issue>`). A PR with no issue can carry the `Discussion:` line itself.
3. **Ship.** When that PR merges into `main`, `.github/workflows/discussion-shipped.yml`
   replies on the thread: "Shipped: #PR closed #issue…". Nobody has to remember to.

That reply is the **one** Discussions write that posts without Scott approving the text. It
is a fixed template whose only variables are the PR and issue numbers. Everything else
written to Discussions goes through `post-discussion.yml` on his say-so
(see [`docs/CLOUD_ENVIRONMENT.md`](docs/CLOUD_ENVIRONMENT.md)).

Only a line that *starts* with `Discussion:` counts. Linking a thread anywhere else in an
issue or PR is a reference and triggers nothing. To re-send a missed reply, or to see what
a merged PR would post, dispatch `discussion-shipped.yml` with `pr=<number>`, adding
`dry_run=true` for the second.

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
| **Test & Coverage** | Vitest passes; coverage meets the ratcheting thresholds in `web/vite.config.js` |
| **Build** | `npm run build` exits 0 (runs after Test) |

Plus a fourth check that runs only when edge functions change
(`.github/workflows/ci-functions.yml`):

| Gate | Checks |
|---|---|
| **Deno Tests** | `supabase/functions/*/test.ts` pass (parser, mapper, cron guard) |

`main` is protected: no direct pushes, branch must be up to date, all checks
green. A coverage comment posts automatically. The coverage numbers live in
**one place only** — `web/vite.config.js` (`test.coverage.thresholds`). Do not
mirror them into docs; they ratchet upward with every extraction and mirrored
copies drift.

### Sentry in CI (reporting, not gating)

Two Sentry surfaces observe PRs without blocking them:

- **Test Analytics** — the Test job uploads Vitest's JUnit XML via
  `getsentry/prevent-action`, giving flaky-test detection and per-test failure
  history. `fail_ci_if_error: false` on purpose: it is a reporting sink, and a
  Prevent outage must never fail a PR whose tests actually passed.
- **Seer Code Review** — enabled in the Sentry UI (not in this repo), it
  reviews PR diffs for defects likely to reach production and posts a status
  check. Comment `@sentry review` on a PR to request one on demand.

Neither replaces the four gates above. A red Sentry signal is information;
the gates are the contract.

## 5. Merge and clean up

- **Squash-merge** to keep `main` history linear and one-commit-per-issue.
- Delete the branch.
- The linked issue closes itself via `Closes #N`; the Projects board moves it to
  Done.

---

## The design lane

Design work rides the same rail as everything else — Issue → branch → PR → CI → `main`,
labelled `design` (and `a11y` where relevant), on the Split IQ board. Two extra rules:

- **A PR that changes what the app looks like carries visual evidence** — a screenshot or
  a baseline diff, reviewed in the PR.
- **Stay on one side of the property boundary.** Colour hexes belong to #183,
  `padding`/`margin`/`gap`/`borderRadius` to S6, and the `font*`/`letterSpacing`/
  `lineHeight` family to S-1. The three sets are disjoint so the workstreams can run in
  parallel without colliding in the same line. Check your own diff; this is a judgement,
  not a CI gate.

The documents, and which one wins, are in **[`DESIGN.md`](DESIGN.md)**. Re-syncing the
claude.ai/design project is an owner action — it needs an interactive `/design-login` and
cannot be done from a remote agent session.

## The status board — "Split IQ" (GitHub Projects)

The **Split IQ** board ([projects/1](https://github.com/users/skizzy1986/projects/1)) is
the at-a-glance answer to "what's happening." All work is directed through it. Columns:

```
Backlog  →  Ready  →  In progress  →  In review  →  Done
```

| Move | How |
|---|---|
| New issue/PR → **Backlog** | Automatic: *Auto-add to project* + *Item added to project* |
| Reopened → **Backlog** | Automatic: *Item reopened* |
| **Backlog → Ready** | **By hand**: triaged and worth doing next |
| **Ready → In progress** | **By hand**: when you cut the branch |
| Issue → **In review** | Automatic: *Pull request linked to issue* — fires on `Closes #N` in the PR body (the PR template already carries it; see §3). It moves the linked **issue**; the PR's own card stays in Backlog until it merges |
| → **Done** | Automatic: *Item closed* + *Pull request merged* |

GitHub has no trigger for "triaged" or "branch created", so those two moves stay manual.
Cloud sessions read the board and make the two manual moves through
`.github/workflows/project-board.yml` — see [`docs/CLOUD_ENVIRONMENT.md`](docs/CLOUD_ENVIRONMENT.md).

### Roadmap fields (added 2026-11-07)

Four custom fields carry the product roadmap ([`docs/ROADMAP.md`](docs/ROADMAP.md), epic
#432) onto the board, so a **Roadmap** layout can draw it:

| Field | Type | Values | Meaning |
|---|---|---|---|
| **Horizon** | single select | `H0 Foundations` · `H1 Squat` · `H2 Movements` · `H3 Coach surfaces` · `Maintenance` | Which roadmap horizon the item belongs to; `Maintenance` is everything that is not roadmap work |
| **Size** | single select | `S` · `M` · `L` | ≤ half a day · ≈ a day · 2+ days, the roadmap's own scale |
| **Start** / **Target** | date | `YYYY-MM-DD` | The **horizon's planning window**, not a per-item commitment: H0 2026-11-07 → 2026-12-19, H1 2026-11-21 → 2027-02-28. Later horizons get dates when they are approved. |

`project-board.yml` grew two actions for them. `fields` creates any of the four that is
missing (idempotent). `set` takes one line per item and sets any field by name, Status
included, in a single run — which matters because **the concurrency group keeps only one
pending run**, so several dispatches queued at once cancel all but the last:

```
433|Horizon=H0 Foundations|Size=S|Start=2026-11-07|Target=2026-12-19|Status=Ready
```

`list` now prints the four columns beside Status.

### Views worth having (owner clicks; views cannot be created through the API)

1. **Board** by Status — the existing view; the day-to-day answer to "what's happening".
2. **Roadmap** — layout *Roadmap*, date fields *Start → Target*, group by **Horizon**,
   markers on *Target*. Filter `-horizon:Maintenance` so only roadmap work draws.
3. **Epic tree** — layout *Table*, group by **Parent issue**, columns Status · Horizon ·
   Size · Target. Sub-issues of #412 and #432 fall into their epics automatically.
4. **Now** — layout *Board*, filter `status:Ready,"In progress","In review"`, group by
   Status, sorted by Horizon. The short list for a 30-minute gap.

The built-in *Auto-add sub-issues* workflow (on) means a new sub-issue of an epic lands
on the board with its parent set; give it a Horizon and Size with `set` and it appears in
every view above.

> **Built-in workflows (configured 2026-11-05, *Project → ⋯ → Workflows*).**
> **On:** Auto-add to project (repo `erg-dashboard`, filter `is:issue,pr is:open`) ·
> Item added to project (issues + PRs → Backlog) · Item reopened (→ Backlog) ·
> Pull request linked to issue (→ In review) · Item closed (→ Done) ·
> Pull request merged (→ Done) · Auto-close issue (default) · Auto-add sub-issues (default).
> **Off:** Auto-archive items · Code changes requested · Code review approved.

> **Committed auto-add fallback.** `.github/workflows/add-to-project.yml` adds new
> issues/PRs to Split IQ from CI as a belt-and-suspenders layer behind the built-in
> auto-add rule. It stays a **no-op until** you add the `ADD_TO_PROJECT_PAT` secret,
> because the default `GITHUB_TOKEN` can't write to a user-owned project. To enable:
> create a **classic PAT** with `project`, `read:org` and `read:discussion` (the last two
> are what `project-board.yml`'s `gh project` calls need; see
> [`docs/CLOUD_ENVIRONMENT.md`](docs/CLOUD_ENVIRONMENT.md)), add it as repo secret **`ADD_TO_PROJECT_PAT`**, then set the board's
> project number in `project-url` inside that workflow.

---

## How this composes with the software factory

The `.claude/` factory pipeline (`/feature`, `/orchestrate`, `/refactor`,
`/research` — defined in `.claude/skills/orchestrate/SKILL.md`, explained in
`FACTORY.md`, staffed by the Agency agent library) is **how a single issue gets
built**, not a competing tracker. It already ends in *PR → CI → merge*, so it
slots straight into this rail:

```
Issue ──▶ /feature or /orchestrate ──▶ research → story → spec → build+test
      │                                        → verify → review+validate
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

## Database migrations

- **Merged is not done.** A migration PR is done only when the migration is
  applied to production, read back, recorded in
  `supabase/migrations/manifest.json`, and the read-back is pasted in the PR body.
  #429 is what happens otherwise: a merged migration sat unapplied and nothing
  noticed.
- **Apply** with the Supabase MCP `apply_migration` tool, `name` exactly the file
  stem (`014_revoke_default_function_execute`, not a paraphrase), in Plan mode
  (see `docs/CLOUD_ENVIRONMENT.md`). Scott approves every apply. Rollback files are
  never applied automatically.
- **Order.** After Gate 3 approval and green CI: apply from the final reviewed SQL,
  flip the manifest entry to `applied` with the version `list_migrations` reports,
  push, paste the read-back, merge. If the PR must merge first, the entry lands as
  `pending`, and the nightly drift check flags it until a follow-up PR flips it.
- **Read-back contents:** the `list_migrations` row; a `SELECT` proving the change
  took; the security advisor summary; the role the apply ran as
  (`select current_user`).
- **Naming and rollback.** `NNN_snake_case.sql` with the next free number, and
  `NNN_…_rollback.sql` alongside it (enforced from 014 on).
- **Two guards.** `Migrations manifest is consistent` runs on every PR that touches
  migrations; it has no DB access, so it checks the manifest against the files only.
  The nightly drift check (`docs/routines/migration-drift-check.md`) compares the
  manifest with production and opens the issue titled
  `chore(db): production migrations drifted from supabase/migrations/manifest.json`.
  Fix drift by applying the migration or correcting the manifest — never by
  weakening the check.

Unlike the `doctrine_sha` Routine, this scheduled task's prompt is committed.

## Project-management agents

The Agency agent library is installed (see `.claude/agents/`). The most useful
for running this workflow:
- **`product-manager`** / **`product-sprint-prioritizer`** — decide what's next,
  re-rank the backlog.
- **`project-management-project-shepherd`** — track in-flight issues/PRs and flag
  stalls.
- **`senior` project manager** (`project-manager-senior`) — turn a rough idea
  into well-formed, sequenced issues.

These are generic — always prepend `.claude/skills/erg-context.md` (the
canonical spawn preamble) when invoking them. Deeper domain knowledge lives in
`.claude/skills/`.

---

*Supersedes `coach/work-orders/WORK_ORDERS.md`. Adopted 2026-06-29.*
