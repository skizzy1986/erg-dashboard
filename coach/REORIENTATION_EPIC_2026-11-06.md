# SplitIQ reorientation — epic plan (Gate 1 packet)

> Produced by `/orchestrate reorientating splitIQ based off the recently drafted vision.md` on
> 2026-11-06, `main` at `22ce0cb`, `VISION.md` read from draft PR
> [#410](https://github.com/skizzy1986/erg-dashboard/pull/410). Session:
> https://claude.ai/code/session_018vVjPz5bA8cyt1Qo1q9CTD.
>
> The Research and Story stages were read-only and the working tree was verified clean after
> every agent. **No application code has changed.** This file and its research appendix
> ([`REORIENTATION_RESEARCH_2026-11-06.md`](REORIENTATION_RESEARCH_2026-11-06.md)) are the only
> changes on the branch. Read this with `VISION.md` (the authority) and
> [`BACKLOG_AUDIT_2026-11-05.md`](BACKLOG_AUDIT_2026-11-05.md) (the ranked backlog it reshapes).
>
> **Privacy.** Health data is described by shape only — field names, row counts, categories —
> never by value. Keep it that way in every PR body, issue and comment derived from this plan.

## Status

| | |
|---|---|
| **Pipeline position** | **Slice 3 (#415) at Gate 3 as PR #430** (2026-11-07): `coach-chat` deleted and `coach_messages` dropped in production, both read back — see the slice specs. **GATE 1 PASSED 2026-11-06** (Scott: "go — yes to D1–D7 and D23, your recommendations stand"). **Slice 1 DELIVERED** as draft PR #426 (Gate 3 "ship it" ~06:25 UTC; #410 merged at `93fe6cb`, branch rebased on it). Next: slice 2 (#414) — cut its branch only after #426 merges so it inherits the new preamble; its Stage 3 spec needs D3 (four destinations) and D4 (drop `signal`), both decided. Specs and verdicts: [`REORIENTATION_SLICE_SPECS.md`](REORIENTATION_SLICE_SPECS.md). |
| **Decisions** | D1–D7 and D23 **yes**; D8–D22 the recommendations in §6 stand. Scott's own actions still open: merge #410 (D1); close #306 and #308 as not planned (slice 1); remove the `ANTHROPIC_API_KEY` edge secret when slice 3 runs (D7). **D5's snapshot condition waived by Scott 2026-11-06** (the backup never held the table). D6's undeploy is a Scott dashboard step — the Supabase MCP has no delete tool. |
| **How to continue** | Reply in the session, or comment on [PR #411](https://github.com/skizzy1986/erg-dashboard/pull/411) with decisions. The next step is Stage 3 (Spec) for the first approved slice. In a fresh session: `/orchestrate slice N of coach/REORIENTATION_EPIC_2026-11-06.md`, and give the agents the research appendix. |
| **Tracking** | Epic tracker #412 with one sub-issue per slice: 1 → #413, 2 → #414, 3 → #415, 4a → #416, 4b → #417, 5 → #418, 6 → #419, 7 → #420, 8 → #421, 9 → #422, 10 → #423, 11 → #424, 12 → #425. Each slice PR carries `Part of #412` and `Closes #<its sub-issue>`. |

## 1. Classification

**A product reorientation epic, run through the full chain.** The Story stage produced an
ordered PR sequence rather than one story, and Gate 1 decides the slicing; Spec → Build → Test
→ Review → Gate 3 then run **per slice**, one PR each.

Why not one PR: `VISION.md`'s cull table reaches nine constants/views files with 26 import
edges, an edge function, a table, the mobile destination list, the e2e tab list, five per-file
coverage gates, four CI guards and every document that opens with the solo-athlete framing.
`CLAUDE.md`'s own rule is "one extraction at a time, never a big-bang rewrite", and the app
must build, pass CI and stay usable after every merge.

## 2. Measured baseline (2026-11-06, `main` at `22ce0cb`)

Everything here was run or read today; nothing is quoted from a doc.

| Measure | Value | How |
|---|---|---|
| Tests | 125 files, 1,591 tests, all passing, 57.5 s | `npx vitest run --coverage` |
| Coverage (global) | lines **93.57** / functions **89.59** / branches **85.14** against floors 89 / 85 / 80 → headroom ≈ 4.6 / 4.6 / 5.1 points | same run |
| Bundle | entry **146.8 / 150 KB** (3.2 KB spare), total **385.6 / 400 KB** (14.4 KB spare); squat entry 116.4 / 117, squat total 27.6 / 30, squat 3D 138.2 / 145 | `npm run build && npm run size` |
| Vitest per-file thresholds | a per-file threshold whose path matches no file is **silently ignored** (Vitest 5.0.5, coverage-v8 5.0.3): a probe key for a nonexistent file ran green. Deleting `useCoach.js` without dropping its key at `web/vite.config.js:290` will not fail CI; drop it anyway. | probe config in the appendix, §E |
| `coach_messages` | **43 rows**, one user, 2026-06-27 → 2026-08-28 | live SQL |
| Tables live | **15**, not the 14 `CLAUDE.md` says: **`bp_readings`** exists in production (0 rows, owner-only RLS, typed per-measurement columns) with **no migration file in the repo** | live catalogue + `supabase/migrations/` |
| Edge functions | **4 of 8** repo directories are deployed: `vitals-import` v22, `coach-chat` v13 (JWT on), `vitals-import-api` v16, `vitals-sync` v4. The four `strava-*` functions are **not live**. | Supabase function list |
| **Health data is public today** | `web/src/constants/logs.js` compiles to its own chunk (`assets/logs-*.js`, 10.7 KB gzip) which is listed in the **public precache manifest** `sw.js` and contains a literal from the source file. Static assets are served by Vercel without authentication, so anyone who reads `sw.js` can fetch the health constants without logging in. Same for `schedule-*.js`, `nutrition-*.js`, `trainingConfig-*.js`, `RecoveryView-*.js`. | built `dist/`, `dist/sw.js`, `web/vercel.json` |

## 3. Epic story and definition of done

**As Scott, I want the repo, the deployed app and the database to say only what `VISION.md`
says — an anatomy-led training app with an honest load model, no AI coach and no personal
prescription engine — so that a new reader or collaborator cannot mistake it for a one-athlete
coaching tool, and no health record lives in tracked source or in a public bundle.**

Done means, checkably:

- **Repo.** `VISION.md` is on `main`. `erg-context.md`, `CLAUDE.md`, `README.md`,
  `training-science.md` and the design-sync docs carry no superseded framing. A `git grep` gate
  returns nothing for `useCoach`, `CoachView`, `coach_messages`, `coach-chat`,
  `api.anthropic.com` and `ANTHROPIC_API_KEY` outside historical docs. The culled constants and
  utils are deleted and every remaining export has an importer. `derivePaceZones`, the load
  model, readiness, `/squat` and `web/src/anatomy/` are unchanged.
- **Deployed app.** Desktop has no Coach, Program or Journal tab; mobile has four destinations.
  Nothing renders a roster, phase, microcycle, ladder or macro prescription that is not read
  from the database. Health sections read from the database with a usable empty state, and no
  personal data is in any shipped chunk.
- **Database.** `coach_messages` is dropped after a verified snapshot. The live `coach-chat`
  function is undeployed. `bp_readings` and any new health tables exist as committed
  migrations with owner-only RLS.
- **CI.** Every gate green; the coverage and bundle ratchets have not been lowered.

## 4. The sequence

Sizes are against one Spec → Build → Test → Review → Scott pass: **S** ≤ half a day, **M** ≈ a
day, **L** two or more. Every slice leaves the app building, green and usable. **No slice but
11 may touch `CLAUDE.md` or `.claude/skills/training-science.md`** — each merge to `main` that
touches either opens one `doctrine_sha` tracking issue, so the doc rewrite is batched into one
PR; review rejects a stray edit.

Rows marked *(orch.)* are the orchestrator's amendments to the Product Manager's cut, explained
under the table.

| # | Slice | Removes / adds / rewrites | Size | After | Backlog | Decisions first |
|---|---|---|---|---|---|---|
| 1 | Land VISION, re-brief the agents | Scott merges #410. Rewrites `.claude/skills/erg-context.md` §Project and `.claude/AGENTS.md:43`; adds a one-line "superseded, see VISION" pointer in `web/.design-sync/CLAUDE.md`. Touches no code, no doctrine file. | S | — | #306, #308 closed by issue edit | D1, D2 |
| 2 | Retire the coach client | `hooks/useCoach.js`, `views/CoachView.jsx`, their three tests, the `coach` entries in `App.jsx`, `MobileApp.jsx`, `constants/destinations.js`, the e2e tab, the per-file coverage key, `TSB_BANDS[].signal`. | M | 1 | — | D3, D4 |
| 3 | Retire the coach backend *(destructive)* | Snapshot read-back → undeploy `coach-chat` v13 → migration 013 drops `coach_messages` (+ rollback file) → delete `supabase/functions/coach-chat/` → drop the edge secret. | S | 2 deployed to production | Part of #312, #210 | D5, D6, D7 |
| 4a *(orch.)* | Health data out of source and out of the bundle | Deletes `bpLog`, `bloodsLog`, `NIGGLES`, `HORMONE_REF` and its comment block, `mobilityLog`, `nutritionLog` from `constants/logs.js`; the inline medication / weight-loss prose in `views/RecoveryView.jsx`; the sections that render them become a labelled "no data yet" panel. No schema. | S | 1 | — | D9, D11 |
| 4b *(orch.)* | Health records in the database | Migration capturing live `bp_readings` as-is; new typed tables per D8 with rollback; RecoveryView's BP / bloods / hormone / niggle sections read the DB. | M | 4a | — | D8, D10 |
| 5 | Delete the Program and Journal tabs | `views/ProgramView.jsx` (1,958 lines), `views/program/*`, `views/JournalView.jsx`, their tests, nav entries, the `expanded` state, e2e + visual entries; `constants/program.js` whole; `DECISION_LOG`, `HYPOTHESES`, `RULE_FIRING_HISTORY`, `CONFIDENCE_MIGRATION`; the `nutrition.js` and `exercises.js` exports only ProgramView read; the `ProgramYear.jsx` colour-allowlist entry. | M | 1 | closes #177 | D12 |
| 6 | Benchmarks | Recommended: cull `EVENT_LADDER`, `useBenchmarkStatuses`, `utils/benchmarkStatus.js`, `utils/eventWindow.js`, the link hooks/control, Calendar's ladder panel, three per-file keys, ~90 tests. `sessions.benchmark_key` (migration 009) stays as a dormant column. | M (L if "keep") | 5 | closes #233, #230 if cull | D13 |
| 7 | Calendar and `utils/schedule.js` | Calendar renders `sessions` rows only. Deletes `getRosterMode`, `ROSTER_*`, `resolveDay`, `getToday`, `getUpcomingSessions`, `SESSION_OVERRIDES`, `daySessions`, the day-strip data, `MICROCYCLE`, `SEASON*`. Keeps `logEntriesForDate`. | M | 6 | closes #265 | D14 |
| 8 | Overview | Removes the Adaptive Decision Engine, Today's Prescription, Phase context, Nutrition Status and inline sequencing rules. Deletes `utils/analysis.js`, `constants/coaching.js`, `constants/nutrition.js`, the rest of `schedule.js`, `utils/schedule.js`, `deriveTargets`, `assessMacro`/`macroColor`, the `MobileRecovery` deficit block, the `latestSquat` stat. | L | 7 | closes #209 | D15, D16 |
| 9 | Personal calibration | Deletes `CALIBRATION_STATUS`, `deriveCalibrationStatus`, `CRITICAL_POWER`, `POWER_DURATION`, `HR_ZONES`, `EST_MHR`, `HR130_POWER`; ErgView's `ergTrend`, `HR130_PROJECTION`, `analyzeBarometer` derive from `useErgSessions` with an "insufficient data" state. `derivePaceZones` stays put. | M | 8 | closes #179, #182 | D17 |
| 10 | Mobility and strength literals | Rehab-specific copy out of `constants/mobility.js` and `MobilityView.jsx`; `strengthTrend` out of `App.jsx` (StrengthView → DB-driven or empty). | M | 8 | Part of #222 | D18, D19 |
| 11 | Doctrine and docs rewrite | One PR: `CLAUDE.md`, `training-science.md`, `README.md`, `architecture.md`, `supabase-patterns.md`, `steward/SKILL.md`, `daily/SKILL.md`. | M | 10 | Part of #311 | D20 |
| 12 | Design-sync docs | Strike roster / Planning / Coach / nutrition from `HANDOFF.md`, `DESIGN_BRIEF.md`, `conventions.md`, `.design-sync/CLAUDE.md`, `config.json:34`, `NOTES.md`, `PROJECT-CONTEXT.md`. `designs/*.html` left for Scott's re-sync. | M | 10 | Part of #258 | D21 |

**Why this order.** Slice 1 first because `erg-context.md` is prepended to every pipeline
spawn: until it changes, every agent that builds the later slices is briefed with the
superseded framing. It avoids the doctrine-pinned files, so it opens no `doctrine_sha` issue.
Slices 2 and 3 next because the coach is the cleanest seam (one production importer, no reverse
dependency except `TSB_BANDS[].signal`), split so the client stops calling the function before
the function is undeployed. Slice 4a is pulled forward and made schema-free *(orch.)* because
§2 shows the health constants are fetchable today without authentication; deleting them is a
half-day PR with no design decision in it, and `VISION.md`'s priority is "out of tracked
source", which 4a meets on merge. 4b then adds the tables at its own pace. Slices 5–8 go
cleanest seam first: 5 deletes whole views with nothing worth keeping; 6 resolves the ladder
before 7 because Calendar renders it; 8 is last of the views because Overview mixes the kept
load chart with fitted sections under one 80/80/70 per-file gate. 9 and 10 sweep what is left.
11 and 12 are last because docs written before the code settles get written twice, and
`CLAUDE.md` is then edited exactly once.

**Orchestrator amendments to the PM's cut.**

- **4 → 4a + 4b.** The PM had one L-sized slice gated on four decisions. The public-chunk
  finding makes removal urgent and separable from the schema work.
- **Slice 2 → 3 gap.** The PM asked for "a few days" between them for installed PWAs holding a
  cached shell. The gap only needs to be "slice 2's Vercel production deploy is confirmed" —
  the app has one user, and Workbox refreshes the shell on the next load.
- **D13 (benchmarks)** is the decision the PM was least sure of (60 %), and so am I. See §6.

## 5. Per-slice stories

### Slice 1 — Land VISION, re-brief the agents
- **Story.** As Scott, I want the pipeline's spawn preamble to describe SplitIQ, so that every agent spec is written against the real product.
- **In.** Scott merges #410. Rewrite the Project paragraph of `.claude/skills/erg-context.md` and `.claude/AGENTS.md:43` ("solo dashboard"). Add a one-line pointer in `web/.design-sync/CLAUDE.md` that the Coach, roster, Planning and nutrition sections are superseded by `VISION.md`.
- **Out.** `CLAUDE.md`, `training-science.md`, `.claude/CLAUDE.md` (personal to Scott by design), any code.
- **Acceptance.** (1) `git ls-files VISION.md` on `main` is non-empty. (2) `git grep -n "Personal coaching dashboard\|Solo user: Scott" .claude/skills/erg-context.md` returns nothing and the file links `VISION.md`. (3) `npm run check:context7` passes: the `## Library documentation — Context7 first` heading and both tool names intact. (4) `check:design-sync` and `check:zones` pass. (5) `git diff --name-only origin/main` contains neither doctrine file; the next day no new doctrine issue exists. (6) No `web/` file changed, so the web jobs skip.
- **Backlog.** #306 and #308 closed as not planned by Scott (comment pointing at slice 12).

### Slice 2 — Retire the coach client
- **Story.** As Scott, I want no AI-coach surface in the app, so that nothing in it can talk to a model.
- **In.** `web/src/hooks/useCoach.js`, `web/src/views/CoachView.jsx`, `hooks/__tests__/useCoach.test.js`, `useCoachWiring.test.js`, `views/__tests__/CoachView.test.jsx`; the `coach` entries in `App.jsx` (lazy import :22, nav tuple :363, render :490), `MobileApp.jsx` (:8, :75), `constants/destinations.js:20`; `e2e/smoke.spec.js:28`; the `coach_model_pref` key; the per-file coverage key `vite.config.js:290`; comments naming `useCoach` (`useErgSessions.js:41`, `trainingLoad.js:27,132-143`, `recoveryAnalytics.js:56`); `.github/ISSUE_TEMPLATE/bug.yml:40`.
- **Out.** The edge function, the table, and the **coach rail** — `sessions.coach_note` / `coach_flag` / `source='coach'`, `coach_log`, `anchors`, `templates.origin='coach'` — which `VISION.md` keeps.
- **Acceptance.** (1) A test fails if `useCoach|CoachView|coach_messages|functions/v1/coach|anthropic` (case-insensitive) appears under `web/src` or `web/e2e`. (2) Desktop has 13 tabs, mobile 4 destinations; `App.test.jsx:231`, `MobileApp.test.jsx:58-68`, `useHashRoute.test.js:21,75` and the smoke spec updated. (3) Deep link `#/coach` resolves to the default destination, not the implicit `MobileRecovery` fall-through at `MobileApp.jsx:76` (Vitest). (4) `TSB_BANDS[].signal` handled per D4, with `tsbBand.test.js:43-46` updated in the same PR. (5) Per-file key removed; global 89/85/80 not lowered; before/after coverage in the PR body. (6) `npm run build && npm run size` pass with the entry figure reported. (7) Nav visual baselines regenerated; e2e green.
- **Edge cases.** An installed PWA with a cached shell — the function stays live until slice 3. A stored `coach_model_pref` is harmless and left alone.
- **Backlog.** None closed. Comment on #209 that its Coach half is moot.

### Slice 3 — Retire the coach backend (destructive)
- **Story.** As Scott, I want the coach function and its data gone from production, so that no AI path exists to maintain or secure.
- **In.** Read-back that the latest `backup_snapshots` row contains `coach_messages` with a count matching live (**precondition — stop if it fails**). Undeploy `coach-chat` v13 via the Supabase MCP. Migration `013_drop_coach_messages.sql` (table + index) with `013_..._rollback.sql` in the 008–012 convention (precondition header; restores structure, not rows). Delete `supabase/functions/coach-chat/`. Fix the dangling comments `vitals-sync/index.ts:18` and `strava-sync/index.ts:16`. Remove the `ANTHROPIC_API_KEY` edge-function secret (Scott, dashboard).
- **Out.** `.github/workflows/claude.yml` and its GitHub secret (unrelated).
- **Acceptance.** (1) Snapshot read-back as above. (2) Function-list read-back: `coach-chat` absent, the other three still ACTIVE. (3) Migration applied via `apply_migration` (named); `select to_regclass('public.coach_messages')` is null. (4) A guard fails if `supabase/functions/` or `web/` contains `api.anthropic.com` or `ANTHROPIC_API_KEY`. (5) `ci-functions` green, with the PR body stating it exercises nothing about the deletion. (6) Secret removal ticked by Scott (not repo-verifiable).
- **Edge cases.** Chat content was never in git. Snapshots are the only copy once the table is dropped. Nothing on the Coach (MCP) lane writes `coach_messages` — grep `.claude/` and `coach/` to confirm.
- **Backlog.** Part of #312 (only `vitals-sync` still lacks tests); Part of #210.

### Slice 4a — Health data out of source and out of the bundle *(orch.)*
- **Story.** As Scott, I want no health record in tracked source or in any shipped chunk, so that a public repo and a public static asset cannot leak one.
- **In.** Delete from `web/src/constants/logs.js`: `bpLog`, `bloodsLog`, `NIGGLES`, `HORMONE_REF` and the personal comment block above it, `mobilityLog`, `nutritionLog`. Delete the inline medication / weight-loss prose at `views/RecoveryView.jsx:~423-436, 523-525` and the single-night sleep narrative `:337-376`. The BP, bloods, hormone and niggle sections render a labelled "no data yet" panel. `MobilityView` loses the log list; `OverviewView` loses the nutrition-log rows (the section itself goes in slice 8).
- **Out.** Any schema. `LIPID_REF` may stay only if given a `source` (VISION: no unsourced reference range) — otherwise it goes too.
- **Acceptance.** (1) `git grep` for each removed identifier returns nothing in `web/src`. (2) After `npm run build`, no `dist/assets/logs-*.js` chunk exists, or it contains no string literal that was in the deleted exports (a test over the built output, or a grep in the PR body). (3) Empty-state tests for the four RecoveryView sections. (4) `RecoveryView.test.jsx:18` no longer imports the deleted exports. (5) Coverage not lowered; `check:colours` passes.
- **Edge cases.** The 3 BP rows and 2 niggle rows in source are either re-entered through the MCP lane (D9) or let go; neither path touches git. Git history keeps what was committed (D11).

### Slice 4b — Health records in the database *(orch.)*
- **Story.** As Scott, I want blood pressure, bloods, hormone panel and injury history stored behind owner-only RLS, so that the Recovery tab reads them from the database.
- **In.** A committed migration capturing live `bp_readings` exactly as it is. New typed tables per D8 with a rollback file. RecoveryView's four sections read the DB through hooks.
- **Out.** In-app entry forms (D10). The readiness, RHR and sleep sections, which are `useVitals`-driven and unchanged.
- **Acceptance.** (1) `information_schema` read-back matches the migration for `bp_readings`. (2) Each table: RLS enabled, one owner policy with `USING` and `WITH CHECK`; `pg_policies` read-back; a second user and the anon role each see zero rows. (3) Loading, error and empty states render; errors reach `captureError`; offline serves cached react-query data. (4) `measured_at` renders in local time; a test pins a timestamp near local midnight. (5) Every remaining reference range carries a `source` (Vitest over the table). (6) `bpCategory` keeps its tests.

### Slice 5 — Delete the Program and Journal tabs
- **Story.** As Scott, I want the season-plan and decision-diary tabs gone, so that no screen prescribes a season.
- **In.** `views/ProgramView.jsx`, `views/program/ProgramMicrocycle.jsx`, `ProgramYear.jsx`, `views/JournalView.jsx`, their four test files, the nav entries and `expanded` state in `App.jsx`, the e2e tab and visual snapshots `desktop-program` / `desktop-journal`; all of `constants/program.js`; `DECISION_LOG`, `HYPOTHESES`, `RULE_FIRING_HISTORY`, `CONFIDENCE_MIGRATION`; the `nutrition.js` and `exercises.js` exports only ProgramView read (`REP_SCHEMES`, `LOWER_DIFFERENTIATION`, `STRENGTH_PRINCIPLES`, `MACRO_TARGETS`, `MF_PROGRAM`, `DEFICIT_PROGRAM`, `NUTRITION_PRINCIPLES`, `FUELLING`); the `views/program/ProgramYear.jsx` entry in `check-colour-literals.mjs`.
- **Out.** `STRENGTH_TEMPLATES`, `PREHAB_NOTE` (StrengthView reads them). `EVENT_LADDER` (slice 6).
- **Acceptance.** (1) Files gone; desktop 11 tabs; smoke and visual specs updated. (2) `check:colours` passes with the stale entry dropped in this PR. (3) Orphan check: every deleted export has zero importers; lint reports no unused imports. (4) Global thresholds not lowered, before/after reported (ProgramView is at 83.87 lines / 47.76 branches, so this should raise them — inferred). (5) `npm run size` passes with entry and total reported. (6) `trainingConfig.js` untouched. (7) Mobile suites pass.
- **Backlog.** Closes #177 as not planned (its panel is deleted).

### Slice 6 — Benchmarks
- **Story.** As Scott, I want the app to stop carrying one athlete's event pathway, so that nothing models a season that is not the user's.
- **In (if D13 = cull).** `EVENT_LADDER`, `hooks/useBenchmarkStatuses.js`, `utils/benchmarkStatus.js`, `utils/eventWindow.js`, `useBenchmarkSessions`, `useLinkBenchmarkSession`, `components/BenchmarkBadge.jsx`, `BenchmarkLinkControl.jsx`, Calendar's ladder section, their per-file coverage keys, ~90 tests.
- **Out.** `sessions.benchmark_key` and its unique index (migration 009) — left dormant, so the slice is not destructive.
- **Acceptance.** (1) No `EVENT_LADDER|benchmark_key` reader in `web/src`. (2) SQL read-back: the `sessions` column list and the count of non-null `benchmark_key` rows are identical before and after. (3) Per-file keys removed; global thresholds hold after removing well-tested code — if not, add tests, never lower the ratchet. (4) No Calendar test matches `'SEASON 1 LADDER'`. (5) Test count before/after reported.
- **Backlog.** Closes #233 and #230 as not planned if cull. If keep, both survive and this slice is an L rewrite with its own Gate 2.

### Slice 7 — Calendar and `utils/schedule.js`
- **Story.** As Scott, I want the Calendar to show what happened and what the database says is planned, so that it asserts no roster.
- **In.** Calendar renders `sessions` rows only. Deletes `getRosterMode`, `ROSTER_ANCHOR`, `ROSTER_REGIMES`, `ROSTER_OVERRIDES`, `resolveDay`, `getToday`, `getUpcomingSessions`, `SESSION_OVERRIDES`, `daySessions`, the roster-derived day-strip states, `MICROCYCLE`, `SEASON`, `SEASON_2`, `VOLUME_PROGRESSION`. Keeps `logEntriesForDate`; keeps the DB-planned / done / cancelled states that come from `sessions.status` (D14).
- **Out.** Overview (imports `PHASE_CONTEXT` until slice 8).
- **Acceptance.** (1) `schedule.test.js` and `CalendarView.dayStrip.test.jsx` pin no real 2026 dates — `git grep 2026` in those files returns nothing. (2) `logEntriesForDate` tests cover unpadded `M/D/YY`, single-digit month and day, and a December → January rollover. (3) A user with zero sessions sees an empty calendar. (4) No roster-derived "missed" state exists. (5) `CalendarView.jsx` still meets 80/80/70. (6) Mobile suites pass; `MobileToday` reads its planned row from the DB and imports nothing culled.
- **Edge cases.** Slow network → loading state; offline → query cache. Ordering by `date_iso`, never the text `date`.
- **Backlog.** Closes #265 as not planned (`dayStatus` deleted; its body already accepts that outcome).

### Slice 8 — Overview
- **Story.** As Scott, I want Overview to show load, readiness and recent sessions only, so that it never tells the user what to do today.
- **In.** Remove the Adaptive Decision Engine (:560-786), Today's Prescription (:787-951), Phase context (:395-500), Nutrition Status (:1128-1369) and the inline sequencing rules (:1370-end); the today-session boxes and countdowns that need `MICROCYCLE`. Delete `utils/analysis.js`, `constants/coaching.js`, `constants/nutrition.js`, the remainder of `constants/schedule.js` and `utils/schedule.js`, `deriveTargets` (`trainingLoad.js:112`), `assessMacro` / `macroColor`, the `MobileRecovery.jsx:~270-313` deficit block, the `latestSquat` stat.
- **Out.** `sessionLoad`, `calcTrainingLoad`, `TSB_BANDS`, `computeReadiness` — unchanged, tests pass as they are.
- **Acceptance.** (1) With `anchors.current_phase` null no screen renders a phase claim; with it set, only the anchor value renders (Overview and `MobileToday`). (2) The load chart still renders and the null-CP "load unavailable" path is covered. (3) Readiness with fewer than 14 baseline samples uses the fallbacks, tested. (4) Overview still passes 80/80/70 at its smaller size. (5) No import of `analysis`, `coaching`, `nutrition` or `schedule` remains. (6) Build and bundle pass.
- **Backlog.** Closes #209 as superseded once 3, 7 and 8 are merged; its keep-side principle ("the UI reads the anchor") is criterion 1.

### Slice 9 — Personal calibration
- **Story.** As Scott, I want no screen to hold one athlete's calibration as a literal, so that nothing contradicts the live CP anchor.
- **In.** Delete `CALIBRATION_STATUS`, `deriveCalibrationStatus`, `CRITICAL_POWER`, `POWER_DURATION`, `HR_ZONES`, `EST_MHR`, `HR130_POWER` from `constants/trainingConfig.js`. ErgView's `ergTrend` (:34), `HR130_PROJECTION` (:184) and `analyzeBarometer` (:126, hardcodes `'2026/'`) derive from `useErgSessions` with an "insufficient data" state. `ErgLiveView`'s duplicate `SRPE_GUIDE` (:14) resolved to one.
- **Out.** Moving `derivePaceZones` (D17). `SRPE_GUIDE`, `SRPE_SCALE`, `FTP_TEST`.
- **Acceptance.** (1) `derivePaceZones(205)` output byte-identical (the `PaceTrendChart` fixture); `check:zones` passes; its four reaching surfaces untouched. (2) `check:colours` passes — the Recovery-zone `#666` fallback stays valid or its allowlist entry is dropped in the same PR. (3) `git grep "'2026/'"` and numeric CP / HR literals in `src` (outside tests and fixtures) return nothing. (4) ErgView shows "insufficient data" below the chart's minimum and "CP unavailable" without an anchor. (5) ErgView coverage not lowered.
- **Backlog.** Closes #179; closes #182 (its open exit criterion is criterion 3).

### Slice 10 — Mobility and strength literals
- **Story.** As Scott, I want the mobility routines to be generic and no lift history to sit in `App.jsx`, so that nothing personal ships in the bundle.
- **In.** Strip rehab-specific copy from `constants/mobility.js` (header, notes at :51, :99, :147, the `rehab` flags) and `MobilityView.jsx:38`; remove `MOBILITY_STREAK_NOTE`. Remove `strengthTrend` (`App.jsx:99-136`); StrengthView shows a DB-driven trend or an empty state.
- **Out.** Per-user mobility assignment (D18). The `exercise_prs` view migration (#222 item 3).
- **Acceptance.** (1) Removed identifiers have zero hits. (2) `MobilityView` passes its per-file gate. (3) `StrengthView` renders with the 2 live `strength_sets` rows and with zero. (4) The nine lift series are exported outside git or discarded before merge (D19). (5) The `PRIMARY_LIFTS` name mismatch does not make the empty state misreport.
- **Backlog.** Part of #222 (items 3 and 4 survive).

### Slice 11 — Doctrine and docs rewrite
- **Story.** As Scott, I want `CLAUDE.md` and the README to describe SplitIQ and the real repo, so that nobody is misled by the solo-athlete framing.
- **In.** One PR: `CLAUDE.md` (:16, :19-20, :81, :175, :222, :237, :253-286, :324, :533, :596-619 and the counts), `.claude/skills/training-science.md` (:17, :76-79), `README.md` (:4, :36, :87, :91, :123, :172, :253), `.claude/skills/architecture.md` (:26-30, :61, :78), `supabase-patterns.md` (:26-60, :140-146 — stale independent of the pivot), `steward/SKILL.md` (:52, :113), `daily/SKILL.md:60`.
- **Out.** `.claude/CLAUDE.md`, `docs/personal-claude-instructions.md` (D22), the design-sync docs.
- **Acceptance.** (1) `git grep -il "personal coaching dashboard\|replace.*Strava\|coach-chat\|coach_messages\|Microcycle\|FIFO"` over tracked `.md` returns only historical docs (`coach/work-orders/`, the audit, this plan). (2) `check:zones` passes; any retained band has a CP quoted before it — recommendation: quote no personal numbers (D20). (3) `check:context7` passes with `### Context7` intact. (4) Hand-stated counts (tabs, tables, functions, bundle figures) removed or replaced by "re-measure with …". (5) Exactly one merge to `main` touches the two doctrine files; read-back: one tracking issue, closed by the Routine, `doctrine_sha` matching.
- **Backlog.** Part of #311.

### Slice 12 — Design-sync docs
- **Story.** As Scott, I want the design authority docs to stop specifying screens the vision forbids, so that the next design session does not rebuild them.
- **In.** `HANDOFF.md` (:9, :207, :214, :292, :317-330, :410-411, :419, :426-429, :442, :453-474, :498), `DESIGN_BRIEF.md` (:81, :179, :225-242, :311-319, :352, :390-391, :677), `conventions.md` (:270, :328, :338, :343, :366-380), `.design-sync/CLAUDE.md` (:42, :59 — replaces the slice 1 pointer), `config.json:34`, `NOTES.md:224`, `PROJECT-CONTEXT.md:112`.
- **Out.** `designs/coach.html`, `designs/desktop-planning.html` (design-owned, `ownership.json:41`; flagged for removal at re-sync). The re-sync itself (`/design-login`, Scott only).
- **Acceptance.** (1) `check:design-sync` passes: component paths exist, the `conventions.md` contrast claims hold, every file has an owner. (2) Grep for the Coach destination, roster, `rosterCheck`, Planning and nutrition status in the edited docs returns nothing. (3) PR body lists the re-sync as a Scott-only follow-up.
- **Backlog.** Part of #258.

## 6. Decisions for Gate 1

Each: the question → recommendation → consequence. **Answer now** = blocks slices 1–3.
**Answer before the slice** = the recommendation is the default unless Scott says otherwise,
except where marked *destructive*, which always needs an explicit yes.

**Answer now**

- **D1.** Is `VISION.md` final enough to merge (#410 is a draft)? → Yes: mark ready and merge. If no, nothing starts.
- **D2.** Accept `CLAUDE.md` staying stale (it still carries the superseded framing) until slice 11, for exactly one doctrine issue? → Yes. If no, expect one doctrine issue per partial edit.
- **D3.** Mobile: five destinations → four, or repurpose the fifth? → Four. `VISION.md` adds nothing to put there; `DESIGN_BRIEF`'s Playbook idea assumed a Coach screen. The design-sync docs carry the delta until slice 12.
- **D4.** Drop `TSB_BANDS[].signal` and its three-way mapping? → Drop. Its only production reader is `useCoach.js:49`.
- **D5.** *Destructive.* Drop `coach_messages` (43 rows)? → Yes, only after the snapshot read-back passes.
  **Superseded 2026-11-06 (slice 3, #415):** the read-back failed — `public.backup_snapshot()` names eight tables and has never included `coach_messages` (0 of 30 snapshots). Scott waived the condition ("Drop without a copy"); the rows are accepted as lost. See [`REORIENTATION_SLICE_SPECS.md`](REORIENTATION_SLICE_SPECS.md) §Slice 3.
- **D6.** *Destructive.* Undeploy `coach-chat` v13? → Yes. Nothing calls it after slice 2, and its system prompt hardcodes personal details.
- **D7.** Remove the `ANTHROPIC_API_KEY` edge-function secret? → Yes. Scott-only dashboard action; not repo-verifiable.
- **D23.** *(orch.)* File an epic tracking issue with one sub-issue per approved slice, labelled and put on the Split IQ board? → Yes; it is what `WORKFLOW.md` and the audit's process rules ask for, and it gives each slice its `Closes #N`.

**Answer before the slice**

- **D8** (4b). Typed tables per marker class, following the live `bp_readings`, or one generic `health_markers(kind, value, unit, measured_at)`? → Typed, following `bp_readings`. This amends `VISION.md`'s name for the target; Scott should know it contradicts the document.
- **D9** (4a). Re-enter the 3 BP rows and 2 niggle rows through the MCP lane, or let them go? → Re-enter the BP rows; let the rest go. Either way it never touches git.
- **D10** (4b). Read-only in v1? → Yes; in-app entry is a separate feature.
- **D11** (4a). Rewrite git history to purge the committed health data? → No, not in this epic. It force-pushes a public repo with collaborators, forks keep the data, and `VISION.md` already accepts that history is retained. Scott's call as a separate manual operation.
- **D12** (5). Delete the Program tab whole, including its general reference content (movement screen, warm-up, `SRPE_SCALE`, strength guidelines)? → Yes, keeping `SRPE_GUIDE` (LogView reads it).
- **D13** (6). Benchmarks: a general concept to keep, or one athlete's pathway to cull? → Cull the ladder content, the Calendar panel and the machine; leave `sessions.benchmark_key` dormant. Confidence moderate: the machine (`benchmark_key` ↔ session link, statuses) is generic and well tested, but it serves a surface that has no user without a ladder, and a generic "this session was a CP test, update the anchor" feature is a new issue, not this epic. If keep, slice 6 becomes L with its own Gate 2.
- **D14** (7). Calendar after the cull is a session-log view: the DB-driven planned / done / cancelled states stay, the roster-derived "missed" goes? → Yes.
- **D15** (8). Delete `utils/analysis.js` (`evaluateRules`, `autoregulate`) as "adaptive rules"? → Yes. `computeReadiness` stays.
- **D16** (8). Delete nutrition wholesale, including the `MobileRecovery` deficit block? → Yes; it is `VISION.md`'s cull row.
- **D17** (9). `derivePaceZones` stays in `trainingConfig.js`? → Yes. Moving it means four surfaces in one PR for no gain.
- **D18** (10). Defer per-user mobility assignment (needs schema)? → Defer.
- **D19** (10). Export the nine-lift `strengthTrend` e1RM series outside git before deleting it? → Export. It is history that exists nowhere else (#222).
- **D20** (11). Quote no personal CP or zone numbers in `CLAUDE.md`? → None. `check:zones` then polices nothing there.
- **D21** (12). May slice 12 edit `HANDOFF.md`, the normative design authority? → Yes, strike-only, `designs/*.html` left for the re-sync.
- **D22.** *(orch.)* `docs/personal-claude-instructions.md:38` holds biographical and employment detail in a public repo. `VISION.md` does not cover it. Remove, or keep? → Remove it from the public repo (it belongs in Scott's local Claude settings). Not in any slice until Scott says.

## 7. Backlog disposition

The eight that close with the cull: **#306, #308, #209, #177, #182, #265, #233, #230** — the
last two conditional on D13, #265 inferred from its title. Two disagreements with the Stage 1
classification are marked.

| Issue | Verdict | Slice | Reason |
|---|---|---|---|
| #306 | closes with cull | 1 | Roster contract + season plan in the load model (body read). |
| #308 | closes with cull | 1 | The Planning screen is the prescription layer (body read). |
| #209 | closes with cull | 8 | Coach half moot, UI half superseded; keep-side principle met by slice 8 criterion 1. |
| #177 | closes with cull | 5 | Its panel is deleted with JournalView (body read). |
| #182 | closes with cull | 9 | Tracker for #177 and #179; closes when its exit criterion is a passing grep. |
| #265 | closes with cull | 7 | `dayStatus` deleted. Title only. |
| #233 | closes if D13 = cull | 6 | Reschedule pass over the ladder (body read). |
| #230 | closes if D13 = cull | 6 | Link round-trip e2e (body read). |
| #179 | **rescope** (disagrees with Stage 1) | 9 | Keep-side: live-wire the calibration off real sessions. |
| #217 | **rescope** (disagrees with Stage 1) | none | The in-app sRPE queue is general and survives; the "via Coach" route is moot. |
| #312 | rescope | 3 | Only `vitals-sync` still lacks tests. |
| #222 | rescope | 8, 10 | `strengthTrend` goes; items 3 (`exercise_prs` migration) and 4 survive. |
| #311 | survives | 11 | Slice 11 is Part of; the check-count items stay. |
| #210 | survives | 3 | Drift shrinks once `coach-chat` is gone. |
| #260, #264 | survive | none | Status model and Progress pane. Title only. |
| #258 | survives | 12 | Owner-only re-sync. |
| #256, #280 | survive | none | Design guard and prose. Title only. |
| #79 | survives | none | StrengthLogger tests; the ProgramView split goes with slice 5. |
| #55, #56 | survive | none | Imports "where useful"; #56's priority predates the pivot — Scott to re-confirm. |
| #382, #407, #408 | unrelated | none | `/squat` track. |
| #216 | unrelated | none | `duration_min` migration; needs Scott's approval. |
| #326, #327, #342 | unrelated | none | CI and infra. |
| #63 | closed 2026-11-06 | none | Closed by #409 (every action reference SHA-pinned). |

## 8. Out of scope for the epic

- New flagship movements (deadlift, bench, row, press) — one pipeline run each.
- The exercises → anatomy link — the live `exercises` table (873 rows) is not reproducible from migrations; a seed comes first. `exercise_media.model_3d_key` is the only hook and nothing reads it.
- Strava deployment — the four `strava-*` functions are not live. Note for any later multi-user or shared view: Strava's API terms reportedly bar showing a user's Strava data to anyone but that user (secondary sources only, per the VISION.md session's handoff); the live terms need reading before anything multi-user is built on the importer.
- The SimTK licence read (`NOTICE.md:42-50`) — owner action gating wider distribution.
- The `exercises` seed and the `exercise_prs` view migration — reproducibility fixes independent of the cull.
- Rewriting git history (D11).
- In-app entry forms for health data (D10).
- `STRENGTH_TEMPLATES` in `constants/exercises.js` — one athlete's templates (inferred), not named by `VISION.md`, and the DB `templates` table already exists.
- `docs/personal-claude-instructions.md` (D22).

## 9. Risks

1. **The design-sync docs contradict the app until slice 12, and the real fix needs Scott's interactive `/design-login`.** A design session in between can rebuild Planning or Coach. Mitigation: the slice 1 pointer.
2. **Nobody has measured the ratchet against these deletions.** Most cull-zone views sit at or near 100 % lines (above the 93.57 average), so deleting them lowers the global figure a little; ProgramView (83.87 / 47.76) and ErgView raise it. The net move per slice is small against ~4.6 points of headroom, but each PR must report before/after and add tests rather than lower a threshold.
3. **Doctrine batching is fragile.** One stray `CLAUDE.md` edit in slices 2–10 costs an extra doctrine issue, and slice 11 depends on every earlier slice having landed because the docs cite counts and file names.
4. **Health data is public in two places until 4a merges** — git history (retained, D11) and the shipped `logs-*.js` chunk (§2). 4a is the fix for the second; the first is Scott's call.
5. **`VISION.md`'s cull table is incomplete and this plan widened it.** It does not name `utils/analysis.js`, `strengthTrend`, `SESSION_OVERRIDES`, ErgView's inline arrays, the `MobileRecovery` deficit block or Overview's inline sequencing rules; the plan scopes them in because they only make sense with the cull. Scott confirms the additions at this gate.
6. **Production is ahead of, and behind, the repo.** `bp_readings` and the `exercise_prs` view exist live without migrations; four `strava-*` functions exist in the repo without deployments. CI cannot verify any destructive step in slice 3, so the read-back criteria carry the weight.

## 10. Provenance

- Research: three read-only Codebase Onboarding Engineer agents (sonnet), reports in the appendix (§A–C), `git status` clean after each.
- Story: one read-only Product Manager agent (sonnet); its sequence, criteria, disposition and decisions are §3–§7 here, with the orchestrator's amendments marked *(orch.)*.
- Live reads and measurements: the orchestrator, via the Supabase MCP (read-only SQL and listings), `npx vitest run --coverage`, `npm run build && npm run size`, and a grep of the built `dist/`.
- Library facts: Vitest's `coverage.thresholds[glob-pattern]` docs via Context7 (`/vitest-dev/vitest`) do not state the missing-file behaviour; it was settled empirically (appendix §E).
