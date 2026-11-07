# SplitIQ reorientation — per-slice specs (Stage 3 briefs and their gate verdicts)

> Companion to [`REORIENTATION_EPIC_2026-11-06.md`](REORIENTATION_EPIC_2026-11-06.md). Each slice's
> Stage 3 brief is appended here as the Workflow Architect delivered it (read-only stage), with the
> orchestrator's verification notes and the Gate 2 verdict, so a fresh session can build the slice
> from this file plus the epic plan. Proposed text is verbatim and is what Gate 2 approves.

---

## Slice 1 — #413 — land VISION.md, re-brief the agents

**Gate 2 status: APPROVED by Scott 2026-11-06 ~06:10 UTC** — "approve all three, yes to the new branch, 2b and slice 11": the three texts as written, branch `housekeeping/vision-rebrief-agents` cut from `main`, edit 2b (`AGENTS.md:53`) included, and slice 11 (#424) gains the item "retire the 'still in the tree … being removed' sentence in `erg-context.md` §Project once slices 3 and 10 land". (Brief delivered 2026-11-06 ~05:58 UTC; orchestrator verified the
`ci-web.yml` `web/**` filter, `config.json:58` `readmeHeader`, the current text of all three files,
`check-context7.mjs:33-34,73`, and that `VISION.md` is absent from `origin/main`).

**Orchestrator notes.** (1) The brief corrects the plan: criterion 6 ("no `web/` file changes, so the
web jobs skip") was wrong because `web/.design-sync/CLAUDE.md` is under `web/**`; amended to "nothing
under `web/src`, `web/scripts`, `supabase/` or `.github/` changes, and every triggered job passes".
(2) The branch it names (`housekeeping/vision-rebrief-agents`) is not this session's assigned branch;
pushing to it needs Scott's permission under the session rule, asked at Gate 2. (3) Edit 2b
(`AGENTS.md:53`, "the 13→5 nav cut") and risk 3 (slice 11 to retire the "still in the tree"
sentence) are put to Scott with the brief.

### The brief (Workflow Architect, verbatim)

The brief is ready for Gate 2. Two premises in the plan were wrong: acceptance criterion (6) is false, and `VISION.md` is not on `main`. Both are corrected below.

**Working tree:** I edited nothing. The only state-changing command was `git fetch origin main`, which updates remote-tracking refs only.

**Labels:** **V** means I checked it in the repo. **I** means I inferred it.

## Files read

- **V** Read in full:
  - the scratchpad `VISION.md`, which is byte-identical to `origin/claude/splitiq-vision:VISION.md`
  - `erg-context.md` (102 lines)
  - `web/.design-sync/CLAUDE.md` (106 lines)
  - `.claude/AGENTS.md`
  - epic §1–6 and §9, and research §C 3–4
  - `check-context7.mjs`, `check-zone-bands.mjs` and `ownership.json`
  - the path filters in `ci-web.yml`, `context7-rule.yml`, `zone-bands.yml` and `doctrine-sha-guard.yml`
- **V** All three target files match `origin/main` exactly.

## Corrections to the plan

1. **Criterion (6) is false.** `web/.design-sync/CLAUDE.md` sits under `web/**`, which is the filter `ci-web.yml` uses (lines 33–36, **V**). So Lint, Test, Build, e2e and lighthouse all run on this PR. That is harmless and useful, because Lint runs `check:design-sync`.
   - New criterion (6): *nothing under `web/src`, `web/scripts`, `supabase/` or `.github/` changes, and every triggered job passes.*
   - `ci-android` filters on `web/src/**`, so it skips.
2. **`VISION.md` is not on `main`.** `git ls-tree origin/main VISION.md` returns nothing (**V**). If this PR merged first, its "Read `VISION.md` first" line would point at a file that does not exist. No wording fixes that, because the pointer is the whole point. Enforce the merge order instead (see Dependency).

## Guards

| Guard | What must survive, or what is true | Status |
|---|---|---|
| `check-context7.mjs` | `erg-context.md` must still contain `## Library documentation — Context7 first` (`:33`, `:57`) and both `resolve-library-id` and `query-docs` (`:34`, `:63–69`). `CLAUDE.md` must still contain `### Context7` (`:73`), and this slice does not touch it. The rewrite only touches lines 10–13 and 95–96. Lines 48–65 stay byte-for-byte. | V |
| `ownership.json` | `CLAUDE.md` is **repo-owned and pushed**: it is the `readmeHeader` at `config.json:58`. Editing it from the code side is the correct lane. Consequence: the pointer reaches design sessions only after Scott re-syncs with `/design-login` (Risk 1). | V |
| Prettier | `.prettierignore` excludes `.design-sync/`, and `format:check` only covers `src/` and `scripts/`. Prettier never sees any of the three files. | V |
| `check:zones` | `erg-context.md` and `AGENTS.md` publish no zone band. `.design-sync/CLAUDE.md:55–57` publishes one, with CP quoted, and it passes today. It is left untouched until slice 12. None of the new text below contains `UT2`. | V |
| `doctrine-sha-guard` | It fires on push to `main` for the paths `CLAUDE.md` and `.claude/skills/training-science.md`. A bare `CLAUDE.md` pattern matches only the root file, so `web/.design-sync/CLAUDE.md` does not trigger it. The next-day check confirms this. | I (GitHub glob rules, not looked up) |

## Edit 1: `.claude/skills/erg-context.md`

**Lines 10–13: replace `## Project` with:**

```
SplitIQ — a training app where the movements explain themselves. A 3D anatomical
runtime (`web/src/anatomy/`; first product `/squat`) shows what a lift does, wrapped
around a training log with an honest load model. For anyone who lifts or rows; a hobby
built to a public-quality standard. User data is keyed on `user_id` under owner-only
RLS, the user taken from the verified JWT. No AI coach and no personal prescription
engine: the load model stays (CTL/ATL/TSB, `sessionLoad`, readiness,
`derivePaceZones(cp)` with calibration read from `anchors`). The LLM coach and the
one-athlete schedule/prescription code still in the tree are being removed (#412) —
do not extend them. React 19 + Vite SPA under `web/` (Capacitor monorepo layout),
Supabase (Postgres + Auth + Edge Functions), Vercel hosting, Vitest + React Testing
Library. Read `VISION.md` first (it wins where docs disagree), then `CLAUDE.md`.
```

Why the "still in the tree" sentence is there:
- Slices 2–10 are built by agents briefed with this file. They need to know the coach and prescription code exists so they can remove it.
- Describing that code as current would be false. Saying it is gone would also be false.
- So the sentence states what it is: present, being removed, do not extend.

Where the claims come from:
- **V** "keyed on `user_id`" covers user data only. VISION lines 104–106 list the user-keyed tables; `exercises` and `exercise_media` are reference data.
- **V** The JWT claim comes from `001_enable_rls.sql` (`auth.uid() = user_id`).
- **V** The CP-from-`anchors` claim comes from `trainingConfig.js:171` and `:303`.

**Lines 95–96: replace with:**

```
CP = critical power, the anchor every rowing zone derives from — read it from the
per-user `anchors` table (`rowing_cp`); never hardcode a value. Deeper domain detail:
`.claude/skills/training-science.md` (its prescription sections are superseded by
`VISION.md`).
```

Decision: replace the number. Four reasons:
- The preamble describes a multi-user product, and "~205 W" is one user's calibration.
- The code already reads CP from `anchors` (**V**, `trainingConfig.js:303`).
- Watt figures written into prose go stale. Three such copies went stale before anything caught them (#266, #268, #275).
- It matches D20.

The `training-science.md` caveat goes in because that file stays stale until slice 11 (D2). An agent following the pointer must not treat its race-target and microcycle sections as current.

**Lines I checked and left alone:**

| Line | Text | Why it stays |
|---|---|---|
| 1, 4 | "Erg Context", "erg-aware" | The filename is the inheritance key at `check-context7.mjs:105`. Renaming the heading is churn with no gain. |
| 45 | "Destructive changes require Scott's explicit approval" | Scott is the owner and the person who authorises changes. That is not the solo-user framing. |
| 75–77 | Sentry project names | These are the real project names. |

Not framing, but stale. These are parked, not folded in:
- line 22 says `App.jsx` is "~519 lines" (CLAUDE.md says ~447)
- line 60 says "mathjs", which was removed in #54

## Edit 2: `.claude/AGENTS.md`

**Lines 43–44** (the sentence wraps across both lines):

```
Only five divisions are high-value for a small React/Supabase training app. The rest
(game-dev, GIS, sales, real-estate, …) are noise here.
```

**Optional (2b, needs Scott's yes):** line 53 says "the 13→5 nav cut", which contradicts D3. The proposed replacement is "the mobile nav cut to four destinations". It is outside the line the slice named. If Scott says no, park it for slice 11.

## Edit 3: `web/.design-sync/CLAUDE.md`

**Insert after line 15** (the end of the opening blockquote), before `## What SplitIQ is`:

```
> **Superseded in part — read `VISION.md` (repo root) first.** As of 2026-11-06 SplitIQ is
> not a one-athlete dashboard and has no AI coach. In this file, "What SplitIQ is" (the
> single-user premise), the **Coach** destination, the **Microcycle** entry and the CP and
> zone figures (one athlete's calibration) are superseded, as are the Coach, roster,
> Planning and nutrition sections of `HANDOFF.md`, `DESIGN_BRIEF.md` and `conventions.md`.
> The mobile target is four destinations. Those lines are struck later (tracked in #412);
> until then, where they disagree with `VISION.md`, `VISION.md` wins — do not design them.
```

The pointer is plain text, not a relative link, because this file is pushed to the design project, where `../../VISION.md` resolves to nothing.

**Lines 42 and 59: change in slice 12, not now.** The pointer names both lines, so leaving them does not contradict it.

The plan's "Coach / roster / nutrition" list is too narrow:
- Lines 19–30 ("one rower — Scott", "replaces Strava…", "No onboarding") go further against VISION than lines 42 and 59 do.
- That is why the pointer names "What SplitIQ is" explicitly.
- Striking line 42 now would also leave a "five destinations" heading over four rows, and `HANDOFF.md` still says five.

## Acceptance criteria and their proof

| # | Criterion | Proof |
|---|---|---|
| 1 | `VISION.md` is on `main` | `git ls-tree origin/main VISION.md` is non-empty (after #410) |
| 2 | The old framing is gone and the file points to `VISION.md` | `git grep -n "Personal coaching dashboard\|Solo user: Scott\|~205" .claude/skills/erg-context.md` returns nothing, and `git grep -n VISION.md .claude/skills/erg-context.md` is non-empty |
| 3 | The Context7 rule is intact | `cd web && npm run check:context7`, plus the CI job `Context7 rule` (filter `.claude/skills/**` matches) |
| 4 | The design-sync and zone guards pass | `npm run check:design-sync` and `npm run check:zones`, plus CI `Lint & Format` (which runs `check:design-sync`) and `Zone bands` (filter `**/*.md` matches) |
| 5 | Neither doctrine file is touched, and no doctrine issue opens | `git diff --name-only origin/main` lacks `CLAUDE.md` and `training-science.md`. The day after merge, there is no new "chore(doctrine): supersede doctrine_sha" issue. |
| 6 (amended) | No code, migration or workflow changes | `git diff --name-only origin/main` is exactly the three files below. The `ci-web` jobs run and pass. |

## Dependency, branch and PR body

**Branch:**
- Cut from fresh `origin/main` as `housekeeping/vision-rebrief-agents`, not from `claude/splitiq-vision`. Cutting from that branch would put `VISION.md` into this diff.
- Open the PR as a **draft**.
- After #410 merges: rebase onto `origin/main`, confirm criterion 1, then mark the PR ready.

**PR body:**

- **First line:** `Closes #<slice-1 sub-issue>`, then `Part of #412`, then `Depends on #410 — do not merge before it; erg-context.md points readers at VISION.md.`
- **Under the template headings** (`## What changed and why`, `## How to test manually`, `## Checklist`), state:
  - The three files, and why each one changes.
  - The output of the guard runs.
  - Follow-up for Scott only: re-sync the design project with `/design-login` so the pointer reaches design sessions.
  - #306 and #308 are closed as not planned by Scott editing the issues. **No `Closes`/`Fixes` keyword for them anywhere in the body or commits.**
- **Title:** `docs: land VISION.md pointer and re-brief the agents (slice 1)`. `docs` is an allowed type at `pr-title-lint.yml:26` (**V**).

## Build stage

- **Who applies it:** the orchestrator applies the approved text directly, under Minimal Change Engineer discipline: verbatim, no paraphrase, no extra lines.
  - Why: the deliverable is wording that Gate 2 has already approved.
  - A Frontend Developer spawn adds paraphrase risk and no value.
  - Stage 5 reduces to the guard runs. Stage 6 still runs Code Reviewer and Reality Checker against this brief.
- **Before push, run from `web/`:**
  - `npm run check:context7`
  - `npm run check:design-sync`
  - `npm run check:zones`
  - `npm run lint`
  - `npm run format:check`
  - `npm test`
  - The last three are required by the CLAUDE.md safety rules. CI runs them anyway because a `web/` path changed.
- **Then run from the repo root:** `git grep -n -i "solo user\|solo dashboard\|personal coaching dashboard\|~205" -- .claude/skills/erg-context.md .claude/AGENTS.md`. It must return nothing.
- **`git diff --name-only origin/main` must be exactly:**

```
.claude/AGENTS.md
.claude/skills/erg-context.md
web/.design-sync/CLAUDE.md
```

## Risks

1. **The pointer does nothing for design sessions until Scott re-syncs.** It sits in the `readmeHeader` (`config.json:58`), and the claude.ai/design project keeps the old briefing until Scott runs `/design-login`. The PR body has to say this.
2. **Merge order.** If this merges before #410, `erg-context.md` points at a file that does not exist. The draft state, the "Depends on" line and a rebase-then-check step guard against it.
3. **The preamble's own sentence will go stale.** "The LLM coach… still in the tree are being removed (#412)" becomes false after slices 3 and 10. Recommend adding "update the `erg-context.md` §Project removal sentence" to slice 11's scope.
4. **Slices 2+ need the new preamble.** Any slice branch cut before this merges carries the old briefing, so cut slices 2+ only after this lands.


### Stage 6 verdicts and Gate 3 — slice 1

**Gate 3 status: SHIPPED — Scott: "ship it" (2026-11-06 ~06:25 UTC); delivered as draft PR #426** (`housekeeping/vision-rebrief-agents`, head `f489692`), subscribed, #413 moved to In review. Mark ready once CI is green; merge is Scott's. Built on `housekeeping/vision-rebrief-agents`,
one commit, rebased onto `main` at `93fe6cb` (which carries `VISION.md`, #410 merged) → head `f489692`.
Guards re-run on that head with the SHA recorded (`check:context7`, `check:design-sync`, `check:zones`,
`lint`, `format:check` all exit 0; Vitest 125 files / 1,591 tests green). The PR is not yet opened;
delivery follows Scott's "ship".

**Code Reviewer (sonnet): APPROVE.** Verbatim match of all five edits verified mechanically; prose true of
the tree today (coach and schedule files present, `derivePaceZones` at `trainingConfig.js:306`,
`useAnchors` reads `anchors`, `001_enable_rls.sql` `auth.uid() = user_id`); guards pass and the Context7
block is outside the hunks; style consistent; nothing personal or secret added and `~205 W` removed; the
`VISION.md` pointer was a merge-order condition, now satisfied by the rebase. Nit: the edit 2b table row
is ~120 columns (a table row cannot wrap). Open item 7 (does `paths: 'CLAUDE.md'` match the nested
design-sync file?) settled by the orchestrator from the GitHub Actions workflow-syntax docs via Context7:
"Path patterns must match the whole path, and start from the repository's root", with `'**/README.md'`
as the documented form for "anywhere" — so the doctrine guard cannot fire on this PR.

**Reality Checker (opus): fix-then-ship — no Blocker; the diff needs no change.** Criteria 2, 3, 4 met
with evidence; 1 and 6 were merge-order / CI-only and are now met by the rebase and will be confirmed by
PR CI; 5's "no doctrine issue" half is a next-day read-back. Should-fix (discharged): the guard log
carried no SHA — re-run on the rebased head, SHA recorded. Nice-to-have (accepted as is): the RLS/JWT
sentence generalises over the `vitals-import-api` cron, which writes with the service role for a fixed
env user — the text is Gate-2-approved and stated at product level; and a commit-trailer model-name
query that reflects the judge's own attribution reminder, not this session's. Stage 5 skip judged
justified for a docs slice: guards prove the machine contracts, Vitest proves nothing changed under
`src/`, and tests cannot prove prose truth (checked by hand), agent briefing (slice 2's spec will show)
or design visibility (after `/design-login`). The PR body must carry: `Closes #413` / `Part of #412` /
depends-on #410; the `/design-login` follow-up; the staleness note (#424); the sequencing note (cut
slice 2+ after this merges); the #306/#308 note; the guard output and the next-day doctrine-issue check.

**Orchestrator's recommendation at Gate 3: ship.** Both judges agree the diff is correct and complete;
every remaining item is carried by the PR body or by a read-back after merge.

---

## Slice 2 — #414 — retire the coach client

> `/orchestrate slice 2 #414`, 2026-11-06, `main` at `5c6cd7e`. Session:
> https://claude.ai/code/session_018vVjPwmi51kr6GEc1a9vbj. Story skipped (epic Gate 1 covers it;
> D3 four destinations, D4 drop `signal`). Stage 1 delta research (Codebase Onboarding Engineer,
> sonnet) and Stage 3 spec (Workflow Architect, opus) both read-only, tree clean after each.
> **Gate 2 passed 2026-11-06** (Scott: "go — session branch is fine"). Branch `ccr-0421c4ed-dpqub3`.

### Research corrections to the plan

- `#/coach` resolves to Today only once `coach` leaves `DESTINATIONS`: `useHashRoute.read()`
  (`useHashRoute.js:10-13`) collapses unknown ids to `DEFAULT_DESTINATION`. Deleting the
  `MobileApp.jsx:75` branch alone would fall through to `MobileRecovery` at `:76` (which is `body`'s
  legitimate branch). Criterion 3 needs both, pinned by a `MobileApp`-level test.
- `TSB_BANDS[].signal` has one production reader, `useCoach.js:49`. OverviewView's `.signal`
  (`:142,:838,:938`) comes from `autoregulate()` in `utils/analysis.js` — different thing, slice 8.
- Extra stale comments beyond the plan: `trainingLoad.js:28`, `recoveryAnalytics.js:55-57` (names
  `CoachView`), `tsbBand.test.js:57`, `e2e/visual.spec.js:15-16`; and `MobileApp.test.jsx:135,142`
  click Coach in the listener tests.
- `App` and `MobileApp` are both `lazy()` in `AuthGate.jsx:16-17`, so CoachView is not in ENTRY.
- The desktop view is plain `useState` (`App.jsx:195`), never persisted — no migration needed.
- `check:design-sync` never reads `DESTINATIONS`; `config.json:34`'s doc string is slice 12.
- 8 visual baselines carry the nav: `desktop-{overview,calendar,program,journal}`,
  `mobile-{today,train,progress,body}`. Regenerate only via `e2e-web.yml` dispatch
  (`update_baselines: true`) on the branch with a PR open.

### Build brief (summary of the approved spec)

1. **Delete** `hooks/useCoach.js`, `views/CoachView.jsx`, `hooks/__tests__/useCoach.test.js`,
   `hooks/__tests__/useCoachWiring.test.js`, `views/__tests__/CoachView.test.jsx`.
2. **`constants/destinations.js`**: "five" → "four"; drop the coach comment line and entry; one line
   noting the artboards' fifth was retired in #414.
3. **`views/mobile/MobileApp.jsx`**: drop the import and the `coach` branch; keep the final else.
4. **`App.jsx`**: "all fourteen" → "every tab"; drop lazy import, nav tuple, render branch + comment.
5. **`utils/trainingLoad.js`**: drop the four `signal:` lines; rewrite the band comment and the
   :26-28 unit comment without naming the coach.
6. Comment-only: `useErgSessions.js:41`, `recoveryAnalytics.js:54-57`, `trainingLoad.test.js:44-47`,
   `tsbBand.test.js:56-58`, `e2e/visual.spec.js:15-16`, `.github/ISSUE_TEMPLATE/bug.yml:40`.
7. **`vite.config.js:290`**: drop the `useCoach.js` per-file key; globals untouched.
8. **`e2e/smoke.spec.js:28`**: drop `'coach'`.
9. **Guard** `web/src/__tests__/noCoachClient.test.js`: recursive `node:fs` walk of `src/` and `e2e/`
   (tests included), extensions js/jsx/mjs/cjs/json/css/md/html, one case-insensitive RegExp built
   from concatenated needles (no self-match, no path exemption); three tests — both roots scanned,
   pattern self-check, offenders `toEqual([])` as `file:line: match`.

### Test plan (criterion → test)

| # | Test |
|---|---|
| 1 | `noCoachClient.test.js` |
| 2 | `App.test.jsx`: mock + NAV row gone, 13 tabs pinned, no COACH button. `useHashRoute.test.js`: exact four ids; external-hash test uses `body`. `MobileApp.test.jsx`: four buttons, no Coach; deep-link uses `#/body`; listener tests click Today / Progress. Smoke spec loses `coach`. |
| 3 | `MobileApp.test.jsx` "a retired #/coach deep link opens Today, not Body"; `useHashRoute.test.js` "#/coach falls back to the default, and navigate ignores it". |
| 4 | `tsbBand.test.js`: bands carry exactly `floor,key,label,token`. |
| 5–6 | Coverage and `npm run size` before/after in the PR body. |
| 7 | Baseline dispatch after the PR opens; E2E — Web green. |

Out: `coach-chat`, `coach_messages`, the secret (slice 3); the coach rail; `CLAUDE.md` and
`training-science.md` (slice 11); design-sync docs (slice 12); `check-bundle-size.mjs:22`.

---

## Slice 3 — #415 — retire the coach backend

> `/orchestrate slice 3 #415`, 2026-11-06, `main` at `79f5629`. Session:
> https://claude.ai/code/session_018vVjPzP7cQhyS2sVtgJGd3. Story skipped (epic Gate 1 covers it;
> D5–D7). Stage 1 delta research (Codebase Onboarding Engineer, sonnet) and Stage 3 spec (Workflow
> Architect, opus) both read-only, tree clean after each. Build (Backend Architect, opus) repo-only;
> every production step run by the orchestrator. Delivered as draft PR #430 on branch
> `ccr-5fb65e44-6mm5ey`.

### Precondition failure and Scott's waiver

The plan's precondition — the latest `backup_snapshots` row contains `coach_messages` with a count
matching live — **failed, structurally**. Live read-back 2026-11-06: `public.backup_snapshot()`
(live-only; no migration defines it) hardcodes eight tables (`sessions`, `vitals`,
`strength_workouts`, `strength_sets`, `templates`, `template_exercises`, `workout_assignments`,
`exercise_prefs`); `coach_messages` is in none of the 30 retained snapshots (oldest 2026-10-07);
`run_backup_snapshot()` keeps only the latest 30 rows, so even a one-off snapshot would have been a
30-day window, not a copy. Live count 43 rows, Jun–Aug 2026.

The orchestrator stopped. **Scott, 2026-11-06: "Drop without a copy"** — the D5 condition is
waived and the rows accepted as lost. **And: "Yes, undeploy in the build"** (D6). The coverage gap
is filed as #428.

### Gate 2 status

**APPROVED by Scott 2026-11-06** ("Approve, go to build"; dashboard steps "now, while you
build"). Orchestrator amendments to the brief: the issue comment on #415 dropped (session rule: no
GitHub comments unless asked); work on the session-assigned branch.

### Research corrections to the plan

1. **No MCP tool deletes an edge function** (`deploy`/`get`/`list` only; no `supabase` CLI, no
   management token). The undeploy is Scott's dashboard step (Edge Functions → coach-chat →
   Delete), read back with `list_edge_functions`. A stub redeploy would leave it listed and is
   ruled out.
2. The dangling comment is `vitals-sync/index.ts:16-18`, not `:18`; `strava-sync/index.ts:16` is
   right. `strava-connect/index.ts:22` ("incident #301 … killed the Coach tab") is history and
   stays.
3. `coach-chat/index.ts` never touches `coach_messages`, so the undeploy and the drop are
   independent. No `supabase/config.toml` exists. `ci-functions` hardcodes three test files and
   never named coach-chat, so it verifies nothing about the deletion.
4. No CI job's path filter covers both `web/**` and `supabase/functions/**` — the guard needs its
   own workflow (the `zone-bands.yml` / `context7-rule.yml` lesson).

### Build brief (summary of the approved spec)

- **Guard:** `web/scripts/check-no-llm-path.mjs` (`npm run check:no-llm`) + `.github/workflows/no-llm-path.yml`,
  job-level `dorny/paths-filter` on `web/**`, `supabase/functions/**` and itself. `git grep -n -I -i -F`
  over tracked files for `api.anthropic.com` and `ANTHROPIC_API_KEY` (needles concatenated to avoid
  self-match). Self-tests its matcher on a temp-dir canary and asserts both roots are tracked
  before scanning. Not a required check until Scott adds it to the ruleset.
- **Migration 013:** bare `DROP TABLE public.coach_messages;` — no `CASCADE` (an unexpected
  dependant must fail loudly), no `IF EXISTS` (an already-missing table is a surprise worth
  seeing). Rollback recreates structure only, against the live read-back, and its header carries
  the waiver.
- **Order:** read-only Phase A (schema, dependants, advisors, migration ledger) → repo build with a
  negative then positive guard run → production (Scott's undeploy; `apply_migration` named
  `013_drop_coach_messages`) → read-backs → PR leaves draft. Gate 3 judges read-back evidence.
- **Comments:** `vitals-sync` and `strava-sync` point at the functions sharing the CORS list; the
  header strings are byte-identical.

### Evidence

| Check | Result |
|---|---|
| Live schema vs `002` (before drop) | **Match.** Columns; `coach_messages_pkey`; `coach_messages_role_check`; FK `coach_messages_user_id_fkey` → `auth.users(id)`; RLS on, not forced; policy `coach_messages_owner` PERMISSIVE FOR ALL to public, USING + WITH CHECK `auth.uid() = user_id`; index `coach_messages_user_created`; no triggers, no publication; default grants. |
| Dependants (inbound FK, views, functions, cron) | None. `backup_snapshot()` does not reference the table. |
| Migration ledger before apply | No `013_*` entry (also after the first, timed-out call). |
| Guard, before deleting `coach-chat/` | exit 1, exactly 5 hits in `coach-chat/index.ts` (:4, :73, :75, :76, :134). |
| Guard, after | exit 0 — 475 tracked files, none naming the host or key. CI job `No LLM API host or key in web or functions` green on #430. |
| Vitest / coverage | 123 files, 1,549 tests; lines 93.28 / branches 85.01 / functions 89.36 (floors 89 / 80 / 85). No `web/src` change. |
| Deno (what `ci-functions` runs) | 28 / 35 / 246 passed. |
| Bundle | ±0.0 KB on every budget. |
| `apply_migration('013_drop_coach_messages')` | **Applied 2026-11-07 04:01 UTC** (ledger `20261107040151 013_drop_coach_messages`). The first call, 2026-11-06, timed out awaiting Scott's confirmation and left no ledger entry; re-checked before the retry (no `013_*` row, 43 rows, no dependants). |
| `to_regclass('public.coach_messages')` | **null.** No `coach_messages*` policy or index remains; no function body names the table. |
| Function list | **`coach-chat` absent** after Scott's dashboard delete (2026-11-07). The other three ACTIVE; each version number went up by one (v23 / v17 / v5) with `ezbr_sha256` and `updated_at` unchanged — same code bundle, no redeploy by this slice; inferred to be the platform renumbering on delete. |
| Advisors diff | **As expected.** Performance: `auth_rls_initplan` 18 → 17 (only `coach_messages_owner` gone); nothing new. Security: unchanged from the post-`011` baseline. |

### Test plan (criterion → proof)

| # | Criterion (as amended by the waiver) | Proof |
|---|---|---|
| 1 | Waiver recorded; the backup does not depend on the table | This section, the epic's D5 supersede note, the rollback header, the PR body; dependants query (0 rows) before and after the drop. |
| 2 | `coach-chat` absent, the other three ACTIVE | `list_edge_functions` after Scott's delete, versions unchanged. |
| 3 | 013 applied via named `apply_migration`; table gone | The call; `list_migrations` shows it; `to_regclass` null. |
| 4 | A guard fails on the host or key in `web/` or `supabase/functions/` | Negative and positive runs above; canary self-test every run; CI check green. |
| 5 | `ci-functions` green, with the disclaimer | `CI — Edge Functions` green on #430; disclaimer verbatim in the PR body. |
| 6 | Secret removed | Scott's PR checkbox (not repo-verifiable). |

### Stage 6 verdicts

- **Code Reviewer: APPROVE.** Finding 1 (`pull-requests: read` missing for paths-filter) refuted
  by CI — the filter step and the guard job both ran green on `ae55ae0`. Finding 2 (repo delete is
  not an undeploy) is the pending dashboard step. Low/nits: the guard's needles are narrow by
  design; no unit test (none of the five sibling `check-*.mjs` has one).
- **Reality Checker: fix-then-ship.** Blocker B1: do not merge until rows 2 and 3 are read back —
  merging first would recreate the #429 drift in both directions. S1: write these records in the
  PR (this section). S2: re-check the ledger and re-count rows immediately before the retry.
  S3: the guard is advisory until required.

### Found on the way (not this slice)

- `011_revoke_security_definer_execute` (merged #323) had never been applied: six `SECURITY
  DEFINER` functions, `backup_snapshot()` among them, were executable with the public anon key.
  Scott approved; applied 2026-11-06 and read back (anon/authenticated EXECUTE false on all six;
  both advisor lints cleared). Both crons ran clean afterwards (`daily-db-snapshot` 18:00 UTC;
  `vitals-api-import` 03:00 UTC, `upsert_vital` 204 via the service role). The drift and the
  default-privilege root cause are #429.
- Backup coverage omits `coach_log`, `anchors`, `exercises`, `exercise_media`, `bp_readings`: #428.

Out: `.github/workflows/claude.yml` and its secret; `CLAUDE.md`, `README.md`, `steward/SKILL.md`,
`architecture.md`, `supabase-patterns.md` (slice 11, #424); `strava-connect/index.ts:22`;
`noCoachClient.test.js`; tests for `vitals-sync` (#312 stays open).

## Slice 4a — #416 — health data out of source and out of the bundle

> `/orchestrate #416`, 2026-11-07, `main` at `0071b54`. Session:
> https://claude.ai/code/session_018vVjPxo5CqyWkngXbpBq99. Classified as a bug fix (privacy, P1), so
> the Story stage was skipped — the issue carries the story and six criteria and the epic's Gate 1
> covers it. Stage 1 research (Codebase Onboarding Engineer, sonnet) and Stage 3 spec (Workflow
> Architect, opus) read-only, tree clean after each. Build (Frontend Developer, opus) frontend only —
> the slice is schema-free. Delivered as draft PR #448 on branch `claude/zen-bell-amrpso`.
> **Privacy: this section describes the data by shape only.**

### Research corrections to the issue

- `bpCategory` is not in `logs.js`; it is `utils/formatting.js:53` with its own tests, and stays.
- `logs.js` also held four journal exports (`DECISION_LOG`, `HYPOTHESES`, `RULE_FIRING_HISTORY`,
  `CONFIDENCE_MIGRATION`) read only by `JournalView`. Not named by the issue; slice 5 deletes the
  tab. So the `logs-*.js` chunk **shrinks, it does not disappear**, and it still carries personal
  bodyweight, energy, sleep and HRV figures from those exports until slice 5 lands.
- Personal content the issue did not name, in the same leak class: a hardcoded "data status note"
  in `RecoveryView.jsx` (RHR/HRV/baseline figures), the hormone-section referral narrative, two
  header status chips stating a care status, the bloods italic note, personal sentences in the BP
  footer, and the Overview nutrition prose after the log rows (energy-expenditure and deficit
  figures). All ruled **in** at Gate 2.
- The epic plan's slice-4a line listed `HORMONE_REF` for deletion; the issue keeps it with a
  `source`. The issue wins; the plan line is amended in the same PR.
- Acceptance 1 (`git grep` for `NIGGLES` empty) could not pass while the heading
  `NIGGLES · INJURY WATCH` survived, and a comment in `constants/mobility.js:6-7` named
  `mobilityLog`. Both ruled at Gate 2: heading renamed `INJURY WATCH`; one-line comment fix.
- No `check:colours` allowlist entry touches the edited files; none of them held a hex.

### Gate 2 status

**APPROVED by Scott 2026-11-07 ("Go")**, recommendations standing: (1) rename the heading to
`INJURY WATCH`; (2) the scope clarifications above are in; (3) delete the Overview nutrition prose
in 4a, card shell stays for slice 8; (4) Build verifies the reference sources.

### Build brief (summary of the approved spec)

- `constants/logs.js`: delete `bpLog` (3 rows: date/sys/dia/pulse/context/clean), `bloodsLog`
  (0 rows), `NIGGLES` (2 rows: area/status/color/detail/watch), `mobilityLog` (3 rows:
  date/type/label/duration/note), `nutritionLog` (6 rows: date/dayType/cal/protein/fat/carbs/burn,
  one with note/weight) and every comment block attached to them, including the one above
  `HORMONE_REF`. Keep the `THEME` import, the journal exports, and the two reference tables with a
  `source` string on every row.
- `views/RecoveryView.jsx`: imports cut to `LIPID_REF, HORMONE_REF`; `bpCategory` import dropped;
  header comment rewritten; sleep callout and data-status note deleted; BP, bloods, hormone and
  injury sections each render an italic muted "No … recorded yet." line in the `ErgView.jsx:824`
  style, headings unchanged except the rename; source lines rendered under each reference list
  from a `Set` over `row.source` (`Source: …`), never typed into JSX.
- `views/MobilityView.jsx`: log rows → empty-state line; header, streak note and footer kept.
- `views/OverviewView.jsx`: nutrition rows and prose → empty-state line; `assessMacro`,
  `macroColor`, `NUTRITION_TARGETS`, `nutritionLog` imports dropped; card shell, title, caption
  and tracking note kept for slice 8.
- `constants/mobility.js:6-7`: one-line comment. Nothing else (slice 10).
- No new component, helper or constant; `THEME` tokens only; no schema; no doc edits beyond
  `coach/`.

### Reference tables after verification (published values, not personal data)

Sandbox `curl` and `WebFetch` are DNS-blocked for the guideline hosts, so no agent in the pipeline
opened a guideline page. Verification was by `WebSearch` quoted passages, corroborated
independently by the orchestrator. **Scott: open the two documents once and confirm.**

- `LIPID_REF` (4 rows), single source *Australasian Association of Clinical Biochemists, Guideline
  for Harmonisation of Lipid Reporting (2018)*: total cholesterol ≤ 5.5 (was < 5.5), LDL ≤ 3.0
  (was < 2.0), HDL ≥ 1.0 men / ≥ 1.2 women (was > 1.0), triglycerides ≤ 2.0 fasting (was < 1.7),
  all mmol/L. The guideline calls these flagging **decision limits**, not reference intervals or
  action limits, so the row label changed from "target" to "limit" at Gate 3.
- `HORMONE_REF` (4 rows, was 5), single source *Endocrine Society, Testosterone Therapy in Men
  With Hypogonadism: An Endocrine Society Clinical Practice Guideline (2018)* (Bhasin et al., JCEM
  103(5):1715–44): total and free testosterone notes corroborated from the guideline's own
  recommendations; SHBG and LH/FSH notes rest on secondary summaries of it; the oestradiol row was
  **removed** — no supporting passage found.

### Test plan (criterion → proof)

| # | Criterion | Proof |
|---|---|---|
| 1 | No removed identifier in `web/src` | `git grep -nwE 'bpLog\|bloodsLog\|mobilityLog\|nutritionLog\|NIGGLES' -- web/src` → empty. |
| 2 | No deleted literal in any built chunk | Scratchpad probe (not committed): literals from the deleted ranges of `0071b54`, minus any still in live source, scanned over every `dist/assets/*.js`. Branch build: 45 probes, 0 chunks hit. Control build of `0071b54`: same 45 probes, 3 chunks hit (Overview, Recovery, logs). BP field keys absent from every branch chunk. |
| 3 | Empty-state tests, four Recovery sections | `RecoveryView.test.jsx`: `shows an empty blood pressure panel`, `… lipid panel above the reference list`, `… hormone panel`, `… niggles panel`. |
| 4 | Test file imports no deleted export | Import line is `LIPID_REF, HORMONE_REF`; the niggles-iteration test deleted. |
| 5 | Every retained range carries a source | New `constants/__tests__/logs.test.js` (3 tests: non-empty `source` string on every row, ≥ 1 row, lipid row shape); the Recovery reference-list test also asserts each distinct rendered `Source:` line. |
| 6 | Coverage not lowered; `check:colours` passes | Before (`main`) 92.64 / 85.01 / 89.36 / 93.28, after 92.61 / 85.21 / 89.33 / 93.26 (stmts/branches/funcs/lines): hundredths down on three measures from deleting 691 covered lines, branches up, thresholds 89/85/80 unchanged and met. `check:colours`: 23 literals, all tokenised or allowlisted. |

Also added: `MobilityView.test.jsx` `says no mobility sessions are recorded yet`;
`OverviewView.test.jsx` `shows an empty nutrition panel`. Full suite 124 files / 1557 tests
(main: 123 / 1549). Bundle: entry 146.8 / 150 KB unchanged, total 378.4 / 400 (was 382.0),
`logs-*.js` 22.2 kB raw / 9.8 KB gzip (was 23.8 / 10.7), precache 50 entries (was 51).

### Stage 6 verdicts and Gate 3

- **Test Results Analyzer: adequate.** Three of the four Recovery empty-state tests use an
  unscoped `getByText`, so they prove the string renders once, not under which heading; the source
  test guards shape, not meaning. Both left for slice 4b, which rewrites these tests against a
  mocked hook anyway.
- **Code Reviewer: APPROVE.** Should-fix: "target" → "limit"; the Mobility header paragraph named
  an injury, side and rehab history. Nits: HDL string wording, a roster reference in the lipid prep
  note, `toBeGreaterThan(0)` in the ordering test.
- **Reality Checker: fix-then-ship.** Re-ran the probe one literal at a time (45/45 detected on
  the control, 0 on the branch). Headline: the story is only partly met until slices 5 and 10.
  Wanted the "limit" rename in this PR and the source-verification caveat in the PR body.
- **Gate 3, Scott 2026-11-07: "Ship"** with the two recommended fixes: (1) "target" → "limit";
  (2) the Mobility header paragraph generalised. Both applied in the main thread; suite, lint,
  format, build, size, colours and probe re-run green on the final tree.

### Found on the way (not this slice)

- Personal content still in tracked source after 4a, by file and shape: `constants/logs.js` journal
  exports (slice 5); `constants/mobility.js` lines 3, 15, 31, 37, 50, 58, 79, 117, 123, 146, 151
  (slice 10 — a side-specific rehab site, two clinician references); `OverviewView.jsx` nutrition
  caption and cadence note (slice 8); `RecoveryView.jsx` lipid prep note roster reference (slice 9
  or 4b); keyword hits in `App.jsx:166-168`, `constants/coaching.js:115-117`,
  `constants/nutrition.js`, `views/ProgramView.jsx:1481` (unaudited; slices 5/7/9).
- `vite.config.js` emits hidden source maps on Vercel production builds; whether they are served
  with `sourcesContent` was not checked. Matters for the slice 5 and 10 residuals.
- No GitHub comment was posted on #412 or #416 (session rule); the residual list lives here and in
  the PR body.
