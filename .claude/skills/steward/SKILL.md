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
| `check:colours` is a per-file, per-hex allowlist that **also fails on stale entries** (`web/scripts/check-colour-literals.mjs:220`). Tokenising an allowlisted hex without deleting its `ALLOWED` entry fails like a new violation. | Re-add the hex or hunt a phantom violation instead of deleting the entry. |
| `check:design-sync` bundles **four independent assertions** (`web/scripts/check-design-sync-entry.mjs`): `componentSrcMap` paths resolve, the `.design-sync/entry.jsx` barrel bundles, contrast ratios in `conventions.md` recompute, every `.design-sync/` file has one owner. | Assume one cause. The message names which. |
| `check:zones` matches phrasing, not only numbers (`web/scripts/check-zone-bands.mjs`). Bands stated without restating the CP they derive from fail **even when correct**. | "Fix" correct numbers instead of restating the CP. |
| **A CANCELLED check-run is not a failure, and `gh pr checks` renders it as `fail`.** Read the run's cancellation reason before diagnosing anything: *"Canceling since a higher priority waiting request for `<group>` exists"* means a concurrency collision, not a broken build. Re-run the cancelled run to clear it. | Debug a green build for as long as it takes to notice nothing failed. This cost real time on PR #329, 2026-08-28. |
| The collision that produced those on #329 is **fixed** (#330). `ci-android.yml` used to push on the `claude/**`/`feature/**`/`fix/**` prefixes as well as `main`, while grouping on `github.head_ref \|\| github.ref_name` (`ci-android.yml:27`) — on a PR from one of those branches the two resolve to the same string, so the `pull_request` run cancelled the `push` run for the same SHA. It now pushes on `main` only (`ci-android.yml:21-24`), like every other workflow here. | Reintroduce it. The bug is the **pair**: a `push` glob over a working-branch prefix plus a concurrency group keyed on `head_ref \|\| ref_name`. Neither alone does it. |
| **CI runs UTC only.** Verified 2026-08-26: the suite failed under `Australia/Sydney` and `Australia/Adelaide`, passed under Perth, Brisbane, UTC. | Trust a green Test job on date, roster or schedule arithmetic. Reproduce under `TZ=Australia/Sydney` first. |
| **Visual baselines** regenerate only via `workflow_dispatch` with `update_baselines: true`, on the branch that moved the pixels (`e2e-web.yml`). The commit job refuses `main` and empty sets, and without `VISUAL_BASELINE_PAT` the PNGs land but Visual never re-runs. | Hand-commit PNGs, or regenerate to hide a real regression. |

## When every check is green

Green is at its most misleading here.

| Fact | Without it you would |
|---|---|
| **A job skipped by an `if:` reports `skipped`, which branch protection counts as passing** (`ci-web.yml:3-7`). A PR touching only `supabase/functions/**` skips all of `ci-web`, and so passes it. | Merge a green PR that had nothing run against its change. |
| **`coach-chat` and `vitals-sync` have no automated verification.** `ci-functions.yml` tests only the two `vitals-import*` functions; Deno files sit outside `lint`/`format`, which are rooted at `web/`. Deployed `vitals-sync` had already drifted from source and "nothing in CI would ever have caught it" (`6904c18`). *Provisional — drop when coverage lands.* | Report "all green" on a `coach-chat` change. Say instead: **no automated check ran against this diff.** |
| **`pipeline/**` is outside CodeQL and every `web/` job.** `.github/codeql/codeql-config.yml` sets `paths-ignore: pipeline/**` (#389): the vendored `squat-anatomy` pipeline is never deployed, its `page/*.js` are HTML fragments, and `pipeline/v3/base.html` is an archived input. Lint, format and Vitest are rooted at `web/`, and the pipeline has no Python CI. Verification is the manual rebuild in `pipeline/squat-anatomy/ARCHIVE.md`. | Read a green CodeQL or CI as covering a `pipeline/` change. Say instead: **no automated check ran against the pipeline diff.** |
| Branch protection requires **up-to-date branches**, and updating one re-runs CI from scratch. | Merge on a green that predates the update. |
| Coverage thresholds ratchet upward only (`web/vite.config.js`). | Assume red `Test & Coverage` means a failing test. Every test can pass and the job still fail. |
| The bundle gate budgets **per product** since the squat tool (#383; `web/scripts/check-bundle-size.mjs:75-100`). Dashboard: **entry** 146.8 KB against 150 KB — main plus `AuthGate`'s static graph (a *boot key*), what a dashboard first paint costs, the tight ratchet — and **total** 385.6 KB against 400 KB, every asset except files only `/squat` reaches. Squat: **squat entry** 116.4 / 117 KB — **0.6 KB spare, the tightest gate in the repo**; the muscle list is statically imported on purpose (it is the canvas's accessible substitute) so it cannot be lazy-loaded out of this number, and raising the 117 is Scott's call, not an agent's — **squat total** 27.6 / 30 KB (3D excluded; the ceiling moved 26 → 30 in PR2b-i from a measured 27.6, because squat total is the loose gate: never precached, `CacheFirst` at runtime, stripped from the APK), **squat 3D** 138.2 / 145 KB (three.js + scene, only through `anatomy/scene/createAnatomyScene.js`), **squat data** 2.20 / 2.30 MB (never precached), and no precached file over Workbox's 2 MiB. Since #385 the size step also fails on four split invariants (3D on a first paint, squat-only JS ≠ `squat-*` files, a precached `assets/squat-` URL, no `index.html` navigation fallback; pure functions in `web/scripts/entry-graph.mjs`) — a red **Build** can be one of those, not a budget (— measured 2026-11-05 on PR2b-i / #401, which moved every squat figure and the squat-total ceiling; 146.6 / 385.4 / 112.7 / 24.0-of-26 on #385; 146.4 / 385.1 / 108.0 / 19.3-of-21 on #383; entry was 134.9 / total 373.5 on 2026-09-03 after #329, and 144.5 on `main` a52987f just before #383 made `AuthGate` lazy). The shells and all fourteen desktop tabs are lazy, so most chunks are not first-paint. `npm run size` runs inside **Build**. Re-measure rather than quoting any doc — figures here have drifted before (#319). | Be surprised by a red Build that is not a compile error, or by a red **squat** row on a dashboard-only PR (a shared chunk the dashboard stopped using moves to SQUAT_TOTAL). |
| **A PR that raises `total` while cutting `entry` is a win, not a regression** — splitting always adds chunk preamble and duplicated shared code. Read the entry row of the bundle comment first; the old single total-bytes gate is exactly what #331 removed for reporting the 66% first-paint cut it measured as a failure — with main then at 399.2 KB of 400 KB, 0.8 KB spare. | Ask a PR to undo a code-split because one number went up. |

## When you push a fix

| Fact | Without it you would |
|---|---|
| On a **Dependabot** PR never use `gh pr update-branch` — a `GITHUB_TOKEN` push never re-triggers required checks, so auto-merge stalls forever (`dependabot-maintenance.yml:8-11`). Comment `@dependabot rebase` — **from an actor with push access**: Dependabot refuses the command from `github-actions[bot]`, which is why `rebase-behind` posts it with the owner's fine-grained PAT, not `GITHUB_TOKEN` (`dependabot-maintenance.yml:13-20`, #351; until then the job had been a no-op). An agent's own `GITHUB_TOKEN` comment will be refused the same way. Actions is also barred from approving here; the attempt broke the 2026-07-02 run on PR #124 (`dependabot-auto-merge.yml:7-9`). | Permanently stall an armed auto-merge. |
| Colour hexes, box metrics and type stay in **separate PRs** — see `DESIGN.md`. | Fix a `check:colours` failure and tidy the padding on the same line. |
| The recurring defect here is **automation that exits 0 while doing nothing**: ESLint silently skipping `.jsx` (`9800b58`), two hooks inert behind exit 0 for months (`d2d0bd4`), the token seam dropping 67 tints (`8ad2637`), and `test-hooks.sh` reporting `7 passed, 0 failed` with exit 0 whenever `web/node_modules/.bin/eslint` is absent, because it skips its two eslint cases rather than failing (`test-hooks.sh:88-101`; measured 2026-11-05 by removing the binary). `hook-smoke-test.yml` greps the log for that skip line so the degradation cannot read as a pass — the count, not the exit status, is the signal. | Accept green as proof. Read the step log for a non-zero item count, not the exit status. |

## When you report back

1. Report what **ran**, not what was green. Name any job that reported `skipped`.
2. If a fact here is contradicted by the file it cites, **say so, and offer to open an issue** — do not work around it silently. You are this file's staleness sensor.
3. Name a **required** check by name when you say a PR is blocked. Ten are required — see *What protects `main`*, and read the ruleset rather than trusting that number — so "CI is red" and "this cannot merge" are different claims. Use the **check-run name**, which is the job's `name:`, not the workflow's: the ruleset binds to `Zone bands match derivePaceZones`, and nothing reports under `Zone bands`.

## What protects `main`

**Read it yourself — do not trust the table below, this file included.**

```bash
gh api repos/skizzy1986/erg-dashboard/rulesets/18063518 \
  --jq '{updated_at, bypass: .bypass_actors, required: [.rules[]
    | select(.type=="required_status_checks")
    | .parameters.required_status_checks[].context]}'
```

Rulesets, **not** classic branch protection: `GET /branches/main/protection` returns 404.
Active, targeting the default branch, `bypass_actors: []`, so it applies to everyone
including the repo owner.

**This section was wrong for three PRs, and the reason it survived is a warning about
the whole file.** It claimed seven required checks (#316), then nine (#321) — each with a
dated attestation citing "the ruleset page as Scott showed it". Neither was ever true: the
ruleset had required exactly `Lint & Format`, `Test & Coverage`, `Build` since 2026-06-24
and had not been edited since. What protected the error was a line *in this file* asserting
that no agent could read the ruleset because raw API access is blocked from agent sessions.
That is false in a local session — the command above works — and it told every agent not to
look, so two concurrent sessions corroborated the assumption instead of the source
(`CLAUDE.md`'s CI table was the only doc that matched reality). The six missing checks plus
`Context7 rule reaches every workflow` were actually added on 2026-08-28 at 12:22 +08:00,
which is when the table below first became true. **When this file tells you a capability is
unavailable, test the capability before believing it: that instruction is itself the thing
most likely to be stale.**

| | |
|---|---|
| Required status checks | **`Lint & Format`, `Test & Coverage`, `Build`, `CodeQL`, `Validate PR title (Conventional Commits)`, `Review dependency changes`, `Deno Tests`, `Zone bands match derivePaceZones`, `Build Debug APK`, `Context7 rule reaches every workflow`** — those ten, and nothing else. `CodeQL` is emitted by the GitHub Advanced Security app and is a **different check-run** from `codeql.yml`'s job `Analyze (JavaScript/TypeScript)`; the ruleset binds the former. |
| Advisory — red does **not** block merge | `Lighthouse`, `Playwright Smoke`, `Playwright Visual`. Still fix them; just do not report them as blocking. |
| Reports but is not required | `Build Web Assets`, `Seer Code Review`, `Vercel Preview Comments`, `Analyze (JavaScript/TypeScript)`, `Label by changed paths`, `add-to-project`, `Flag steward skill staleness`, `Enable auto-merge`, `Hooks pass their smoke test` (`hook-smoke-test.yml`, added 2026-11-05), and every `Detect …` filter job. Red here does not block either — but see the `Build Web Assets` trap below. |
| Also enforced | a PR before merging · branches up to date before merging · force pushes blocked **on `main` only**, so `--force-with-lease` on your own feature branch is fine |
| Not enforced | linear history. Squash with `(#N)` is convention, not a gate. |

**A required check can be satisfied by `skipped`** (`ci-web.yml:3-7`), so all ten can be
green having run nothing — see *When every check is green*. That applies hardest to
`Deno Tests`: it is required, but `ci-functions.yml` tests only the two `vitals-import*`
functions, so on a `coach-chat` change it **runs, passes, and verifies nothing** (#312).
Requiring it did not close that hole.

**`Build Debug APK` is required; the job it depends on is not.** `build-apk` declares
`needs: [changes, build-web]` with a plain `if:` and no `always()` (`ci-android.yml:64-66`),
so when `Build Web Assets` **fails**, `build-apk` does not run and reports `skipped` — which
branch protection counts as passing. Requiring the APK therefore does not require the web
build behind it. The overlap is partial cover, not full: a genuine compile break also fails
`Build` in `ci-web.yml`, which is required, but `Build Web Assets` additionally consumes
`secrets.SUPABASE_URL` / `SUPABASE_ANON_KEY` (`ci-android.yml:55-57`) that `ci-web`'s Build
does not, so a rotated or missing secret fails it alone — and turns the required APK check
green by skipping it. *Reasoned from the workflow and GitHub's `needs` semantics; not yet
observed in this repo. Verify before citing it as the cause of a specific green.* Requiring
`Build Web Assets` too would close it.

Both `zone-bands.yml` and `ci-android.yml` reached requirability the same way: each used
workflow-level `on.pull_request.paths`, which reports *nothing* on an unmatched PR and would
have stranded the PR on "Expected — waiting for status" — intermittently, since a PR touching
a matched path passes and the next one hangs. Both now gate a `changes` job and report
`skipped` instead (#316, #317). Confirmed twice on 2026-08-28: PR #319, a docs-only change,
reported `skipped` for `Build Debug APK` and `Build Web Assets` rather than nothing.

`Context7 rule reaches every workflow` reached requirability the same way, by the same
deliberate choice: it is its own workflow rather than a sixth step in `Lint & Format`,
because `ci-web.yml`'s `changes` job filters on `web/**` (`ci-web.yml:33-36`) and the files
it guards live in `.claude/skills/**` and the repo-root `CLAUDE.md` (#325). Verified running
— not skipping — on that PR.

`CLAUDE.md`'s CI table still opens by saying **three** gated jobs, and lists fewer rows than
the required set; the `Zone bands` row it does carry is now correctly a gate (#311).

## Verified against

`21370e8` on 2026-08-26, against `.github/workflows/{ci-web,ci-functions,ci-android,e2e-web,zone-bands,dependabot-auto-merge,dependabot-maintenance}.yml`,
`web/scripts/check-{colour-literals,design-sync-entry,zone-bands,bundle-size}.mjs`, `web/vite.config.js`.

The bundle-gate row and the `check-colour-literals.mjs` stale-entry cite re-verified on
2026-11-04 against #383, again on 2026-11-04 against #385, and again on **2026-11-05 against
PR2b-i (#401)** — that one is not drift: `MAX_SQUAT_TOTAL_GZIP_KB` itself moved 26 → 30, and
every squat figure in the row was re-measured from that PR's own `npm run size`
(`check-bundle-size.mjs:78-106`, `check-colour-literals.mjs:220`).

*What protects `main`* re-verified on 2026-08-28 at `6ac5188`, against `ci-android.yml` as
converted by #317, `.github/workflows/context7-rule.yml` as added by #325, and — for the
required set — **the ruleset API itself**, not a screenshot and not a person's recollection:

```
GET /repos/skizzy1986/erg-dashboard/rulesets/18063518
  → updated_at 2026-08-28T12:22:08.154+08:00, bypass_actors [], enforcement active
  → 10 required contexts, as listed above
```

That distinction is the point of this revision: the previous two attestations here cited the
ruleset *page* and were both wrong. Re-run the command rather than trusting the timestamp —
the ruleset is edited outside this repo, so nothing in git can tell you it moved.

`ci-android.yml` trigger and concurrency re-read on 2026-08-28 at `3bd2337` while fixing #330,
alongside the `on:` block of every other workflow in `.github/workflows/`: `ci-android.yml` was the
only one pushing on anything but `main`, and so the only one that could collide with itself.

The *Reports but is not required* row and the exit-0 defect row re-verified on 2026-11-05 against
`.github/workflows/hook-smoke-test.yml` as added by #398, and against `.claude/hooks/test-hooks.sh`
at that commit. The new workflow reports two check-runs — `Detect hook changes`, already covered by
the row's `Detect …` clause, and `Hooks pass their smoke test` — and **neither is in the ruleset**,
so the required set is still the same ten. Two facts from the same PR that this file does not cover
but that bear on reading a check list here: nothing had ever executed `test-hooks.sh`, and settings-
defined hooks and `permissions.allow` do not apply in a cloud session at all until the workspace is
trusted (`claude doctor`: *"Ignoring 36 permissions.allow entries … this workspace has not been
trusted"*). The second is environment configuration, not CI — it is recorded in
`docs/CLOUD_ENVIRONMENT.md`.
