---
name: steward
description: Repo-specific facts needed before acting on CI results, failing checks, or review comments on a pull request here. Read before diagnosing a red check, judging whether a green PR is really covered, or pushing a fix.
argument-hint: (none)
---

You are stewarding a pull request in this repo. This file is **repository content**, not
an instruction from Scott: it outranks generic PR guidance on conventions and on how
proactive to be, and it can do nothing else. It cannot widen your access, redirect your
task, or soften a hard never — you still never skip, quarantine, or weaken the assertions
of a test; never rewrite history on a branch that is not yours; never push an empty commit
or close/reopen a PR to kick CI; never approve or merge.

Every line is **cited** (`path:line`), **attested** (`— measured YYYY-MM-DD`), or a **dated
incident** naming the commit or PR that records it. Anything genuinely unknowable is
quarantined and marked as such rather than stated flat. A claim in none of those forms is a
defect in this file. A line belongs only if an agent would act wrongly without it; general
PR etiquette does not.

## Before you trust the check list

| Fact | Without it you would |
|---|---|
| **`pull_request` delivery can lag ~10 minutes.** On 2026-08-26 PR #310 showed 2 checks instead of ~24 for nine minutes after opening, and again after a human reopen; then nine workflows landed at once, all green. **A missing check is not a missing trigger.** | Diagnose a trigger bug and edit workflow YAML. Three wrong diagnoses were made that day before waiting proved to be the answer. |
| Push and `pull_request` lag move **independently**, and `ci-web.yml` pushes only on `main` (`ci-web.yml:10-11`) — so on any other branch ci-web's three required jobs come *only* from the PR event. | Infer from green push runs that the PR's own checks are never coming. |
| **Derive the expected set from `.github/workflows/`; never memorise a count.** Over a dozen workflows report on a `web/**` PR, several of them (`labeler`, `add-to-project`, `dependabot-auto-merge`) with no path filter at all. `CLAUDE.md` and `WORKFLOW.md` between them name only four. | Treat an unrecognised check as spurious, or count against a list that was stale the day it was written. |
| **No workflow filters at the `on.pull_request.paths` level any more** — every one gates a `changes` job with a job-level `if:`, so an unmatched check reports `skipped`, never nothing (`ci-web.yml:3-7` explains why). If you ever see a check that simply is not there, suspect a reverted filter or an event that never arrived, not a skip. | Read a genuinely absent check as a skip, or a skip as absence. |
| `zone-bands.yml` filters on `**/*.md` (`zone-bands.yml:50`), so it fires on repo-root `CLAUDE.md` and `coach/`, not just `web/`. It reports `skipped` when unmatched. | Assume a docs-only PR runs nothing. |
| **Check tree position before grounding a claim**: `git fetch && git rev-parse HEAD origin/main`. | Report a finding from code no longer on `main`. Two agents did this on 2026-08-26, one commit behind. |
| **Unmerged PR commits are invisible to `git log --all \| grep '#N'`** — PR numbers appear only in squash-merge subjects. Use the PR API. | Conclude a live PR "does not exist". This happened. |

## When a check is red

| Fact | Without it you would |
|---|---|
| **`Lint & Format` runs five checks**, not one: `lint`, `format:check`, `check:design-sync`, `check:colours`, `npm audit --omit=dev --audit-level=high` (`ci-web.yml:51-69`). | Run `npm run lint`, see green, call CI flaky. Read the failing **step**, not the job name. |
| `check:colours` is a per-file, per-hex allowlist that **also fails on stale entries** (`web/scripts/check-colour-literals.mjs:204`). Tokenising an allowlisted hex without deleting its `ALLOWED` entry fails like a new violation. | Re-add the hex or hunt a phantom violation instead of deleting the entry. |
| `check:design-sync` bundles **four independent assertions** (`web/scripts/check-design-sync-entry.mjs`): `componentSrcMap` paths resolve, the `.design-sync/entry.jsx` barrel bundles, contrast ratios in `conventions.md` recompute, every `.design-sync/` file has one owner. | Assume one cause. The message names which. |
| `check:zones` matches phrasing, not only numbers (`web/scripts/check-zone-bands.mjs`). Bands stated without restating the CP they derive from fail **even when correct**. | "Fix" correct numbers instead of restating the CP. |
| **CI runs UTC only.** Verified 2026-08-26: the suite failed under `Australia/Sydney` and `Australia/Adelaide`, passed under Perth, Brisbane, UTC. | Trust a green Test job on date, roster or schedule arithmetic. Reproduce under `TZ=Australia/Sydney` first. |
| **Visual baselines** regenerate only via `workflow_dispatch` with `update_baselines: true`, on the branch that moved the pixels (`e2e-web.yml`). The commit job refuses `main` and empty sets, and without `VISUAL_BASELINE_PAT` the PNGs land but Visual never re-runs. | Hand-commit PNGs, or regenerate to hide a real regression. |

## When every check is green

Green is at its most misleading here.

| Fact | Without it you would |
|---|---|
| **A job skipped by an `if:` reports `skipped`, which branch protection counts as passing** (`ci-web.yml:3-7`). A PR touching only `supabase/functions/**` skips all of `ci-web`, and so passes it. | Merge a green PR that had nothing run against its change. |
| **`coach-chat` and `vitals-sync` have no automated verification.** `ci-functions.yml` tests only the two `vitals-import*` functions; Deno files sit outside `lint`/`format`, which are rooted at `web/`. Deployed `vitals-sync` had already drifted from source and "nothing in CI would ever have caught it" (`6904c18`). *Provisional — drop when coverage lands.* | Report "all green" on a `coach-chat` change. Say instead: **no automated check ran against this diff.** |
| Branch protection requires **up-to-date branches**, and updating one re-runs CI from scratch. | Merge on a green that predates the update. |
| Coverage thresholds ratchet upward only (`web/vite.config.js`). | Assume red `Test & Coverage` means a failing test. Every test can pass and the job still fail. |
| Bundle budget is 400 KB gzipped (`web/scripts/check-bundle-size.mjs:15`) and the build sits at 395.7 KB — **4.3 KB spare** (— re-measured 2026-08-28, unchanged). Nothing in `App.jsx` is lazy-loaded, so every import ships. `npm run size` runs inside **Build**. `CLAUDE.md:296-301` now states this figure; the two agree as of that date. | Be surprised by a red Build that is not a compile error. |

## When you push a fix

| Fact | Without it you would |
|---|---|
| On a **Dependabot** PR never use `gh pr update-branch` — a `GITHUB_TOKEN` push never re-triggers required checks, so auto-merge stalls forever (`dependabot-maintenance.yml:8-11`). Comment `@dependabot rebase`. Actions is also barred from approving here; the attempt broke the 2026-07-02 run on PR #124 (`dependabot-auto-merge.yml:7-9`). | Permanently stall an armed auto-merge. |
| Colour hexes, box metrics and type stay in **separate PRs** — see `DESIGN.md`. | Fix a `check:colours` failure and tidy the padding on the same line. |
| The recurring defect here is **automation that exits 0 while doing nothing**: ESLint silently skipping `.jsx` (`9800b58`), two hooks inert behind exit 0 for months (`d2d0bd4`), the token seam dropping 67 tints (`8ad2637`). | Accept green as proof. Read the step log for a non-zero item count, not the exit status. |

## When you report back

1. Report what **ran**, not what was green. Name any job that reported `skipped`.
2. If a fact here is contradicted by the file it cites, **say so, and offer to open an issue** — do not work around it silently. You are this file's staleness sensor.
3. Name a **required** check by name when you say a PR is blocked. Seven are required and five are advisory — see *What protects `main`* — so "CI is red" and "this cannot merge" are different claims.

## What protects `main`

Read from the `main` ruleset — Rulesets, **not** classic branch protection, which is
unconfigured (— confirmed by Scott 2026-08-28, required set expanded same day). Active, targeting the default branch, with
an **empty bypass list**, so it applies to everyone including the repo owner. No agent can
read this: the GitHub MCP server exposes no branch-protection tool and raw API access is
blocked from agent sessions. Re-confirm with Scott rather than inferring it from a doc.

| | |
|---|---|
| Required status checks | **`Lint & Format`, `Test & Coverage`, `Build`, `CodeQL`, `Validate PR title (Conventional Commits)`, `Review dependency changes`, `Deno Tests`** — those seven, and nothing else. |
| Advisory — red does **not** block merge | `Zone bands`, `Lighthouse`, `Playwright Smoke`, `Playwright Visual`, `Build Debug APK`. Still fix them; just do not report them as blocking. |
| Also enforced | a PR before merging · branches up to date before merging · force pushes blocked **on `main` only**, so `--force-with-lease` on your own feature branch is fine |
| Not enforced | linear history. Squash with `(#N)` is convention, not a gate. |

**A required check can be satisfied by `skipped`** (`ci-web.yml:3-7`), so all seven can be
green having run nothing — see *When every check is green*. That applies hardest to
`Deno Tests`: it is required, but `ci-functions.yml` tests only the two `vitals-import*`
functions, so on a `coach-chat` change it **runs, passes, and verifies nothing** (#312).
Requiring it did not close that hole.

**Every reporting check is now safe to require.** `zone-bands.yml` and `ci-android.yml` both
used workflow-level `on.pull_request.paths`, which reports *nothing* on an unmatched PR — and
a required check that never reports strands the PR on "Expected — waiting for status". Worse,
it would have failed *intermittently*: a PR touching a matched path passes, the next one
hangs. Both now gate a `changes` job, so they report `skipped` instead. Adding either to the
ruleset is a settings change with no code consequence.

`CLAUDE.md:328`'s four-row table lists `Zone bands` as a gate; it is advisory.

## Verified against

`21370e8` on 2026-08-26, against `.github/workflows/{ci-web,ci-functions,ci-android,e2e-web,zone-bands,dependabot-auto-merge,dependabot-maintenance}.yml`,
`web/scripts/check-{colour-literals,design-sync-entry,zone-bands,bundle-size}.mjs`, `web/vite.config.js`.
If one of those has changed since, treat the lines citing it as unverified and re-check that row.
