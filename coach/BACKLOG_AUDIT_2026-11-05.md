# Split IQ backlog audit — 2026-11-05

> Audit of the **Split IQ** board ([users/skizzy1986/projects/1](https://github.com/users/skizzy1986/projects/1))
> and the open issues behind it. Produced by the `/orchestrate` research path on
> 2026-11-05 (data read ~14:20 UTC), `main` at `24a578c`. No code or board state was
> changed by this audit. Read it with `WORKFLOW.md` (the rail) and
> `coach/PROJECT_MANAGEMENT_ANALYSIS.md` (the 2026-06-29 review this follows on from).
>
> **Provenance.** Board columns were read through `.github/workflows/project-board.yml`
> (`action=list`, run 42043688625, 271 of 271 items). Issues, PRs, comments and check
> runs were read through the GitHub MCP. Repo facts (file sizes, `test.ts` presence,
> doc lines) were checked in the working tree. Every row below is read from those
> sources unless it says **inferred**. The ranking in §6 is a Product Manager pass over
> the verified facts, checked by the orchestrator; it is a recommendation, not a decision.

## 1. Headline

The board is a list, not a plan: 44 issues in Backlog, Ready has never held an item, two
closed issues sit In progress and two open issues are hidden in Done. Three things are
worth doing. First, fix what makes CI and docs lie: #312, #311, the stale `CLAUDE.md`
claims about #52 and #77, and #326. Second, close about nine discharged or stale issues
and collapse the #209 / #318 / #403 triplicate. Third, move #382 and #402 to In
progress and make the squat track the visible P1, which is where Scott said the effort
goes (#402, 2026-11-05). The biggest risk is false-green CI: a PR touching only
`coach-chat` or `vitals-sync` passes with nothing run (#312), and #326 is the same trap
for the APK check.

## 2. Board hygiene defects

| Item | What is wrong | Fix |
|---|---|---|
| #77, #175 | Closed (2026-07-03, 2026-08-20) but still **In progress**. The *Item closed → Done* rule only existed from 2026-11-05. | Move to Done. |
| #113 | Open on GitHub, **Done** on the board. | Close it (§3). |
| #312 | Reopened 2026-08-28 after the #316 mis-close, but the board still says **Done**. The *Item reopened* rule did not exist then. | Move to Backlog, label P0. |
| #382, #402 | Both actively worked (#401 open; #402 Gate 2 approved 14:08 and build started) but sit in **Backlog**. | Move to In progress. |
| Ready column | Zero items, ever. The two manual moves the board depends on are not being made. | Triage the P0/P1 set into Ready. |
| 16 issues with no P-label | #144, #209, #210, #216, #217, #222, #230, #233, #264, #265, #280, #303, #382, #392, #402, #403. | Label per §6. |
| `week-1` … `week-4` labels | On #52, #53, #55, #56, #63, #79, #177–#181. June sprint-relative; meaningless now. | Remove. |
| #402 title | Still reads "coaching depth + 3D lift demo — slice ladder (Gate 1 approved…)". Scott pivoted it at Gate 2 to squat-anatomy **pipeline hygiene** (roadmap item 1). | Retitle, rewrite the body, label P1. |
| #52 vs `CLAUDE.md:140` and `README.md:100` | Both docs say #52 was "closed by PR #145". It is open. #113 flagged this on 2026-08-18. | Close #52 (§3) so the docs become true. |
| #77 vs `CLAUDE.md:59,142` | The doc cites #77 as the live issue for splitting `ProgramView.jsx` further. #77 closed legitimately when its three PRs (#110, #111, #112) landed; it never scoped the remaining split. The file is still 1,958 lines. | Correct the doc; either file a new issue for the further split or fold it into #79/#114. |
| `CLAUDE.md:69,140` | Says `App.jsx` is ~447 lines. It is 519 today (`erg-context.md` already says ~519). | One-line fix, fold into #311. |
| `WORKFLOW.md` §4 | Says "Three required checks" plus a "fourth" Deno check. `steward/SKILL.md` attests **ten**, verified against the ruleset API on 2026-08-28. `CLAUDE.md` "CI & Quality Gates" says "three" over a five-row table. | #311 stays open, P0. |
| #392 | Doctrine auto-issue, no labels, assigned to Scott. The nightly Routine (01:00 UTC) supersedes the anchor and closes it. | No action. Confirm it closed after 01:00 UTC. |
| Trackers #113, #114, #115, #116, #182 | Plain issues with checklists; no sub-issue linkage, no milestone. | §8. |
| `add-to-project.yml` note in `WORKFLOW.md` | Says the job is a no-op until `ADD_TO_PROJECT_PAT` is set. The secret is set and was **rotated** on 2026-11-05 (PR #393; today's board read used it). #382's 2026-11-04 body still says it has expired. | Correct the WORKFLOW.md sentence and the #382 follow-up. |

### Mechanical moves (any session can do these through `project-board.yml`)

```
action=move item=77  status=Done
action=move item=175 status=Done
action=move item=312 status=Backlog
action=move item=382 status="In progress"
action=move item=402 status="In progress"
```

The closes, label edits and retitles in §3–§6 are plain GitHub issue edits.

## 3. Close or supersede

| Issue | Reason | Evidence |
|---|---|---|
| #52 | The `App.jsx` milestone landed. The remaining StrengthLogger work is carried by #79. | `CLAUDE.md:140` says closed by #145; body checklist is June, pre-`App.jsx`. |
| #113 | Sprint 1 tracker, exit criterion achieved. Remaining owner items are the SHA-pin (lives in #63) and the Strava tier decision (#54 is done via #324). | Comment 2026-08-18: "exit criterion achieved". Open-PR count today is 1. |
| #144 | Superseded. The July choice of a 2-image demo over a 3D figure predates the real runtime. `/squat` shipped (#383, #385) and #401 adds the muscle list and activation heatmap. | #402 body: "the real runtime did not exist then". |
| #303 | Premise no longer holds. Docs corrected by #319, mathjs removed by #329, budget split entry/total by #331. | `CLAUDE.md` measured 2026-11-04: entry 146.6 / 150, total 385.4 / 400. |
| #322 | Everything discharged. Items 1 and 2 done 2026-08-28; item 3 done by Scott adding the checks (12:22 +08:00) and #328 correcting the steward doc; item 4 redone in #328. | #328 body; #322 thread. |
| #342 | Same defect as #351. The fix (#354) merged 2026-11-05 "Closes #351". It does not work until the owner adds PAT scope (§7). | #354 body. Close after the scope is added and one Monday run is observed. |
| #178, #180, #181 | **Inferred** premise loss. All three depend on a benchmark being scheduled and performed; #180 calls that a Coach-lane dependency with nothing scheduled. The phase anchor has been maintenance since 2026-08-20 (#209), and Scott pivoted away from personal prescriptions (#402). Close as not planned; Scott to confirm. | #182 body; #209 body; #402 comment 2026-11-05 12:50. |

Not closed, strictly: #114 and #116 (children still open), #182 (T4, T6 still valid),
#265 (latent bug; its own body says "not planned" is an acceptable outcome), #55 (idle
but valid).

## 4. Merge / de-duplicate

| Cluster | Survivor | Carry across |
|---|---|---|
| #209, #318, #403 — one defect: the app and Coach assert a phase that ended | #209 | From #318: derive "current" from `anchors`, delete the `current: true` literals and the `ANNUAL_ARC` "Jun – Aug 26" self-expiry. From #403: the "50+" age error, deployed v13 is byte-identical to the repo, the superseded Slice 1 spec on #402, and the `training-science.md:16` CP 190 line as a separate doctrine PR. Close #318 and #403 as duplicates. |
| #53, #79, #114 | #79 | Mobile-view smoke tests from #53; the untested hooks and components listed in #114's 2026-08-18 comment. Close #53 and #114 once carried. |
| #260, #261 | #260 | Two states of one Progress pane. Fold the "unavailable" acceptance criteria and code references in. |
| #307, #308 | #308 | #307 says it collapses into the Planning screen if that lands first. Keep #306 separate as the dependency. |
| #115 (Sprint 3) | Dissolve | Overlaps #210 and #327. SHA-pin sits in #63. Doctrine automation is done. File the stale-bot, E2E-required and Lighthouse-enforce items as discrete issues only if still wanted, then close. |
| #116 (Sprint 4) | #56, #55 | Strava is done. Concept2 and Garmin sequencing lives in those two issues. Close the tracker. |
| #402 Slices 2–6 | None | Slice 1 moved to #209/#403. Slice 3 (CSP-blocked demo images) and Slice 2 (3D link in the dashboard) are carried nowhere. File them or record that they are dropped. |

## 5. Stale but still valid

- **#209**: written as a follow-up "when #204 lands"; #204 has landed. The FIFO-week assertion was partly fixed by #309/#310 (**inferred**). Line numbers need re-verifying. Prompt staleness confirmed live by #403 on 2026-11-05.
- **#311**: the counts in its suggested wording are now wrong. Ten required checks are attested, not three or four. Refresh the wording and add the five-command lint cell.
- **#326**: written as "latent" before `Build Debug APK` was required. The check is required now, so the hole is probably live (**inferred**). Still reasoned, not observed.
- **#182**: sprint window ended 2026-09-18. Its checkboxes show T3 (#176) open; #176 is closed. Trim to T4 and T6.
- **#382**: PR2b is one checkbox but is now PR2b-i (#401, draft, 3 must-fix findings) and PR2b-ii. Four follow-ups in its body have no issue: the e2e service-worker check, the `RealtimeClient` reclaim (3.4 KB entry headroom), the SimTK licence text, and the PAT (now rotated).
- **#79**: title says "(next month)" (June); file is 1,682 lines, not 1,665. **#53**: mirrors coverage thresholds that `WORKFLOW.md` says must live only in `vite.config.js`.
- **#63**: P1 and `week-1`, but three of four items are done and the last is optional hardening. Relabel P2.
- **#56**: the 2026-08-22 "primary ingest path" priority predates the pivot. Scott to re-confirm.
- **#306, #308**: build a season plan and a roster verdict while the anchor says "no programmed block". Needs a Scott decision before any build.
- **#222**: no labels. Item 3 (the `exercise_prs` view missing from migrations) is a reproducibility defect independent of the rest.

## 6. Ranked stack

**P0 (4)** — blocks other work or keeps the system honest

| Issue | Why | Label change |
|---|---|---|
| #312 | No tests for `coach-chat` / `vitals-sync` (verified: `test.ts` exists only for `strava-import`, `vitals-import`, `vitals-import-api`), so green means nothing. Mis-closed by #316. | add P0; board → Backlog |
| #311 | `CLAUDE.md` and `WORKFLOW.md` misstate the CI gates; every agent reads them as authoritative. | P2 → P0 |
| #216 | Free-text `sessions.duration` silently zeroes load. Session 102 scored 0 TSS until a hand back-fill on 2026-08-28. | add P0; needs owner migration approval |
| #209 | The app and Coach assert a phase that ended. Absorbs #318 and #403. | add P0 |

**P1** — most valuable in-flight work or foundation

| Issue | Why | Label change |
|---|---|---|
| #382 | `/squat` v1 tracker; the stated priority. | add P1; → In progress |
| #402 | Squat-anatomy pipeline hygiene; Gate 2 approved, building. | add P1; retitle; → In progress |
| #326 | `build-apk` skips when the web build fails, so the required APK check does not require the web build. | P2 → P1 |
| #327 | Nothing checks the documented required set against the ruleset; three PRs asserted a set that did not exist. | P2 → P1 |
| #210 | No edge-function drift detection; makes the #209 redeploy safe. | add P1 |

**P2** — later, stack-ranked within the tier

1. #79 (absorbs #53, #114) — remove `week-4`.
2. #233, #265 — add P2. For #265, decide or close as not planned.
3. #217, #230, #264, #222 — add P2. #222 also gets `docs` / `testing`.
4. #177, #179 — keep P2 (display truth for benchmarks). Remove week labels.
5. #182 — P1 → P2 and trim to T4/T6.
6. #256, #258, #280, #260 (absorbs #261) — keep P2 `design`. #258 is owner-only.
7. #63 — P1 → P2, remove `week-1`.
8. #56, #55 — keep P2, remove week labels. #55 has had no activity since 2026-06-30.
9. #306, #308 (absorbs #307) — keep P2, parked pending Scott's decision.
10. #392 — no label; self-closes.

## 7. Owner-only actions

| Action | Unblocks |
|---|---|
| Add **Pull requests: read/write** to the fine-grained `VISUAL_BASELINE_PAT`. | #342 / #351 fix in #354 (currently fails visibly with a 403 on `gh pr list`). |
| Authorise the `duration_min` generated-column migration. | #216. |
| Authorise the `exercise_prs` view migration. | #222 item 3. |
| Authorise the production `coach-chat` redeploy through the Supabase MCP (CI does not deploy it). | #209 / #403. |
| Interactive `/design-login` re-sync. | #258. |
| One-time SHA-pin pass from a networked machine. | #63. |
| Provide a token that can read rulesets from CI, if `GITHUB_TOKEN` cannot (**inferred**). | #327. |
| Read the SimTK "MIT Use Agreement" text. | `/squat` launch (#382 follow-up). |
| Decide the fate of #306 / #308 and #55 / #56 under the pivot. | A clean P2 tier. |
| Confirm closing #178, #180, #181 as not planned. | §3. |

`ADD_TO_PROJECT_PAT` is **not** on this list: it was rotated 2026-11-05 (#393) and the
board read for this audit used it. The 90-day expiry note in `docs/CLOUD_ENVIRONMENT.md`
still applies.

## 8. Process observations

- **Trackers rot.** #113, #114, #115, #116 and #182 have no sub-issue linkage, and #113 and #182 show finished or idle children. Rule: a tracker uses GitHub sub-issues and closes the day its last child closes. No tracker without a dated exit.
- **Closing keywords ignore negation.** #316's "did not close #312" closed #312 one second after merge. Rule: write `Closes #N` only when every acceptance criterion is met, `Part of #N` otherwise (as #401 does), and never a negated close or fix phrase in a PR body.
- **Labels carry no signal.** 16 of 46 issues have no P-label, `week-N` is June-relative, and no milestones are used. Rule: nothing leaves Backlog without a P-label; sprints use milestones.
- **Manual board moves are not made.** Ready has never been used. Rule: cutting a branch includes the In progress move via `project-board.yml`, and a weekly sweep checks board state against issue state (the §2 table is what one sweep found).
- **Docs hand-state issue and CI state.** `CLAUDE.md:59,69,140,142` and `WORKFLOW.md` §4 are all wrong at once. Rule: docs cite an issue number only with a live link, and state check counts only where a guard (#327) compares them.
- **Pivots and duplicates leave debris.** #402 was pivoted by comment but not by edit, #209 / #318 / #403 describe one defect, and #342 duplicates #351. Rule: search before filing; at a pivot, retitle and rewrite the body in the same step, filing or dropping each orphaned slice explicitly.
