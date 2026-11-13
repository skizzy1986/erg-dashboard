# SplitIQ reorientation — slices 4b–10: Stage 1 research maps

> Codebase Onboarding Engineer (sonnet), read-only, 2026-11-13, `main` at `2cd7d9e`. Verbatim except one redacted personal value. Companion to [`REORIENTATION_GATE2_4b-10.md`](REORIENTATION_GATE2_4b-10.md).

## Slice 4b

### Stage 1 research: slice 4b (#417), health records behind RLS

Read-only. Nothing in the DB was queried. Health data is described by shape only. Line numbers are against `2cd7d9e` (main), clean tree.

### 1-line summary
A React 19 + Vite SPA where `RecoveryView.jsx` already has four empty health cards (BP, bloods, hormone, injury) left by 4a. Slice 4b has to back them with DB hooks, and `bp_readings` is live with no migration file.

### 1. RecoveryView and related code

**`web/src/views/RecoveryView.jsx`** (488 lines)
- `EmptyPanel({children})` is a local, non-exported component at `:20-34`. It is a `<p>` styled with centred `THEME.muted` 13px text and 16px padding.
- `LIPID_SOURCES` at `:16-18` dedupes `LIPID_REF` by `source.url`.
- The view calls `useVitals()` at `:43-51` and destructures `latest: today` and `isLoading: vitalsPending`.
- The `if (!today)` gate is at `:60-73`. It returns a "Loading vitals…" or "VITALS UNAVAILABLE" div, and everything after it sits inside the else-branch IIFE.
  - **All four health cards are inside that branch**, so with no vitals they never render. 4a's spec says 4b lifts this gating.
- The four sections, each a card with a heading and `EmptyPanel`:
  - Blood Pressure: `:350-371`, `EmptyPanel` at `:370` ("No blood pressure readings yet.").
  - Bloods / Lipid: `:373-436`. `EmptyPanel` at `:393`. Static `LIPID_REF` rows at `:394-412`. Source links at `:421-434`. The rows are reference limits, not results.
  - Hormone: `:438-459`, `EmptyPanel` at `:458`.
  - Injury Watch: `:461-482`, `EmptyPanel` at `:481`.
- The readiness, metrics and RHR trend sections (`:76-348`) are out of scope. They are `useVitals`-driven.
- `RecoveryView` is rendered from `App.jsx` and `OverviewView.jsx`. `views/mobile/MobileRecovery.jsx` is separate and shows vitals only; it has no BP or bloods.

**Existing test, `web/src/views/__tests__/RecoveryView.test.jsx`**
- It mocks `../../hooks/useVitals.js` at `:13-16` with `useVitalsMock`. The mock return shape is built at `:30-48`.
- `LIPID_REF` stays real (`:18`). Lipid rows are asserted at `:138-148`.
- It has the 4a empty-state `it.each`, scoped with `within`.
- Any new hooks imported by `RecoveryView` will need mocks here, or a `QueryClientProvider` wrapper.

**`LIPID_REF`**
- Defined in `web/src/constants/logs.js:285-` as five rows `{marker, target, unit, color, source}`. The marker names are Total Cholesterol, LDL, HDL (male), HDL (female) and Triglycerides.
- `AACB_LIPID_2018 = {name, url}` is at `:278-281`. All five rows share it. Scott's open Gate 3 item from 4a: he reads the PDF before merge.
- Test: `web/src/constants/__tests__/logs.test.js`.
  - Every row has a named `https` source.
  - The five rows are pinned exactly.
  - No removed export remains (`bpLog`, `bloodsLog`, `NIGGLES`, `HORMONE_REF`, etc.).
- `HORMONE_REF` was deleted at the 4a Gate 2. There is currently no hormone reference data in the tree. Acceptance criterion 5 ("every remaining reference range carries a source") therefore covers only `LIPID_REF` today, plus whatever 4b adds.

**`bpCategory`**
- Defined in `web/src/utils/formatting.js:53-73`, with a comment at `:51-52` saying "AU/most guidelines… Confirm YOUR target with your GP".
- It is currently not imported by `RecoveryView`. 4a dropped the import. The function and its tests remain.
- Tests: `web/src/utils/__tests__/formatting.test.js:156-210`.
  - Invalid inputs give `Check reading`. The cases cover string `'120'`, undefined, sys outside 60..260, dia outside 30..160, and `dia >= sys`.
  - Valid cases: (115,75) Optimal, (125,78) Normal, (135,85) High-normal, (125,85) High-normal, (150,95) Elevated.
  - The `Check reading` range matches the live CHECK constraints on `bp_readings`: sys 60..260, dia 30..160.
- **Parked bug (from 4a Stage 6):** `bpCategory` has no source. At `formatting.js:69-71`, `if (sys < 140 || dia < 90) return High-normal` labels a high-systolic / normal-diastolic reading as High-normal.
  - Example: (150,75) takes this branch and returns `High-normal`, not `Elevated`. The `||` should logically be `&&`.
  - The existing test (125,85) passes under both forms, so the tests do not pin the bug. Acceptance 6 says the tests are kept.
- Also `.claude/skills/architecture.md:43` lists `bpCategory`.

### 2. Hook patterns to copy

**`web/src/hooks/useAnchors.js`** is the cleanest template.
- `useQuery({ queryKey: ['anchors'], queryFn, staleTime: 60_000 })` at `:16-30`.
- `queryFn` runs `supabase.from('anchors').select(...).is('superseded_at', null)`, then `if (error) throw error`, then `data ?? []`.
- There is no explicit `user_id` filter. It relies on RLS.
- It returns `{...query, ...derived}`.

**`web/src/hooks/useVitals.js`**
- `queryKey: ['vitals']`, with `.select(cols).order('date', {ascending:false}).limit(30)` at `:19-28`.
- It maps rows to camelCase-ish fields and casts numerics with `Number()`.
- It exposes `isLoading` and `isError` through `...query`, which `RecoveryView` reads.

**Client:** `web/src/supabaseClient.js` exports `supabase`.

**Error path to `captureError`**
- `web/src/main.jsx:42-57` builds the `QueryClient` with `queryCache: new QueryCache({onError: handleQueryError})` and a `MutationCache`.
- Defaults: `staleTime: 60_000`, `retry: 2`, `refetchOnWindowFocus: false`.
- `web/src/utils/queryErrorHandlers.js:11-17`: `handleQueryError(error, query)` calls `captureError(error, {source:'react-query', kind:'query', queryKey})`.
- So any new `useQuery` that does `if (error) throw error` reaches Sentry with no extra code.
- The CLAUDE.md rule says do not call the SDK directly from a hook.
- `main.jsx` is excluded from coverage. The handler logic is covered in `utils/__tests__`.

**Offline: the react-query cache is NOT persisted.**
- `grep persist|PersistQuery|networkMode` over `web/src` finds nothing relevant, and there is no `persistQueryClient` in `main.jsx`.
- The in-memory cache survives only within a session.
- The only "offline" layer is Workbox, in `web/vite.config.js:106-112`: `urlPattern: /supabase\.co\/rest/`, `NetworkFirst`, `cacheName 'supabase-api'`, `networkTimeoutSeconds: 3`, `expiration {maxEntries: 50, maxAgeSeconds: 300}`.
- That cache is HTTP-level, short-lived (5 min) and capped at 50 entries.
- Acceptance 3 ("offline serves cached react-query data") has no existing mechanism beyond in-session cache and this 5-minute Workbox cache. The Spec stage must settle what it means.
- Health responses also land in that shared Workbox cache, which is a privacy point worth noting.

### 3. Migration conventions

**Files:** `supabase/migrations/` holds `000`-`014`. Two `011`s exist (`011_revoke_security_definer_execute` and `011_sessions_strava_activity_id`), grandfathered in `check-migrations.mjs:38-39` (`GRANDFATHERED_DUPLICATE_PREFIXES = ['011']`). **Next number is `015`.**
- Forward regex is `^\d{3}_[a-z0-9_]+\.sql$` (`:50`). The rollback suffix is `_rollback.sql`.
- Rollbacks and stem-named applies are enforced from `CONVENTION_FROM = 14` (`:42`). Every `>=014` forward file needs `<stem>_rollback.sql` (`:201-205`).

**Header convention**
- Forward files open with `-- NNN_name.sql`, then "Additive + reversible (…_rollback.sql)", then context and live-state notes (see 012 and 014).
- Rollbacks open with `-- Rollback for NNN_name.sql. NOT auto-applied.`, then data-loss and ordering warnings, e.g. 013's "RESTORES STRUCTURE ONLY".
- 012's rollback lists a pre-drop export query, and 013's recreates the live-read-back shape.

**RLS policy shape**
- 006 (`:28-32`, `:50-54`) is `enable row level security; drop policy if exists X_owner on T; create policy X_owner on T for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());`.
- 007 (`:144-180`) is the same shape using `_all` or `_rw` names.
- 012 is the stricter variant. `strava_tokens` and `strava_oauth_state` use ENABLE + FORCE RLS, `REVOKE ALL … FROM public, anon, authenticated`, and no policy. `strava_sync_state` uses `GRANT SELECT … TO authenticated` plus a SELECT-only owner policy (`:128`).
- 006 and 007 do not revoke anon table grants. Live `bp_readings` follows that pattern (see risks).
- `user_id` column convention is `uuid references auth.users not null default auth.uid()` (006). Live `bp_readings` also has `on delete cascade`.

**`supabase/migrations/manifest.json`**
- Top keys are `$comment`, `schemaVersion: 1`, `project`, `files[]` and `liveOnly[]`. Entry keys are `file`, `status`, `live[{version,name}]`, `reason`, `note`, `related`, `issue`.
- Statuses are `applied | mirror | unapplied | pending`.
- **`mirror` is rejected for any file numbered `>=014`** (`check-migrations.mjs:~306-312`, "mirror is only valid for pre-014 files").
- Rules for a new file:
  - `applied` needs a `live` list whose name equals the file stem or starts with `stem_` (`:284-291`).
  - `pending` is "merged, awaiting apply".
  - A forward file must be accounted for once.
- **Live `bp_readings` is in `liveOnly`:** `{"version":"20261106035559","name":"bp_readings","note":"Reorientation epic; no file. Backup coverage gap tracked in #428","issue":428}` (manifest `:263-268`).
- Collision to settle in Spec: `015_bp_readings.sql` cannot be `applied` against live name `bp_readings` (the stem would be `015_bp_readings`). The live-name rule means the file would need either `pending` (then applied under its own stem) or a liveOnly update. Spec should read `check-migrations.mjs:430-500` (live-mode drift logic) before choosing. The `liveOnly` entry also has a fixture test: `web/scripts/__tests__/fixtures/live-migrations-2026-11-09.json:113` names `bp_readings`.
- `vitals_nutrition_intake` (version `20261106035601`) is another live-only row with no file. It is outside 4b.

**CI that reads the manifest**
- `.github/workflows/migrations-manifest.yml`: runs `web/scripts/check-migrations.mjs` on PRs touching migrations. Job-level path filter, node only.
- `--live <file>` mode is run by the nightly routine in `docs/routines/migration-drift-check.md` (not CI).
- `ci-pipeline.yml` mentions "manifest" only for squat data.
- `web/package.json` script is `check:migrations`.

### 4. Test mocking and timezone

**Hook test pattern** (`web/src/hooks/__tests__/useAnchors.test.js:1-40`)
- `const fromMock = vi.fn()`.
- `vi.mock('../../supabaseClient.js', () => ({ supabase: { from: (...a) => fromMock(...a) } }))`.
- `makeWrapper()` builds a `QueryClient({defaultOptions:{queries:{retry:false}}})` plus a `QueryClientProvider` wrapper.
- A thenable chain is built per test, e.g. `chain = { select: () => chain, is: () => Promise.resolve({data, error}) }`, then `fromMock.mockReturnValue(chain)`.
- `renderHook` + `waitFor(() => expect(result.current.isSuccess).toBe(true))`.
- Other hooks (`useSessions`, `useTSSHistory`, etc.) have sibling tests in the same directory.

**Timezone**
- There is no `TZ` setting in `web/vite.config.js`, `web/package.json`, `web/src/test-setup.js` or `ci-web.yml`. grep for `TZ` and `timezone` found nothing.
- Tests run in the runner's local zone, which on CI is typically UTC. A near-local-midnight test must therefore pin its own zone or build timestamps from local constructors.
- No existing test pins local midnight.
  - Fake-timer precedents use local-field constructors: `CalendarView.dayStrip.test.jsx:107-111` (`new Date(2026,5,26,9,0,0)`), `ErgLiveView.test.jsx:69-70`, `CalendarView.benchmark.test.jsx:85-86`.
  - Under UTC these cannot distinguish local from UTC date, so they do not prove criterion 4.
- `utils/dateFormat.js:29-31` has a comment that `toISOString()` shifts the day in non-UTC zones.

### 5. Coverage keys in `web/vite.config.js`

- Global thresholds `lines 89 / functions 85 / branches 80` at `:238-241`.
- `constants/**` is excluded from the coverage denominator at `:212-222`.
- Per-file `{lines:80, functions:80, branches:70}` keys exist for hooks and utils. Examples: `src/hooks/useSessions.js` (`:289`), `useTSSHistory`, `useErgSessions`, `useBenchmarkSessions`, `useBenchmarkStatuses`, `useLinkBenchmarkSession`, `src/utils/dateFormat.js`, `sessionStatus.js` and `queryErrorHandlers.js`.
- A key list continues past `:330` that I did not fully read. `StrengthView.jsx` and `MobilityView.jsx` have per-file keys at `:~330-340`.
- `useAnchors.js`, `useVitals.js` and `RecoveryView.jsx` have **no** per-file keys. The grep for `RecoveryView|useAnchors` in the config found no hit.
- Convention: new hooks get a per-file 80/80/70 key when they land with tests. I did not read the `:345-end` keys, so I cannot say whether any touch Recovery.

### 6. Date/time helpers

- There is **no shared `formatDate`**. `formatDate` exists only as a private function at `views/mobile/MobileSessionLog.jsx:19` (takes a date string). `utils/eventWindow.js:5` has a comment saying it introduces no second `formatDate` variant.
- `utils/dateFormat.js` exports `toISODate` (accepts `M/D/YY` or ISO date, string only, no timestamptz handling) and `toLogDate` (accepts a Date, and reads local calendar fields). Neither converts a timestamptz string to local display. `toLogDate(new Date(isoTimestamp))` would give local `M/D/YY` as an existing building block.
- Inline `toLocaleDateString` calls exist at `MobileRecovery.jsx:45` (`en-GB`) and `utils/schedule.js:149` (`en-AU`), with `toLocale*` also in `MobileAnalytics.jsx`, `MobileToday.jsx` and `StrengthLogger.jsx`.
- `utils/stravaStatus.js:62` has a hand-rolled local wall-clock HH:MM, with a comment saying `toLocaleTimeString` drags the runner's locale in.
- `vitals.date` and `date_iso` are plain `date`. `bp_readings.measured_at` is `timestamptz`, the only timestamptz health field. `coach_log.created_at` is also timestamptz.

### 7. Risks and collisions

**Live `bp_readings`** (from `/tmp/claude-0/-home-user-erg-dashboard/d766b958-ae99-5157-8e05-1962521a78ba/scratchpad/bp_readings_live.md`):
- Columns:
  - `id uuid pk default gen_random_uuid()`
  - `user_id uuid not null default auth.uid()`, FK to `auth.users(id)` on delete cascade
  - `measured_at timestamptz not null`
  - `sys_mmhg smallint not null`
  - `dia_mmhg smallint not null`
  - `pulse_bpm smallint null`
  - `context text null`
  - `clean boolean not null default false`
  - `source text not null default 'manual'`
  - `created_at timestamptz not null default now()`
- Constraints: `unique(user_id, measured_at)`; checks sys 60..260, dia 30..160, pulse 30..220.
- RLS is enabled but not forced. The one policy is `bp_readings_owner FOR ALL TO authenticated USING/WITH CHECK (user_id = auth.uid())`.
- **Grants:** anon, authenticated and service_role have full table privileges (Supabase default). The migration "exactly as it is" would therefore not revoke anon. Anon is blocked only by RLS, because the policy is `TO authenticated`, so anon sees zero rows. Acceptance 2 holds on RLS alone. No policy-less hardening like 012's `REVOKE ALL FROM anon`.
- Zero rows and no triggers.

**What reads `bp_readings` today**
- No `src/` code reads it. The only repo hits are docs and `manifest.json:266`.
- No DB function in the repo's migrations touches it.
- `backup_snapshot()` has no migration file (`011_revoke…sql:46` says so), and `coach/REORIENTATION_SLICE_SPECS.md:416` says its coverage omits `bp_readings` (#428). Health data therefore has no backup coverage. That is an existing risk, not 4b's to fix.
- The MCP lane writes to it (D9: Scott's 3 BP rows re-entered through MCP). D10 makes the app read-only. There are no insert or update paths in app code.

**Generic vs typed shape**
- No existing code or table collides with either. There is no `health_markers`, and no injury, hormone or bloods table. 4a deleted the old constants.
- Typed per D8 (epic decision, `coach/REORIENTATION_EPIC_2026-11-06.md:243`) follows `bp_readings`, and "amends VISION.md's name for the target". `VISION.md:126` still says `health_markers` rows.
- The issue text offers both shapes and defers to Gate 2, with the SQL shown to Scott first.
- Shape implications visible in the code:
  - Each of the four hooks and sections maps to one table under the typed option.
  - Under the generic option the bloods and hormone sections share one query filtered by `marker`.
  - Injury history is not a numeric marker, so it does not fit the `value`/`unit` columns of the generic shape.
  - The lipid `LIPID_REF` rows are keyed by marker name, which maps to a `marker` column.
  - Hormone reference ranges are sex-specific and the epic removed them. A DB-held `ref_low`/`ref_high` per row would carry the source question into data, whereas acceptance 5 is a Vitest over a table of code.

**Other gotchas**
- The unique `(user_id, measured_at)` constraint pairs with the near-midnight rendering criterion. `measured_at` display crosses a date boundary in local time.
- The `if (!today)` gate (`:60`) must move for the four cards to render with no vitals. Any restructure touches the IIFE body in `RecoveryView.jsx` and the existing test (`RecoveryView.test.jsx`), which asserts `VITALS UNAVAILABLE`.
- `RecoveryView.test.jsx` mocks only `useVitals`. New unmocked hooks would hit the real supabase client, so tests need new mocks.
- The `logs-*` chunk survives 4a (`logs.js` is still imported by RecoveryView for `LIPID_REF` and by JournalView). Bundle budgets are scoped in `check-bundle-size.mjs` (entry 150 KB; re-measure, do not quote).
- `check:colours` allowlist: new JSX must use `THEME` tokens only, no raw hex.
- `sessions.date` text-date gotcha is not relevant to the health tables.
- Library claims: I did not call Context7. Nothing in this report asserts a library's behaviour beyond what the repo files show. The Spec stage should check the supabase-js `.order`/`.limit` chain and the react-query offline semantics (`networkMode`, `persistQueryClient`) with Context7 before relying on them.

### Files inspected
- `/home/user/erg-dashboard/web/src/views/RecoveryView.jsx` (full)
- `/home/user/erg-dashboard/web/src/views/__tests__/RecoveryView.test.jsx` (lines 1-80)
- `/home/user/erg-dashboard/web/src/constants/logs.js` (270-320)
- `/home/user/erg-dashboard/web/src/constants/__tests__/logs.test.js`
- `/home/user/erg-dashboard/web/src/utils/formatting.js` (40-75)
- `/home/user/erg-dashboard/web/src/utils/__tests__/formatting.test.js` (grep)
- `/home/user/erg-dashboard/web/src/utils/dateFormat.js`
- `/home/user/erg-dashboard/web/src/utils/queryErrorHandlers.js`
- `/home/user/erg-dashboard/web/src/main.jsx`
- `/home/user/erg-dashboard/web/src/hooks/useAnchors.js`
- `/home/user/erg-dashboard/web/src/hooks/useVitals.js` (1-70)
- `/home/user/erg-dashboard/web/src/hooks/__tests__/useAnchors.test.js` (1-60)
- `/home/user/erg-dashboard/web/vite.config.js` (85-125, 179-330)
- `/home/user/erg-dashboard/web/scripts/check-migrations.mjs` (partial: header, constants, grep of rules)
- `/home/user/erg-dashboard/supabase/migrations/manifest.json` (1-60, 100-160, 255-300)
- `/home/user/erg-dashboard/supabase/migrations/006_context_store.sql`, `007_strength_subsystem.sql` (policy sections), `012_strava_integration.sql` (head and grants), `012_strava_integration_rollback.sql` (head), `013_drop_coach_messages_rollback.sql` (head), `014_*.sql` and `014_*_rollback.sql` (heads)
- `/home/user/erg-dashboard/.github/workflows/migrations-manifest.yml` (head)
- `/home/user/erg-dashboard/coach/REORIENTATION_SLICE_SPECS.md` (395-560)
- `/home/user/erg-dashboard/coach/REORIENTATION_EPIC_2026-11-06.md` (150-170, 240-250 and greps)
- `/home/user/erg-dashboard/coach/REORIENTATION_RESEARCH_2026-11-06.md` (greps only)
- `/home/user/erg-dashboard/VISION.md` (84-100 and grep)
- `/home/user/erg-dashboard/docs/roadmap/RESEARCH_CODEBASE_2026-11-07.md` (greps)
- `/tmp/claude-0/-home-user-erg-dashboard/d766b958-ae99-5157-8e05-1962521a78ba/scratchpad/bp_readings_live.md`

### Not inspected
- `vite.config.js` coverage keys from line 345 on, and the rest of `check-migrations.mjs` (lines 80-165 and 340-end).
- `MobileRecovery.jsx` beyond a grep.
- `supabaseClient.js`.
- `sentry.js`.
- `docs/routines/migration-drift-check.md`.
- Edge functions.
- E2E specs.
- `App.test.jsx` and `OverviewView` handling of `RecoveryView`.

## Slice 5

### Slice 5 (#418) research report: Program and Journal tab deletion

Read-only. Nothing was modified. Paths are under `/home/user/erg-dashboard`; `web/` is abbreviated `web/`.

### Plan vs repo: what the plan got wrong or missed

1. **`constants/program.js` can be deleted whole.** It holds none of `EVENT_LADDER`, `SRPE_GUIDE`, `SRPE_SCALE`, `STRENGTH_TEMPLATES` or `PREHAB_NOTE`. It has 13 exports and imports only `THEME`.
   - `EVENT_LADDER` is `web/src/constants/schedule.js:338`.
   - `SRPE_GUIDE` is `web/src/constants/trainingConfig.js:7`.
   - `SRPE_SCALE` is `trainingConfig.js:281`.
   - `STRENGTH_TEMPLATES` (`:44`) and `PREHAB_NOTE` (`:114`) are in `web/src/constants/exercises.js`.
2. **The epic's "kept SRPE_GUIDE" note is slightly off.** `SRPE_GUIDE` has one importer, `web/src/views/LogView.jsx:3`. `ErgLiveView.jsx:14` declares its own local `SRPE_GUIDE`, so it does not import the constant.
3. **`trainingConfig.js` orphans.** Acceptance 6 says to leave the file untouched.
   - `SRPE_SCALE` and `EST_MHR` have exactly one importer, `ProgramView.jsx:2`. Deleting it leaves both with zero importers.
   - `HR_ZONES` also has one external importer, `ProgramView.jsx`. It stays live inside `trainingConfig.js`, where `derivePaceZones` reads it at `:308`.
   - `web/src/constants/__tests__/trainingConfig.test.js` does not reference any of the three (grep).
   - So criterion 3 ("every deleted export has zero importers") holds for what is deleted, but two or three dead exports remain in `trainingConfig.js` by design.
4. **`constants/schedule.js` orphans (not in the issue's In list).** These exports lose their only importer:
   - `PHASES` (`:452`), imported only by `ProgramView.jsx:15`.
   - `SEASON` (`:250`), `SEASON_2` (`:262`) and `VOLUME_PROGRESSION` (`:418`), imported only by `views/program/ProgramYear.jsx:1-7`. The `SEASON` word hits in `App.jsx:40` and `CalendarView.jsx:262` are comment or prose, not imports.
   - `MICROCYCLE` survives (`CalendarView.jsx:19`, `App.jsx`, `utils/schedule.js`).
   - `PHASE_CONTEXT` survives (`CalendarView`, `OverviewView:27`).
   - `EVENT_LADDER` survives (slice 6).
   - The `PHASES` hits under `web/src/squat/` are the squat tool's own `squat/constants/phases.js`, not `schedule.js`.
5. **`ProgramYear.test.jsx` pins the ladder.** `web/src/views/program/__tests__/ProgramYear.test.jsx:4` imports `EVENT_LADDER` and asserts `toHaveLength(9)` at `:28`. Deleting that file removes the `EVENT_LADDER` length assertion; `CalendarView.test.jsx`, `useBenchmarkStatuses.test.js`, `eventWindow.test.js` and `benchmarkStatus.test.js` also import `EVENT_LADDER`. I did not check whether any of them pin the length.
6. **Narrative text in `logs.js` mentions the other names.** `logs.js:144` (inside `DECISION_LOG`) names `SEASON`, `EVENT_LADDER`, `DEFICIT_PROGRAM` and `WorkoutItem` in prose. It goes with `DECISION_LOG`.
7. **#418 is the only open "closes #177" item in repo text.** Grepping the tracked repo for `#177` in code and config found nothing.

### 1. `web/src/views/program/` and import map

`web/src/views/program/` holds exactly two source files plus `__tests__/`. The two sources are `ProgramMicrocycle.jsx` (189 lines) and `ProgramYear.jsx` (950 lines). The tests are `ProgramMicrocycle.test.jsx` and `ProgramYear.test.jsx`. `ProgramView.jsx` is 1,958 lines and `JournalView.jsx` is 346.

**`ProgramView.jsx` imports (`:1-30`) and their other importers.** "Other" is across `web/src`, `web/e2e`, `web/scripts` and `web/.design-sync`, excluding the doc `.md`s.

| Symbol | From | Other importers | After deletion |
|---|---|---|---|
| `HR_ZONES` | `trainingConfig.js` | none (used internally in `trainingConfig.js:308`) | stays live internally |
| `EST_MHR` | `trainingConfig.js:279` | none | orphan in `trainingConfig.js` |
| `SRPE_SCALE` | `trainingConfig.js:281` | none | orphan in `trainingConfig.js` |
| `REP_SCHEMES`, `LOWER_DIFFERENTIATION`, `STRENGTH_PRINCIPLES` | `exercises.js` (`:2`, `:29`, `:117`) | none | orphan; delete |
| `MACRO_TARGETS`, `MF_PROGRAM`, `FUELLING`, `NUTRITION_PRINCIPLES` | `nutrition.js` | none | orphan; delete |
| `DEFICIT_PROGRAM` | `nutrition.js:36` | none (only prose in `logs.js:144`) | orphan; delete |
| `PHASES` | `schedule.js` | none | orphan, not in issue list |
| `C`, `ICON` | `constants/ui.js` | others (ui.js is general) | survives |
| `ERGZONE_FORMAT`, `BUILD1_SESSIONS`, `INTENSITY_EVOLUTION`, `VOLUME_EXTRAS`, `TECHNIQUE_WORK`, `MOVEMENT_SCREEN`, `MOBILITY_WARMUP` | `program.js` | none | go with the file |
| `ProgramMicrocycle`, `ProgramYear` | `views/program/` | none | deleted |
| `THEME`, `alpha`, `FONT` | shared | others | survive |

`ProgramView.jsx` renders three sub-tabs (`:36-66`) in a local `useState`, `progTab`, at `:33`. It receives `{expanded, setExpanded}`, which it references 10 times.

**`NUTRITION_TARGETS` (`nutrition.js:182`) has no importer anywhere** and was not in ProgramView's list. It is a pre-existing orphan, not caused by this slice. The slice 4a spec removed `nutritionLog`, the only thing that read it. Whether to delete it is a Spec call.

**`ProgramMicrocycle.jsx` imports (`:1-6`).**
- `WorkoutItem` survives, also used by `CalendarView` and `OverviewView`.
- `MICROCYCLE` survives.
- `TECHNOGYM_CONVERSION` (`program.js`) has no other importer.
- `daySessions` (`utils/schedule.js`) survives, used by `CalendarView`, `OverviewView` and `App.jsx`.

**`ProgramYear.jsx` imports (`:1-15`).**
- `SEASON`, `SEASON_2`, `VOLUME_PROGRESSION` become orphans (see correction 4).
- `EVENT_LADDER` survives.
- `ATHLETE_BACKGROUND`, `RACE_TARGET`, `ORGS`, `EVENT_PATHWAY`, `ANNUAL_ARC` have no other importer.

**`JournalView.jsx` imports (`:1-8`).** `DECISION_LOG`, `HYPOTHESES`, `RULE_FIRING_HISTORY` and `CONFIDENCE_MIGRATION` are imported by it and by `JournalView.test.jsx:4-9` only. No other importer in `web/src`, `web/e2e` or `web/scripts`. `web/.design-sync/DESIGN_BRIEF.md` mentions them in prose only.

### 2. `constants/logs.js` after deletion

The file is 321 lines, with `import { THEME }` at `:1`.

| Export | Line |
|---|---|
| `DECISION_LOG` | `:5` |
| `HYPOTHESES` | `:179` |
| `RULE_FIRING_HISTORY` | `:235` |
| `CONFIDENCE_MIGRATION` | `:244` |
| `AACB_LIPID_2018` | `:280` |
| `LIPID_REF` | `:285` |

- After deleting the four journal exports, `logs.js` holds only `AACB_LIPID_2018` and `LIPID_REF`, plus the "LIPID PANEL DECISION LIMITS" comment block at `:276-279`.
- `AACB_LIPID_2018` is used only inside `logs.js`. `LIPID_REF` is imported by `RecoveryView.jsx` and its test.
- `web/src/constants/__tests__/logs.test.js` tests `LIPID_REF` and has a `removed`-names guard (the `'logs.js exports'` block, from about `:24`). The guard lists `bpLog`, `bloodsLog`, `NIGGLES`, `mobilityLog`, `nutritionLog` and `HORMONE_REF`. It does not list the four journal names, so extending it is a Spec choice.
- `logs.js` still imports `THEME`, which `LIPID_REF` uses.
- The 4a spec (`coach/REORIENTATION_SLICE_SPECS.md` §4a correction 5) says the public `logs-*` chunk keeps these four exports until this slice.

### 3. `web/src/App.jsx` (515 lines)

- **Lazy imports** (`:20-32`):
  - `JournalView` at `:23`.
  - `ProgramView` at `:28`.
  - The other eleven lazy imports are untouched.
- **Nav tuple array** (`:349-363`):
  - `['program','Program']` at `:352`.
  - `['journal','Journal']` at `:361`.
  - 13 tuples today, so 11 after.
- **Nav click handler** (`:366-369`): `setView(v); setExpanded(null);` clears `expanded` on every tab click.
- **State**: `view` is `useState` at `:194` (default `'overview'`, or `'settings'` after a Strava callback). `expanded` is `useState(null)` at `:195`.
- **Readers of `expanded`**: the only reader is `ProgramView` (render `:434-436`). There are two other writer/reader sites in `App.jsx`: `setExpanded(null)` at `:368` and the prop pass at `:435`. No other view, component or mobile file reads it. The `BenchmarkLinkControl.jsx:31` `expanded` is a local variable.
- **Render branches**:
  - `view === 'program'` at `:434-436`, under the comment `── PROGRAM VIEW ──`.
  - `view === 'journal'` at `:487`, under a `── JOURNAL VIEW ──` comment at `:486`.
- **Header comment** `:16` names ProgramView at about 1,958 lines. A "Plans: MICROCYCLE, SEASON, …" comment at `:40` is prose.
- **Desktop tab count** today is 13, so 11 after. `useHashRoute.js` and `constants/destinations.js` are the mobile router (`today`, `train`, `progress`, `body`) and contain no `program` or `journal`. The desktop `view` is not hash-routed. `useHashRoute.test.js` is unaffected.
- **`web/src/__tests__/App.test.jsx`**:
  - `vi.mock('../views/JournalView.jsx')` at `:118-122`.
  - `vi.mock('../views/ProgramView.jsx')` at `:161-163`.
  - The `NAV` array has `['PROGRAM', 'ProgramView-stub']` at `:218` and `['JOURNAL', 'JournalView-stub']` at `:227`.
  - `expect(NAV).toHaveLength(13)` at `:241`, and `querySelectorAll('button')).toHaveLength(13)` at `:245`.
  - Comment `:240` "Thirteen tabs: the Coach tab was retired in #414."
  - `:346` clicks `JOURNAL` in another test (`fireEvent.click(screen.getByRole('button', { name: 'JOURNAL' }))`). That test needs a different tab or removal.

### 4. e2e

- `web/e2e/smoke.spec.js`: the `TABS` array at `:15-29` has `'program'` (`:18`) and `'journal'` (`:27`). The comment at `:14` says it matches the `NAV` in `App.jsx`. Labels derive via uppercase (`:32`), and the loop at `:62` generates one test per tab.
- `web/e2e/visual.spec.js`: `test('program', …)` at `:134-139` and `test('journal', …)` at `:141-146`, shots `desktop-program` and `desktop-journal`. The comment at `:93` references `App.jsx:402` and a "PROGRAM switch" byte-length example at about `:96-98`; the header comment (about `:15-16`) is a known stale-comment spot from slice 2.
- Snapshot files, both tracked in git:
  - `web/e2e/visual.spec.js-snapshots/desktop-program-visual-linux.png`
  - `web/e2e/visual.spec.js-snapshots/desktop-journal-visual-linux.png`
- The other desktop snapshots, `desktop-overview-visual-linux.png` and `desktop-calendar-visual-linux.png`, carry the nav bar. Removing two nav buttons changes the nav layout, so they will diff. The 4b/slice 2 corrections say regeneration is via `e2e-web.yml` dispatch with `update_baselines: true` on a branch with an open PR. I did not read the workflow file to confirm this.

### 5. Colour allowlist and design-sync

- `web/scripts/check-colour-literals.mjs:80-83` has the entry `'web/src/views/program/ProgramYear.jsx': { hexes: ['#666'], reason: 'as trainingConfig.js.' }`.
- A stale entry does fail the check. The loop at `:~221-236` pushes a failure if the file does not exist (`"is allowlisted but no longer exists — drop the entry"`). So the entry must be dropped in the same PR.
- `ProgramYear.jsx:212` is the `#666` line. `ProgramView.jsx:500` also has `color: '#666'`, but it has no allowlist entry (`ProgramView.jsx` is not in `ALLOWED`). I did not confirm how the guard treats it, since the script strips comments only (`stripComments`) and `#666` matches no `DARK` palette value.
- The `ErgView.jsx` and `trainingConfig.js` `#666` entries are separate and stay.
- `.design-sync`: `entry.jsx`, `config.json` and `ownership.json` contain no `ProgramView`, `JournalView` or `program.js` reference (grep). `check-design-sync-entry.mjs` bundles `entry.jsx`, so `check:design-sync` should not break.
- `.design-sync` references that remain are prose only (slice 12): `DESIGN_BRIEF.md:68,92,236,250,632`, `HANDOFF.md:193-194`, and `designs/progress.html:387`.
- `web/.design-sync/splitiq-load.js` and `designs/desktop-planning.html` contain `SEASON` text, not imports.

### 6. Coverage and scripts

- `web/vite.config.js` has no per-file coverage key for any deleted file. Grepping for `program` and `journal` there found nothing, and `constants/**` is excluded from coverage (`:212-222`).
- Global thresholds at `:228-241` are lines 89, functions 85, branches 80. The last measured global was lines 93.57, functions 89.59, branches 85.14 (research appendix E, 2026-11-06). The same table gives `ProgramView.jsx` 83.87 lines and 47.76 branches, and `JournalView.jsx` 100 lines and 85.71 branches.
- `web/scripts/__tests__/entry-graph.test.mjs:35,42,45,62-63` uses `src/views/ProgramView.jsx` and `assets/ProgramView-*` as synthetic fixture strings for the manifest walk. They are not real imports and do not break on deletion, but they are the remaining `ProgramView` strings in `web/scripts`.
- `check-bundle-size.mjs`, `squatChunks.mjs`, `entry-graph.mjs` and `report-bundle-size.mjs` name none of the deleted files. `check-zone-bands.mjs` does not either (grep).
- `web/src/views/__tests__/ProgramView.test.jsx:15` has an `#77` comment, and sets `{ timeout: 15000 }` on the describe block.

### 7. All other references

I excluded `coach/` and `docs/` history.

- Source: `App.jsx` (above) and `App.test.jsx` (above).
- Constants: `constants/program.js:3` ("consumed by ProgramView").
- Docs and config prose for slices 11/12:
  - `VISION.md:122` (cull list names `web/src/constants/program.js`)
  - `CLAUDE.md:59`, `:145`
  - `README.md:101`
  - `.claude/skills/architecture.md:64,72,74-79`
  - `.claude/skills/refactor/SKILL.md:3,19`
  - `.claude/AGENTS.md:27`
  - `.design-sync/DESIGN_BRIEF.md` and `HANDOFF.md` lines above
- `docs/roadmap/*` files mention them in cull-list prose only (not read in full).

### 8. #77 and #177

- #77 appears in code and config only as a comment: `web/src/views/__tests__/ProgramView.test.jsx:15`. Docs: `CLAUDE.md:59,145`, `README.md:101`, `.claude/skills/architecture.md:72`, `.claude/skills/refactor/SKILL.md:19`, `.claude/AGENTS.md:27`, `web/.design-sync/DESIGN_BRIEF.md:250,633`. The `/refactor` skill is documented to extract from `views/ProgramView.jsx`.
- #177 has no occurrence in code or config. The epic says slice 5 closes #177 as not planned.
- I did not query GitHub.

### Files inspected

- Docs: `coach/REORIENTATION_EPIC_2026-11-06.md` (slice 5 story, D12, status row); `coach/REORIENTATION_RESEARCH_2026-11-06.md` (appendix B §1.3 to §1.9, §2, §6, §7, appendix E); `coach/REORIENTATION_SLICE_SPECS.md` (slice 2 and 4a research corrections only).
- Source: `ProgramView.jsx` (lines 1-75), `JournalView.jsx` (1-20), `ProgramMicrocycle.jsx` and `ProgramYear.jsx` (headers), `constants/{program,logs,trainingConfig,nutrition,exercises,schedule,destinations}.js` (export lists and relevant ranges), `App.jsx` (relevant ranges), `hooks/useHashRoute.js`.
- Tests: `App.test.jsx` (`:205-260`), `ProgramView.test.jsx`, `JournalView.test.jsx`, `logs.test.js`.
- Config and e2e: `e2e/smoke.spec.js`, `e2e/visual.spec.js`, `scripts/check-colour-literals.mjs`, `vite.config.js` (coverage block).
- Greps only: `.design-sync/*`, `web/scripts/*`, `.github/workflows`, `package.json`.
- Not inspected: the interiors of `ProgramView.jsx`, `ProgramYear.jsx`, `JournalView.jsx` and most of `ProgramMicrocycle.jsx` beyond their imports.

## Slice 6-7

### Stage 1 research: slices 6 (#419) and 7 (#420). READ-ONLY, no changes made. Repo HEAD 2cd7d9e. All paths under /home/user/erg-dashboard/web unless noted. Slice 5 is assumed landed first, so its deletions are noted but not re-mapped.

### 0. Findings that change the plan
1. **Slice 7 breaks OverviewView unless it is trimmed in slice 7.** `views/OverviewView.jsx` imports `getRosterMode, logEntriesForDate, getToday, getUpcomingSessions, daySessions` from `utils/schedule.js` (lines 15-19) and `PHASE_CONTEXT` from `constants/schedule.js` (line 27).
   - It calls `getToday(getRosterMode(nowTick))` at :75, `getUpcomingSessions(nowTick, loggedSessions)` at :89, and `daySessions(t.today)` at :149. The block uses `t.today`, `t.todayKey` and `t.cycleColor`.
   - `logEntriesForDate(new Date(), loggedSessions)` is called at :150.
   - Epic slice 7 "Out" mentions only the `PHASE_CONTEXT` import. Slice 8 "In" is what removes "the today-session boxes and countdowns that need `MICROCYCLE`".
   - So deleting `getToday`, `getUpcomingSessions` and `daySessions` in slice 7 leaves OverviewView importing missing exports. The slice 7 PR must either remove or stub that Overview strip, or keep those exports until slice 8.
   - `OverviewView.jsx` has a per-file 80/80/70 key (`vite.config.js:335`), and `OverviewView.test.jsx` (11 tests) must still pass.
2. **`dayStatus` is not in the #420 delete list, but it is the "missed" computation.** `dayStatus` (`utils/schedule.js:~140`) is the only place "missed" is produced. The epic says to "keep `logEntriesForDate`", drop roster-derived "missed", and that #265 closes because "`dayStatus` deleted". So `dayStatus` must go or lose its `missed` branch. Its only importers are `CalendarView.jsx` and `schedule.test.js` (OverviewView does not use it).
3. **`MobileToday` already satisfies acceptance 6.**
   - Imports: `useSessions`, `useVitals`, `useTSSHistory`, `useAnchors`, `trainingLoad`, `dateFormat`, `sessionStatus`, `theme`, `themeCss`, `type`, `tokens`. It imports nothing from `schedule`, `benchmark*` or `eventWindow`.
   - Today's planned row: `views/mobile/MobileToday.jsx:~108` has `prescribed = todays.find((s) => s.status === PLANNED_STATUS)`.
   - `todays` is built at :~97 from `useSessions()` rows filtered by `iso === today`. `today` is `toISODate(toLogDate(new Date()))` (:~66).
   - `useSessions` (`hooks/useSessions.js`) uses queryKey `['sessions']`, selects `id,date,type,label,duration,srpe,status,distance_m,avg_watts,avg_hr`, and orders by `date_iso desc nullsFirst:false`, then `id desc`, with `.limit(50)`. It also does a client re-sort by `toISODate`.
   - No new hook is needed for MobileToday. Slice 8 adds the `anchors.current_phase` handling.
4. **Seven files outside the issue lists lose their imports.**
   - `constants/schedule.js` exports `PHASES` (:452), imported only by `views/ProgramView.jsx:15`. The squat tool has its own unrelated `squat/constants/phases.js` `PHASES`.
   - After slices 5, 6 and 7, `PHASES` has zero importers, because slice 5 does not list it and slice 7 does not either. `PHASE_CONTEXT` (:698) survives for OverviewView (:27) and CalendarView (:19, :123) until slice 8.
   - `utils/benchmarkStatus.js` and `eventWindow.js` are not imported by anything outside the slice-6 set.
   - `useBenchmarkSessions`'s only non-test consumers are `useBenchmarkStatuses` and `CalendarView`.
5. **No per-file coverage key exists for `utils/schedule.js` or `constants/schedule.js`.** `constants/**` is excluded from coverage.
6. **Visual baseline.** `e2e/visual.spec.js:127-131` has a `calendar` test that takes `desktop-calendar` and pins the clock to 2026-06-15 (`FIXED_TIME`, line ~58). The baseline `e2e/visual.spec.js-snapshots/desktop-calendar-visual-linux.png` will change. Per the file's header it can only be regenerated in the CI container (`update_baselines: true` on the E2E workflow). The CalendarView banner text "YOUR WEEKS · …" and the ladder panel are in that snapshot.
7. **Ladder vs `sessions.benchmark_key` readers.** The only `benchmark_key` reads in `web/src` are `useBenchmarkSessions.js` (select string at :~27) and `useLinkBenchmarkSession.js` (two `.update({benchmark_key})` calls). Comments in `LogSessionForm.jsx:79` and `invalidateSessionQueries.js:4` mention benchmarks but not the column.
   - Comment-only hits that a grep for acceptance 1 (`EVENT_LADDER|benchmark_key`) would catch: `constants/logs.js` (lines 16, 22, 144 are prose, and 144 names `EVENT_LADDER`) and `constants/schedule.js` itself.
   - `scripts/__tests__/fixtures/live-migrations-2026-11-09.json` mentions `benchmark_key` (a migration-drift fixture), and `supabase/migrations/009_sessions_benchmark_key*.sql` plus `manifest.json` stay.

### 1. Symbol map (definition and importers)
Importer search covered `src`, `e2e`, `scripts` and `.design-sync` (code and config), and repo-root docs.

### Slice 6
| Symbol | Defined | Importers (non-test) | Tests |
|---|---|---|---|
| `EVENT_LADDER` | `constants/schedule.js:338` (9 entries, per `ProgramYear.test.jsx:28`) | `hooks/useBenchmarkStatuses.js:2`, `views/program/ProgramYear.jsx:4` (slice 5 deletes) | `useBenchmarkStatuses.test.js:18`, `CalendarView.test.jsx:5`, `eventWindow.test.js:2`, `benchmarkStatus.test.js:8`, `ProgramYear.test.jsx:4` (slice 5) |
| `useBenchmarkStatuses`, `useBenchmarkDataUnavailable` | `hooks/useBenchmarkStatuses.js` (29 lines) | `CalendarView.jsx:5-8` | `useBenchmarkStatuses.test.js`, and `vi.mock` in all 3 CalendarView tests |
| `resolveLadderStatuses`, `compareBenchmarkSeverity`, `selectUpcoming` | `utils/benchmarkStatus.js` (211 lines; exports at :119, :203, :209) | `useBenchmarkStatuses.js:3`, `CalendarView.jsx:18` (`compareBenchmarkSeverity`). `selectUpcoming` has no non-test importer. | `benchmarkStatus.test.js` |
| `utils/eventWindow.js` (228 lines): `BENCHMARK_TERMS`, `tokenize`, `benchmarkKeywords`, `todayISO`, `diffCalendarDays`, `addCalendarDays`, `parseEventWindow` | exports at :19, 59, 86, 104, 117, 127, 190 | `todayISO` is imported by `useBenchmarkStatuses.js:4`. `benchmarkStatus.js` almost certainly imports the rest, but I did not open its import block. | `eventWindow.test.js` |
| `useBenchmarkSessions` | `hooks/useBenchmarkSessions.js`; queryKey `['sessions','benchmark-window']`, select `id,date,label,status,benchmark_key`, order `date_iso desc nullsFirst:false`, limit 500 | `useBenchmarkStatuses.js:5`, `CalendarView.jsx:9` | `useBenchmarkSessions.test.js` |
| `useLinkBenchmarkSession` | `hooks/useLinkBenchmarkSession.js`: two-step update (clear key where `benchmark_key = key`, then set on `id`), `onSettled` calls `invalidateSessionQueries` | `CalendarView.jsx:10` | `useLinkBenchmarkSession.test.js` |
| `BenchmarkBadge` | `components/BenchmarkBadge.jsx` (63 lines) | `CalendarView.jsx:3` only | `BenchmarkBadge.test.jsx` (asserts derived colours; `.design-sync/NOTES.md:219` lists it among colour-locking tests) |
| `BenchmarkLinkControl` | `components/BenchmarkLinkControl.jsx` (116 lines) | `CalendarView.jsx:4` only | `BenchmarkLinkControl.test.jsx` |

- `LogView`, `LogEntry` and `StrengthView` do **not** render the badge or the link control. Only `CalendarView` does.
- `utils/invalidateSessionQueries.js` has a comment about `['sessions','benchmark-window']` (line 4: "do NOT list that key separately"). It stays valid as a comment but becomes stale once the key is gone. `invalidateSessionQueries.test.js` may reference the key; I did not open it.
- `design-sync` references: `DESIGN_BRIEF.md:83` (`calendar` row says "`useBenchmarkStatuses` + live sessions"), `DESIGN_BRIEF.md:440` (`BenchmarkBadge` as a Pill example), `NOTES.md:219`. Not code, not guarded by a script I found.

### Slice 7
| Symbol | Defined | Importers |
|---|---|---|
| `getRosterMode` | `utils/schedule.js:~37` | `CalendarView.jsx:12`, `OverviewView.jsx:15`, `schedule.test.js` |
| `ROSTER_ANCHOR` | `utils/schedule.js:~35` (a `Date` derived from `ROSTER_REGIMES[0].from`) | `schedule.test.js` only |
| `ROSTER_REGIMES`, `ROSTER_OVERRIDES` | `constants/schedule.js:13`, `:24` (overrides ships `{}`) | `utils/schedule.js:2-5`, `schedule.test.js:6` |
| `SESSION_OVERRIDES` | `utils/schedule.js` (2 date-keyed entries: 2026-07-01 CP test, 2026-06-19) | `schedule.test.js` only |
| `resolveDay` | `utils/schedule.js` | `CalendarView.jsx:13`, `schedule.test.js`; also called inside `getToday` and `getUpcomingSessions` |
| `getToday` | `utils/schedule.js` | `OverviewView.jsx:17,75`, `schedule.test.js` |
| `getUpcomingSessions` | `utils/schedule.js` | `OverviewView.jsx:18,89`, `schedule.test.js` |
| `daySessions` | `utils/schedule.js` | `CalendarView.jsx:15`, `OverviewView.jsx:19,149`, `views/program/ProgramMicrocycle.jsx:4` (slice 5 deletes) |
| `dayStatus` | `utils/schedule.js` | `CalendarView.jsx:14`, `schedule.test.js`. Not in the issue list (see 0.2). |
| `logEntriesForDate` | `utils/schedule.js` | `CalendarView.jsx:16,81`, `OverviewView.jsx:16,150`, `schedule.test.js` |
| `MICROCYCLE` | `constants/schedule.js:26` | `CalendarView.jsx:19`, `ProgramMicrocycle.jsx:2` (slice 5 deletes), `schedule.test.js` |
| `SEASON` (:250), `SEASON_2` (:262), `VOLUME_PROGRESSION` (:418) | `constants/schedule.js` | `views/program/ProgramYear.jsx` only (slice 5 deletes it), so they have zero importers after slice 5 |

**Symbols named in the issues that do not exist or live elsewhere:** none are missing. `daySessions` and `dayStatus` live in `utils/schedule.js`, not the constants file.

**Prose in `constants/logs.js` that names culled symbols.** `constants/logs.js` lines 16, 22 and 144 name `SESSION_OVERRIDES`, `resolveDay`, `getRosterMode`, `ROSTER_ANCHOR`, `SEASON`, `SEASON_2` and `EVENT_LADDER`. It is inside a `constants/` file excluded from coverage, and a repo-wide grep for the names will hit it.

Other stale text that names culled symbols:
- `App.jsx:40` (`MICROCYCLE, SEASON, EVENT PROGRESSION`) and `:48-50` (`getRosterMode()`, `ROSTER_ANCHOR`, `daySessions()`) are header comments, not imports.
- `App.jsx:141` has the heading "2-WEEK MICROCYCLE (roster-driven)".
- `VISION.md:121` (repo root) lists `utils/schedule.js (getRosterMode)` in its cull table.

**Extra symbols in `utils/schedule.js` that orphan:** the local helpers `localDay`, `regimeStart`, `utcDay`, `localISO` are used only by `getRosterMode`. The file's imports from `constants/schedule.js` are `MICROCYCLE, ROSTER_REGIMES, ROSTER_OVERRIDES`. After the cull the file would hold only `logEntriesForDate`. `dayStatus` is the open question (0.2).

**`constants/schedule.js` full export list:** `ROSTER_REGIMES` (13), `ROSTER_OVERRIDES` (24), `MICROCYCLE` (26), `SEASON` (250), `SEASON_2` (262), `EVENT_LADDER` (338), `VOLUME_PROGRESSION` (418), `PHASES` (452), `PHASE_CONTEXT` (698).
**`utils/schedule.js` full export list:** `ROSTER_ANCHOR`, `getRosterMode`, `SESSION_OVERRIDES`, `resolveDay`, `logEntriesForDate`, `dayStatus`, `getToday`, `getUpcomingSessions`, `daySessions`.

**What must survive slice 7 for slice 8:** `PHASE_CONTEXT` (OverviewView :27, :126-127, :411-494; CalendarView :19, :123). OverviewView also still needs working imports for whatever of the today strip it keeps (0.1).
**Other consumers:**
- Mobile views, `LogView`, `StrengthView`, `App.jsx` and `PlanView` import nothing from either schedule file (no match in the grep).
- `MobileApp.jsx` imports only the mobile views, `useHashRoute`, `destinations`, `theme` and `type`.
- `PlanView.jsx` takes `plannedSessions` and `loggedKeys` as props from `useSessionLog`.

### 2. `views/CalendarView.jsx` (351 lines)
- **Props:** `{ loggedSessions, cancelledSessions = [], isWide }`. They come from `App.jsx:426-430`: `<CalendarView loggedSessions cancelledSessions isWide />`. Those two lists come from `useSessionLog()` (`App.jsx:222-228`).
- **How `useSessionLog` gets rows (`hooks/useSessionLog.js`).**
  - It runs a one-shot `supabase.from('sessions').select('*').order('date_iso', {ascending:false, nullsFirst:false}).order('id', {ascending:false})` in a `useEffect` (not react-query).
  - It filters out rows with `type === 'Test'`.
  - A single pass splits rows into `plannedSessions` (`status === 'planned'`), `logDisplaySessions`, `loggedSessions` (`isCompletedStatus`) and `cancelledSessions` (`isCancelledStatus`).
  - **Loading and offline:** it exposes `dbStatus` (`loading|ok|error`), and on error it calls `captureError` and sets `'error'`. There is no react-query cache here, so there is no offline cache and no loading state in CalendarView. CalendarView ignores `dbStatus` and gets no `plannedSessions` prop.
  - Ordering **is** by `date_iso` desc with an `id` tiebreak.
  - Today `CalendarView` consumes only the completed and cancelled lists. It never receives `plannedSessions`, so DB-planned display would need a new prop or hook, and that is a design question for later stages.
- **Structure:**
  - Hook block at :27-45: `useBenchmarkStatuses`, `useBenchmarkDataUnavailable`, `useBenchmarkSessions`, `useLinkBenchmarkSession`, plus `linkingKey` state and `linkError`.
  - `days` loop at :64-94: `BACK = 3`, `FWD = 14` (17 cells), each day built from `getRosterMode(d)`, `resolveDay(d)`, `dayStatus(d, today0, loggedSessions)` and `logEntriesForDate(d, cancelledSessions)`. This is **roster-derived**.
  - Banner "YOUR WEEKS · {MICROCYCLE label} · {PHASE_CONTEXT.phaseLabel}" at :~100-125, plus "Roster switches mid-view" text from `sawSwitch`. This is **roster-derived**.
  - Day strip at :~126-250. `sessions = daySessions(d.sess)` puts roster prescription in `WorkoutItem`.
    - Status colours and labels cover `done`, `today`, `missed` ("— not logged") and upcoming.
    - The `⊘ N CANCELLED` badge comes from the DB and `⇄ SWAPPED` from `SESSION_OVERRIDES`.
    - Cell opacity depends on `st === 'missed'`, then `d.cancelledCount > 0`, then `done && isPast`.
    - `WorkoutItem` gets `session={{...s, done}}` (a roster session object with `label/slot/note/fuel/meal`) or `session={null}` for a rest day.
  - The ladder panel runs from the "Upcoming events from the ladder" comment at :~239 to the end of the file. Its heading text is "UPCOMING EVENTS · SEASON 1 LADDER" (:262). It includes "BENCHMARK STATUS UNAVAILABLE", the sorted `visibleEvents` map, `BenchmarkBadge`, and `BenchmarkLinkControl` (only for `kind === 'benchmark'` and status not `unknown`).
  - There is **no month grid**. The view is a 17-day strip plus the ladder panel.
- **DB-derived today:** `done` and `×N` (from `loggedSessions`), `⊘ N CANCELLED` (from `cancelledSessions`), `logEntriesForDate` matching. **Everything else is roster or ladder.**
- **`WorkoutItem` (`components/WorkoutItem.jsx`):** takes `session` (`label/note/fuel/meal/done`), `rail`, `highlight`, `showRail`. It has its own test (4 tests) and a per-file 80/80/70 key. `workoutAccent(session.label)` colours it.
- **Test files and 2026 dependence**
  - `CalendarView.test.jsx` (16 tests): ladder-only. Mocks the three benchmark hooks, imports `EVENT_LADDER`, finds "SEASON 1 LADDER" (:79, :99), and has fixtures with `6/23/26` and `8/3/26`. Entire file goes with slice 6.
  - `CalendarView.benchmark.test.jsx` (9 tests): ladder-only, `vi.setSystemTime(new Date(2026, 7, 22))`, "SEASON 1 LADDER" at :65, fixtures `7/5/26`, `6/23/26`, `9/12/26`, `7/12/26`. Entire file goes with slice 6.
  - `CalendarView.dayStrip.test.jsx` (11 tests). Header comment at :3-8 says the ladder panel is not under test, and it mocks the three benchmark hooks at :7-23. It pins `new Date(2026, 5, 26, 9)` (:~100) and `new Date(2026, 5, 24, 9)`, and fixtures `6/23/26`, `6/24/26`, `6/25/26`, `6/28/26`, `6/29/26`. Its tests depend on the roster in these ways:
    - Strip index arithmetic (17 cells, `BACK=3`, "YOUR WEEKS" banner as the sibling anchor).
    - `— not logged` labels (roster `missed`) in AC2, the cell-0 test and AC7.
    - `● TODAY`.
    - The opacity values 0.5 and 0.75 (both tied to `missed`).
    - The `× 2` strings.
  - After slice 6 this file's mocks of the benchmark hooks must be deleted. After slice 7 the "YOUR WEEKS" banner anchor and "not logged" assertions go. That file needs a rewrite, not just a date swap. The first `describe` is titled "cancelled marker (#242)".
  - Acceptance for slice 7 is `git grep 2026` empty in `schedule.test.js` and `CalendarView.dayStrip.test.jsx`.

### 3. `logEntriesForDate`
- Defined at `utils/schedule.js:~122`. Signature `logEntriesForDate(date: Date, sessions: Array)`. It builds the key `getMonth()+1 + '/' + getDate() + '/' + String(getFullYear()).slice(-2)`, then filters `e.date === key`. It is status-blind by documented contract (comment above it, referencing #194). Null or undefined `sessions` returns `[]`.
- Callers: `CalendarView.jsx:81`, `OverviewView.jsx:150`, `schedule.test.js`.
- Existing tests (`utils/__tests__/schedule.test.js:207-227`, a 3-test `describe`):
  - unpadded key plus match (6/19, 6/20) on 2026 dates,
  - empty array on no match,
  - null or undefined list.
- **No existing test** covers a single-digit month with a double-digit day (or the reverse), or a December to January rollover. Only 6/19-6/21 are used, so month 6 is always single-digit and the days are double-digit. There is no coverage of a day-1 or month-12 key, which the acceptance asks for.
- `schedule.test.js` has 44 `it(` blocks total across: `getRosterMode` (4+3+3+...), `ROSTER_OVERRIDES`, `ROSTER_ANCHOR`, `resolveDay`, `logEntriesForDate` (3), `dayStatus` (5), `getToday` (3), `getUpcomingSessions` (4) and `daySessions` (4). `describe` headings are at lines 22, 50, 71, 111, 144, 170, 179, 207, 229, 264, 288 and 327. Everything except `logEntriesForDate` goes. The file also imports `MICROCYCLE, ROSTER_REGIMES, ROSTER_OVERRIDES` from the constants (:3-7), and carries many real-date pins (June 22 and 23, July 7, Aug 7, Sep 3).

### 4. `sessions.status` and "missed"
- `constants/sessionStatus.js`: `COMPLETED_STATUSES = ['actual','completed','logged']`, `PLANNED_STATUS = 'planned'`, `CANCELLED_STATUS = 'cancelled'`.
- The CHECK allow-list from migration 010 is referenced in `useSessionLog.js`; I did not open migration 010.
- `utils/sessionStatus.js` provides `isCompletedStatus` and `isCancelledStatus`, which `useSessionLog` uses.
- **Calendar status to visual mapping** is local to `CalendarView.jsx:~138-163`, not a shared helper. `st` comes from `dayStatus().state`, which is one of `done`, `today`, `upcoming` or `missed`. The file never inspects `sessions.status` itself.
- **"missed" is computed in one place:** `dayStatus` in `utils/schedule.js` (`if (d < todayMidnight) return { state: 'missed' }`), and it is consumed at `CalendarView.jsx` for colour, label, and opacity.
- **DB `planned` is displayed nowhere in Calendar today.** `plannedSessions` is only consumed by `PlanView` and `useSessionLog`'s `loggedKeys`. `MobileAnalytics.jsx:338` filters `s.status === 'planned' && toISODate(s.date) >= today`. `MobileToday` filters `PLANNED_STATUS`. `benchmarkStatus.js` uses `PLANNED_STATUS` for its reschedule pass.

### 5. Coverage keys (`vite.config.js`)
Global thresholds: `lines 89, functions 85, branches 80` (:228-250 region).

Per-file keys to remove in slice 6 (each `{lines:80, functions:80, branches:70}`):
- `src/utils/eventWindow.js` (:252)
- `src/utils/benchmarkStatus.js` (:253)
- `src/hooks/useBenchmarkStatuses.js` (:258)
- `src/components/BenchmarkBadge.jsx` (:263)
- `src/components/BenchmarkLinkControl.jsx` (:268)
- `src/hooks/useLinkBenchmarkSession.js` (:273)
- `src/hooks/useBenchmarkSessions.js` (:300)

That is **seven** keys, not the "three per-file keys" the epic table row 96 says. The slice 6 "In" list says "their per-file coverage keys".

- `src/views/CalendarView.jsx` key at :340 (80/80/70). It stays and CalendarView must keep meeting it. After the cull the view will be much smaller, with the ladder (the heavily tested part) gone.
- `src/views/OverviewView.jsx` at :335 (80/80/70) is affected by slice 7 (0.1).
- `constants/**` is excluded from coverage, so deleting `EVENT_LADDER`, `MICROCYCLE`, etc. does not move the denominator. Deleting well-tested utils (benchmarkStatus, eventWindow) does, so the global ratchet is the thing to measure before and after.
- Coverage was last measured at lines 93.6 / functions 89.7 / branches 85.1 (comment near :240).

### 6. Test counts (rough `it(`/`test(` counts, before)
| File | Count | Fate |
|---|---|---|
| `utils/__tests__/benchmarkStatus.test.js` | 50 (+2 `it.each`) | slice 6 delete |
| `utils/__tests__/eventWindow.test.js` | 22 (+3 `it.each`) | slice 6 delete |
| `hooks/__tests__/useBenchmarkStatuses.test.js` | 8 | slice 6 delete |
| `hooks/__tests__/useBenchmarkSessions.test.js` | 7 | slice 6 delete |
| `hooks/__tests__/useLinkBenchmarkSession.test.js` | 8 | slice 6 delete |
| `components/__tests__/BenchmarkBadge.test.jsx` | 12 | slice 6 delete |
| `components/__tests__/BenchmarkLinkControl.test.jsx` | 7 | slice 6 delete |
| `views/__tests__/CalendarView.test.jsx` | 16 | slice 6 delete |
| `views/__tests__/CalendarView.benchmark.test.jsx` | 9 | slice 6 delete |
| `views/program/__tests__/ProgramYear.test.jsx` | 3 (references `EVENT_LADDER`) | slice 5 delete |
| `views/__tests__/CalendarView.dayStrip.test.jsx` | 11 | slice 6 edit (mocks), slice 7 rewrite |
| `utils/__tests__/schedule.test.js` | 44 | slice 7 reduce to `logEntriesForDate` only |
| `views/__tests__/OverviewView.test.jsx` | 11 | slice 7 or 8 (see 0.1) |
| `views/mobile/__tests__/MobileToday.test.jsx` | 12 | unchanged, must pass |
| `hooks/__tests__/useSessionLog.test.js` | 16 | unchanged |
| `components/__tests__/WorkoutItem.test.jsx` | 4 | unchanged (WorkoutItem not culled; its only importers are `CalendarView` and probably `ProgramMicrocycle`, so check orphan status after slice 5 and 7) |

Slice 6 sum of deleted counts: 50+22+8+7+8+12+7+16+9 = **139** (plus 5 `it.each` generators), well above the epic's "~90 tests". The exact before/after figure needs `npx vitest run` and was not run (read-only).

### 7. e2e, CI and snapshots
- `e2e/smoke.spec.js`: the `TABS` array (lines ~13-27) includes `'calendar'`. It loads the tab and asserts no render error. It does not reference the ladder text. It also contains an `rgb(0, 212, 255)` check at line ~108 (`ACCENT_RGB` from `DEFAULT_THEME`) inside the all-tab loop.
- `e2e/visual.spec.js`: `calendar` test (:127-131) and the pinned `FIXED_TIME` of Mon 15 Jun 2026 UTC. Baseline `desktop-calendar-visual-linux.png` will change in both slice 6 (panel gone) and slice 7 (strip gone). Slice 5 removes the `desktop-program` and `desktop-journal` baselines. `mobile-today-visual-linux.png` exists, and MobileToday is unchanged by these slices.
- `e2e/fixtures.js` and `e2e/squat.spec.js`: no ladder, calendar or benchmark references found in `fixtures.js` (the grep for `sessions|benchmark` returned no `benchmark` hit).
- Scripts and workflows: none of `scripts/*.mjs` or `.github/workflows/*.yml` reference ladder, benchmark, `CalendarView` or `dayStrip`. `check-colour-literals.mjs` has an allowlist per file and hex. I did not check whether `CalendarView.jsx`, `BenchmarkBadge.jsx` or `BenchmarkLinkControl.jsx` have entries, so check before deleting, because a stale entry fails the check. The epic says slice 5 drops only the `views/program/ProgramYear.jsx` entry.
- `check-migrations.mjs` and `manifest.json` list migration 009, which stays.
- `.design-sync/DESIGN_BRIEF.md:83` and `:440` and `NOTES.md:219` reference `useBenchmarkStatuses` and `BenchmarkBadge`. `npm run check:design-sync` guards only the machine contract in `config.json`; I did not verify that it ignores prose references.

### 8. Risks and gotchas
- **Slice 5 ordering:** `ProgramYear.jsx` (slice 5) imports `EVENT_LADDER`, `SEASON`, `SEASON_2`, `VOLUME_PROGRESSION`. `ProgramMicrocycle.jsx` imports `MICROCYCLE` and `daySessions`. `ProgramView.jsx` imports `PHASES`. All three importers must be gone before slices 6 and 7 or the build breaks.
- **`sessions.benchmark_key` SQL read-back (acceptance 6.2):** the repo has a live-migrations fixture and migration 009, but I did not query Supabase (read-only, no DB tool use). The before/after column list and non-null count must be captured by a Stage 4+ step via the Supabase connector. Migration 009 creates `sessions_one_session_per_benchmark`, a partial unique index on `(user_id, benchmark_key) WHERE benchmark_key IS NOT NULL`. It stays in place.
- **`benchmark_key` is also selected by `strava-import`?** `supabase/functions/strava-import/mapper.ts:292` has a comment saying `benchmark_key` is "Scott's, not" the importer's. That is a comment only, so the edge function is not a column reader, but it names the column.
- `sessions.date` is TEXT `M/D/YY` and `logEntriesForDate` matches it by string equality (not date_iso). `useSessionLog` keeps `date` and drops `date_iso` from its mapped object (stated in a comment, lines 17-20 of the "FOUR-WAY SPLIT" section). So Calendar's "order by date_iso" is satisfied only by the query order, and CalendarView itself never sorts.
- CalendarView has no loading, error or empty state of its own. With zero sessions it currently still renders 17 roster cells, so acceptance 3 ("zero sessions → empty calendar") is a new behaviour, not an existing one. There is no existing empty-state component in `components/` that I opened.
- `WorkoutItem`'s `session` prop shape (`label/note/fuel/meal`) comes from `daySessions()`. A DB session row in `useSessionLog`'s mapped shape has `label`, `coachNote`, `type`, `duration`, `srpe`, `distance_m`, `avg_watts`, and no `note`, `fuel` or `meal`. So passing DB rows to `WorkoutItem` today would render with `hasDetail` false (no expansion). `LogEntry.jsx` imports from `utils/schedule`? No: `LogEntry.jsx` matched only my `dayStatus|logEntriesForDate` grep, so it may use one of those, but I did not open it. Check it, since slice 7 keeps `logEntriesForDate` but deletes `dayStatus`.

### Files inspected
`CLAUDE.md`s (given), `coach/REORIENTATION_EPIC_2026-11-06.md` (slices 5-8, D13/D14, rows 96/97), and in /home/user/erg-dashboard/web: `src/views/CalendarView.jsx` (full), `src/utils/schedule.js` (full), `src/constants/schedule.js` (export list only), `src/hooks/useBenchmarkStatuses.js`, `useBenchmarkSessions.js`, `useLinkBenchmarkSession.js`, `useSessionLog.js`, `useSessions.js` (all full), `src/constants/sessionStatus.js` (head), `src/views/mobile/MobileToday.jsx` (lines 1-140), `src/views/OverviewView.jsx` (lines 60-175 plus grep), `src/components/WorkoutItem.jsx` (head), `src/views/__tests__/CalendarView.dayStrip.test.jsx` (full), `CalendarView.test.jsx` and `CalendarView.benchmark.test.jsx` (heads and greps), `src/utils/__tests__/schedule.test.js` (lines 1-60, 205-262, describe list), `vite.config.js` (lines 195-420), `e2e/visual.spec.js` (head), `e2e/smoke.spec.js` (head), and greps across `src`, `e2e`, `scripts`, `.design-sync`.

**Not inspected:** `utils/benchmarkStatus.js` and `utils/eventWindow.js` bodies (only exports and line counts), `BenchmarkBadge.jsx` and `BenchmarkLinkControl.jsx` bodies, `LogEntry.jsx`, `PlanView.jsx` body, `check-colour-literals.mjs` allowlist, `invalidateSessionQueries.test.js`, migration 010, any Supabase state, and no test run was executed.

Absolute path of the epic doc: /home/user/erg-dashboard/coach/REORIENTATION_EPIC_2026-11-06.md. I did not open `coach/REORIENTATION_RESEARCH_2026-11-06.md` §B 1.1, 1.2, 2, so nothing here is drawn from it.

## Slice 8

Slice 8 (#421) map. Read-only; repo HEAD 2cd7d9e (after 4a). Slices 5/6/7 have NOT landed in this tree (constants/program.js, ProgramView, CalendarView roster code and EVENT_LADDER all still exist). Line numbers below are current.

### Corrections to the issue/epic premises (read first)
1. `computeReadiness` is NOT in analysis.js. It is already in `web/src/utils/recoveryAnalytics.js:49` (merged there earlier; comment at :40-48). Nothing needs to move. `analysis.js` (94 lines) exports only `evaluateRules`, `checkConsistency`, `autoregulate`. `calcReadiness` and `analyzeBarometer` are gone from it (ErgView.jsx:126 has its own local `analyzeBarometer`).
2. The MobileRecovery "deficit block" is not nutrition. `views/mobile/MobileRecovery.jsx:269-317` is the HRV tile: `deficit = round((personalBaselines.hrvBaseline - (latest.hrv ?? 0))*10)/10` (:270-273), colour thresholds <3/<8 (:274-279), rendered as "↓ {deficit} vs {baselineLabel}" (:313). The file imports no nutrition/macro/kcal anything; a case-insensitive grep for deficit|macro|nutrition|kcal|protein across `web/src` outside constants/squat finds nothing in MobileRecovery beyond that HRV deficit. Deleting :269-317 as written would remove the HRV tile (D16 and the epic range look mistaken). Nutrition content in views exists only in `ProgramView.jsx` (imports `constants/nutrition.js`, :14) and the Overview "NUTRITION STATUS" stub.
3. `latestSquat` is a hardcoded literal, not computed from data: `App.jsx:254` `strengthTrend['Back Squat'].slice(-1)[0]` over the static `strengthTrend` const (`App.jsx:98-136`, last squat point `<value redacted>`). Passed at `App.jsx:447`, rendered only in OverviewView (see 4). `strengthTrend` itself is still passed to StrengthView at `App.jsx:466`; removal is slice 11 per the epic (`Remove strengthTrend (App.jsx:99-136)`), not slice 8.
4. The Nutrition Status section in Overview is already a stub (4a): static "No nutrition log yet." panel, no imports from nutrition.js. Overview does not import `constants/nutrition.js` or `assessMacro`/`macroColor` at all.
5. Overview already has the Training Load chart with a CP-unavailable branch (see 6). The epic's section ranges are stale; use the map below.

### 1. OverviewView.jsx (1234 lines): section map
Props (:46-58): `latest, loadUnavailable, tsbColor, loadData, loggedSessions, latestErg, latestSquat, totalErgDist, totalSessions, isWide, nowTick`. Hooks inside: `useVitals()` -> `{latest: todayRec, readiness, personalBaselines}` (:68), `useAnchors()` -> `{cp, ftp, cpAvailable}` (:73). Module constant `TSB_COPY` (:35-42; the "fatigued" text mentions "Protect Thursday rest" — roster-specific copy).

Imports (:1-33): recharts (LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine); WorkoutItem; LogEntry; LoadTooltip; `deriveTargets, tsbBand` from trainingLoad; `getRosterMode, logEntriesForDate, getToday, getUpcomingSessions, daySessions` from utils/schedule; `evaluateRules, checkConsistency, autoregulate` from utils/analysis; `HR130_POWER` (trainingConfig); `PHASE_CONTEXT` (constants/schedule); useVitals; useAnchors; `ADAPTIVE_RULES, RULE_EVOLUTION` (coaching); THEME; alpha; FONT.

| Lines | Section | Renders | Verdict |
|---|---|---|---|
| 73-390 | IIFE "CONDENSED TODAY STATUS STRIP" | `getToday(getRosterMode(nowTick))` (:74); `lastSrpe` scan of loggedSessions (:75-80); `evaluateRules`+`autoregulate` -> `sig` (:81-87); `getUpcomingSessions(nowTick, loggedSessions)` (:88). Card border coloured by `sig.color`; header date `t.dateStr`; subline `PHASE_CONTEXT.phaseLabel · wk weeksIn/weeksTotal · t.cycleLabel` (:122-127); right side "● {sig.signal}" and "readiness {readiness.score}" (:134-143) | REMOVE: signal, phase subline, today box (:146-~215, uses `t.today`, `daySessions`, `logEntriesForDate`, WorkoutItem, `t.cycleColor`, `t.todayKey`), upcoming list (:~225-297). KEEP content-wise: readiness score text (:140-143, tested), and the "RECENTLY COMPLETED" block |
| 299-377 | "Recently completed" inside the strip | `loggedSessions.slice(0,4)`: label, sRPE, PR count, `e.date.slice(0,-3)` | Candidate for recent sessions (duplicate of the list at 1160+) |
| 392-496 | Phase context card | `PHASE_CONTEXT.phaseLabel, weeksIn, weeksTotal, window, arc.map, doing, why, notYet, nextGate` | REMOVE (hardcoded) |
| 498-555 | Stats grid (4 tiles, `isWide?4:2` cols) | SESSIONS LOGGED (`totalSessions`), ERG DISTANCE (`totalErgDist/1000` km), LATEST WATTS (`latestErg?.avg_watts`), SQUAT e1RM (`latestSquat.e1rm`, :~519) | REMOVE the SQUAT tile; the other three tiles are not named in the issue as removed |
| 557-782 | Adaptive Decision Engine | recomputes `evaluateRules` (:565), `checkConsistency` (:571), ADAPTIVE_RULES/RULE_EVOLUTION lists | REMOVE |
| 784-947 | Today's Prescription | `evaluateRules`, `autoregulate`, `deriveTargets(HR130_POWER)` (:799-800), HR130 prose at ~:935-940 | REMOVE |
| 949-1123 | Training Load chart | header "TRAINING LOAD" + CP label (:963-970); "TRAINING LOAD UNAVAILABLE" (:974-984); CTL/ATL/TSB tiles (:1000-1010); LineChart with `LoadTooltip`, `loadData`, `tsbColor` (:~1040-1095); TSB copy via `TSB_COPY[tsbBand(tsbNow)?.key]` with fallback "No training-load reading — form status unknown." (:1105-1107); CTL footnote with CP/FTP or "unavailable while the CP anchor cannot be read" (:1117-1121) | KEEP (adjust `TSB_COPY` roster line) |
| 1125-1155 | Nutrition Status stub | static "NUTRITION STATUS" / "No nutrition log yet." | REMOVE |
| 1157-1179 | RECENT SESSIONS | `loggedSessions.slice(0,4).map(<LogEntry/>)` | KEEP. A recent-sessions list already exists; no composing needed |
| 1181-1233 | SEQUENCING RULES | hardcoded 8-item array of rules | REMOVE |

So Overview already contains: load chart, readiness (as a text fragment in the strip, not a standalone card), and a recent-sessions list (LogEntry x4) plus the "Recently completed" mini-list. After the removals the readiness score needs a host element (it currently lives in the removed signal header at :140-143). `nowTick` becomes unused by Overview; it is passed from `App.jsx:451` and defined at `App.jsx:196` (only consumer).

Overlap with slices 5-7: slice 7 keeps `logEntriesForDate`, which Overview also calls (:150), but Overview's use disappears with the today box. Overview imports `PHASE_CONTEXT` from constants/schedule (slice 7 deletes the SEASON*/MICROCYCLE side but `PHASE_CONTEXT` is also used by CalendarView:19,123). `TSB_COPY` text at :40 ("Protect Thursday rest") is roster-bound.

### 2. Exports and importers
All grep covered `web/src`, `web/scripts`, `web/e2e`, `web/.design-sync` (the `.js`/`.jsx`/`.mjs` and config files).

**utils/analysis.js**: `evaluateRules`, `checkConsistency`, `autoregulate`. Importers: `views/OverviewView.jsx:21-25`, `utils/__tests__/analysis.test.js:6` (164 lines; also imports RHR/HRV defaults from recoveryAnalytics). No other importers. It imports `RHR_DEFAULT, HRV_DEFAULT` from recoveryAnalytics.js and THEME. (`.design-sync/HANDOFF.md:208,279` mention analysis.js in prose only.)

**constants/coaching.js** (153 lines): `ADAPTIVE_RULES` (:7), `RULE_EVOLUTION` (:121), `DAILY_ROUTINE` (:143). Importers: only `OverviewView.jsx:30` (ADAPTIVE_RULES, RULE_EVOLUTION). `DAILY_ROUTINE` has no importer.

**constants/nutrition.js** (201 lines): `MACRO_TARGETS`, `MF_PROGRAM`, `DEFICIT_PROGRAM`, `FUELLING`, `NUTRITION_PRINCIPLES`, `NUTRITION_TARGETS`. Importer: only `views/ProgramView.jsx:14` (deleted by slice 5). Not imported by Overview or any mobile view. `utils/formatting.js` `assessMacro` takes a range arg and does not import nutrition.

**constants/schedule.js** (718 lines): `ROSTER_REGIMES` (:13), `ROSTER_OVERRIDES` (:24), `MICROCYCLE` (:26), `SEASON` (:250), `SEASON_2` (:262), `EVENT_LADDER` (:338), `VOLUME_PROGRESSION` (:418), `PHASES` (:452), `PHASE_CONTEXT` (:698). Importers:
- `utils/schedule.js:1-5` (MICROCYCLE, ROSTER_REGIMES, ROSTER_OVERRIDES)
- `views/OverviewView.jsx:27` (PHASE_CONTEXT)
- `views/CalendarView.jsx:19` (MICROCYCLE, PHASE_CONTEXT; used :95, :123)
- `views/ProgramView.jsx:15` (PHASES)
- `views/program/ProgramMicrocycle.jsx:2` (MICROCYCLE); `views/program/ProgramYear.jsx:~6` (multi-name import)
- `hooks/useBenchmarkStatuses.js:2` (EVENT_LADDER — default arg at :9)
- Tests: `utils/__tests__/schedule.test.js:6`, `eventWindow.test.js:2`, `benchmarkStatus.test.js:8`, `hooks/__tests__/useBenchmarkStatuses.test.js:18`, `views/__tests__/CalendarView.test.jsx:5`, `views/program/__tests__/ProgramYear.test.jsx:4`
- Prose-only: `eventWindow.js:1`, `.design-sync/splitiq-load.js:201` (own local SEASON), `constants/logs.js` text.
- `EVENT_LADDER` is the load-bearing dependency: `useBenchmarkStatuses` and benchmark tests need it after slice 6 culls the ladder. Slice 8 cannot "delete the remainder of constants/schedule.js" unless slice 6 relocates/removes EVENT_LADDER first.

**utils/schedule.js** (228 lines): `ROSTER_ANCHOR` (:39), `getRosterMode` (:41), `SESSION_OVERRIDES` (:61), `resolveDay` (:91), `logEntriesForDate` (:113), `dayStatus` (:124), `getToday` (:137), `getUpcomingSessions` (:169), `daySessions` (:208). Importers: `OverviewView.jsx:14-20`, `CalendarView.jsx:12-17` (getRosterMode, resolveDay, dayStatus, daySessions, logEntriesForDate; uses dayStatus :77, logEntriesForDate :81), `views/program/ProgramMicrocycle.jsx:4` (daySessions), test `schedule.test.js:17` (123 refs; describes at :22-327 incl. logEntriesForDate :207).
Conflict: slice 7 keeps `logEntriesForDate` (and Calendar also uses `dayStatus`, which slice 7's keep list does not name), yet #421 deletes "the remainder of utils/schedule.js" and acceptance 5 says no schedule import remains. The kept function needs a new home (or the criterion needs wording), decided before slice 8.

**TSB_BANDS / tsbBand**: `utils/trainingLoad.js:137` / `:169` (comment :27); tests `utils/__tests__/tsbBand.test.js`. Importers of tsbBand: Overview, MobileRecovery:14, MobileToday:6-10, MobileAnalytics:7. Unchanged by this slice. `PHASE_CONTEXT` lives in constants/schedule.js:698 (fixed content: 'BASE', 'Phase 1 — Base (Extended)', weeksIn 3/12, arc, doing/why/notYet/nextGate).

### 3. deriveTargets, assessMacro, macroColor
- `deriveTargets(hr130Series)`: `utils/trainingLoad.js:112-129` (returns anchor/ut1/ut2 bands, 150 default). Importers: `OverviewView.jsx:13` (used :800) and `utils/__tests__/trainingLoad.test.js:4`, describe at :407 (cases :409, :419). Only user of Overview's `HR130_POWER` import; `HR130_POWER` (`constants/trainingConfig.js:284`) is still used by `ErgView.jsx:21,181,237,583`, so it stays.
- `assessMacro` `utils/formatting.js:35-41`, `macroColor` `:43-49`. No importer outside `utils/__tests__/formatting.test.js` (imports at :5-6; describes `assessMacro` :104-139, `macroColor` :141-153). No component imports them (not Overview, not ProgramView).

### 4. latestSquat
Computed `App.jsx:254`; passed `App.jsx:447`; destructured `OverviewView.jsx:53`; rendered in the SQUAT e1RM tile (:~519-520 `${latestSquat.e1rm}kg`, `as of ${latestSquat.date}`). Test: `OverviewView.test.jsx:91` passes `latestSquat: <fixture>` in baseProps.

### 5. MobileRecovery and MobileToday
- MobileRecovery HRV deficit tile: see correction 2 (:269-317). Imports (:1-16): vitals, vitalsSync, TSS history, `calcTrainingLoad, tsbBand`, THEME, FONT.
- MobileToday phase: `useAnchors()` -> `{anchors, cp}` (:63); `phase = anchors?.current_phase?.value ?? null`, `block = anchors?.current_block?.value ?? null` (:109-110); rendered as a header pill only when `phase` is truthy (:150-167) as `[phase, block].filter(Boolean).join(' · ').toUpperCase()`. It imports no schedule/analysis. Already satisfies acceptance 1 for mobile. Existing tests: `views/mobile/__tests__/MobileToday.test.jsx:160-177` ("is absent when no anchor names a phase" asserts `queryByText(/WK/)` null — weak, since the pill never contains literal "WK" unless the block does; "renders the live anchor" expects 'BASE · WK 3/12'). Desktop Overview has no anchor-driven phase rendering and no test for it.

### 6. Anchors / null-CP path
- `hooks/useAnchors.js`: react-query key `['anchors']`, selects rows `.is('superseded_at', null)`, builds `byKey`; returns `{...query, anchors, cp, cpStatus, cpAvailable, ftp, ftpStatus}`. `current_phase` is read only by MobileToday:109 (and `hooks/__tests__/useAnchors.test.js:56`). `cp` via `toNum` -> null when absent.
- Null-CP behaviour: `trainingLoad.js sessionLoad` (:36-58) returns 0 for power-only sessions when threshold is missing; srpe-based sessions still score. `useTSSHistory.js` recomputes with cp/ftp. Overview shows "CP unavailable" (:967-969) and the footnote (:1119-1121). Tests exist in `OverviewView.test.jsx`: `says CP is unavailable rather than showing a stale threshold` (:~126, sets cp null, cpAvailable false; asserts "CP unavailable") and `says the training load is unavailable...` (:~140; latest null + loadUnavailable asserts "TRAINING LOAD UNAVAILABLE", >=3 "—", /form status unknown/). No single test combines `cpAvailable:false` with `loadUnavailable:true`. The `sessionLoad` null-CP-to-0 path is in `utils/__tests__/trainingLoad.test.js` (not inspected for that case).

### 7. computeReadiness fallbacks (<14 samples)
`utils/recoveryAnalytics.js`: `computePersonalBaselines(rows, minSamples=14)` (:17-37) uses `RHR_DEFAULT=57`, `HRV_DEFAULT=30`, `SLEEP_TARGET=7` (:4-6) when fewer than 14 non-null readings per metric; per-metric flags `rhrPersonal`/`hrvPersonal`. `computeReadiness(latest, baselines={}, tsb=null)` (:49-83) falls back to the same defaults via `??`, returns `{score:null,status:'NO DATA',partial:true}` if no numeric rhr. Called by `hooks/useVitals.js:43` with `computePersonalBaselines(rows)` (:40). Existing tests: `recoveryAnalytics.test.js:37-41` (13 rows -> defaults), `:127-131` (explicit baselines), computeReadiness suite :79-157 (defaults, null, partial, tsb term). Overview test builds baselines from a single row (so <14) at `OverviewView.test.jsx:37,104,118`, but no test asserts that fallback explicitly at the view level.

### 8. Tests and coverage keys
- `views/__tests__/OverviewView.test.jsx` (200 lines): mocks useVitals and useAnchors; tests: readiness from live vitals ('20'), dash for no vitals (/readiness\s+—/), CP label 205W / not 190W, CP unavailable, training load unavailable (null latest), no outage line while pending, renders without crashing (textContent >200), fresh TSB narrative (length-only), narrow layout (length-only), empty nutrition panel ('NUTRITION STATUS', 'No nutrition log yet.' — dies with the section), empty session history (length >50). Props include `latestSquat`, `nowTick`. Several are weak length-only assertions. Nothing asserts on the removed sections' contents (signal, prescription), the RECENT SESSIONS list, or phase.
- Other test files tied to deleted code: `analysis.test.js`, `schedule.test.js`, `trainingLoad.test.js` (deriveTargets block :407+), `formatting.test.js` (macro blocks :104-153). Tests that need updating but survive: `CalendarView*.test.jsx`, `useBenchmarkStatuses.test.js`, etc. depend on slices 6/7.
- `web/vite.config.js` coverage: global thresholds at :228-245 (branches 80 at :242; 89/85/80 per the epic). Per-file keys: `src/views/OverviewView.jsx` {lines 80, functions 80, branches 70} at :335-339 (the issue's "80/80/70"). I found no per-file keys for analysis.js, schedule, coaching, nutrition, formatting, trainingLoad, MobileToday or MobileRecovery (the key listing covers sentry, queryErrorHandlers, eventWindow, benchmarkStatus, hooks, WorkoutItem, LoadTooltip, LogEntry, StrengthView, MobilityView, OverviewView, CalendarView, splash/hook files, anatomy, AuthGate). `constants/**` is excluded from coverage, so deleting coaching/nutrition/constants-schedule does not change the denominator; `utils/analysis.js`, `utils/schedule.js` and the formatting/trainingLoad functions are in the denominator, so deleting them (with their tests) shifts global coverage.

### 9. Other references
- `.design-sync/entry.jsx`: no import of OverviewView, analysis, schedule, coaching or nutrition (exports LogEntry, WorkoutItem, tooltips, THEME, derivePaceZones, etc.). `scripts/check-design-sync-entry.mjs` guards that contract. Nothing needed there.
- `.design-sync/splitiq-load.js:201` has its own local `SEASON` var (not an import). Docs with stale prose (not code): `HANDOFF.md:208,279`, `DESIGN_BRIEF.md:131,238,537,610,686`, `ISSUES-load-states.md:45,56` (cites `OverviewView.test.jsx:154`, `OverviewView.jsx:959`), `NOTES.md:220`; `.claude/skills/architecture.md:22-44,66`; `VISION.md:121-125` (cull table) and `docs/roadmap/*`. Epic slice 12/13 covers doc edits.
- e2e: `e2e/visual.spec.js:121-124` test 'overview' -> baseline `e2e/visual.spec.js-snapshots/desktop-overview-visual-linux.png`; `mobile-today-visual-linux.png` also exists (MobileToday). The Overview baseline will change (regenerate in the CI container via `E2E — Web` with `update_baselines: true`, per header comment :~28-35). `e2e/smoke.spec.js:16,57` clicks the 'overview' nav. `visual.spec.js:19-20` says Overview/Calendar/MobileRecovery render `new Date()` hence the pinned clock.
- `scripts/check-colour-literals.mjs`: ALLOWED entries (:47-86) are StrengthLogger, ErgLiveView, trainingConfig.js, ErgView, program/ProgramYear. None for OverviewView, MobileToday, MobileRecovery, analysis, schedule, coaching or nutrition. Header comment (:8-13) mentions Overview history only. Deleting `ProgramYear.jsx` (slice 5) would leave a stale entry there; not slice 8's concern.
- Bundle: `npm run build && npm run size` entry budget 150 KB; Overview is within the AuthGate/App lazy tab chunks (CLAUDE.md says all desktop tabs are lazy), so it affects total, not entry.
- No `check:zones` or no-LLM-path hit on these files in the greps I ran.

### Files inspected
/home/user/erg-dashboard/web/src/views/OverviewView.jsx (full structure, sections at 73-390, 392-555, 557-950, 949-1234 sampled); web/src/utils/analysis.js; web/src/constants/coaching.js, nutrition.js, schedule.js (export lists + PHASE_CONTEXT); web/src/utils/schedule.js (export list, logEntriesForDate); web/src/utils/trainingLoad.js; web/src/utils/formatting.js; web/src/utils/recoveryAnalytics.js; web/src/hooks/useAnchors.js, useVitals.js, useTSSHistory.js; web/src/views/mobile/MobileToday.jsx (1-175), MobileRecovery.jsx (imports and 255-325); web/src/App.jsx (95-140, 236-262, 425-460); web/src/views/CalendarView.jsx (imports only); web/src/views/__tests__/OverviewView.test.jsx (full); web/src/views/mobile/__tests__/MobileToday.test.jsx (test names + 155-200); web/src/utils/__tests__/recoveryAnalytics.test.js (selected), analysis.test.js/schedule.test.js/formatting.test.js/trainingLoad.test.js (describe names, grep); web/vite.config.js (coverage block); web/scripts/check-colour-literals.mjs (head and ALLOWED keys); web/e2e/visual.spec.js (head/overview test); web/.design-sync/entry.jsx; coach/REORIENTATION_EPIC_2026-11-06.md (slice 8 text, D15/D16 only).
Not inspected: `coach/REORIENTATION_RESEARCH_2026-11-06.md` (§B 1.4, 1.9, 2, 3) and the rest of the epic; Overview chart body (:1000-1095) line by line; useAnchors.test.js; trainingLoad.test.js sessionLoad cases; ProgramView/ErgView beyond import greps; bundle-size script outputs (no build run).

## Slice 9-10

Research map for slices 9 (#422) and 10 (#423). Read-only; nothing run beyond grep/sed/cat. Paths are under /home/user/erg-dashboard/web/ unless marked. No personal values are quoted; shapes only.

### Overlaps with slice 8 and slice 5 (state at HEAD 2cd7d9e)
- `OverviewView.jsx:26` imports `HR130_POWER` and `:799` calls `deriveTargets(HR130_POWER)`. Slice 8 deletes both, and slice 9 can't delete `HR130_POWER` until then.
- `OverviewView.jsx:53,519` reads `latestSquat`, built at `App.jsx:254` from `strengthTrend['Back Squat']`. Slice 8 removes that stat, so slice 10 only has to remove the `App.jsx` const and the `latestSquat` prop at `App.jsx:447`. The `OverviewView.test.jsx:91` fixture also carries `latestSquat`.
- `ProgramView.jsx:2` imports `HR_ZONES`, `EST_MHR`, `SRPE_SCALE` (uses at :742, :745, :1252). Slice 5 deletes ProgramView. After that, `SRPE_SCALE` has zero importers; slice 9 lists it as Out, so it stays as an orphan.
- Slice 5 says `constants/program.js` is deleted, but `SRPE_GUIDE` is not in it. It lives in `trainingConfig.js`, which slice 5 leaves untouched. No slice-5 text moves it.

### 1. `constants/trainingConfig.js` (320 lines)

| Export | Line | Importers (non-test) |
|---|---|---|
| `SRPE_GUIDE` | 7 | `views/LogView.jsx:3,54` only |
| `CALIBRATION_STATUS` | 49 | none (only `deriveCalibrationStatus` and the test) |
| `deriveCalibrationStatus` | 156 | `ErgView.jsx:19,230` |
| `CRITICAL_POWER` | 170 | `ErgView.jsx:16,1003` (only the `wPrime` null check) |
| `POWER_DURATION` | 178 | `ErgView.jsx:17,1048` |
| `FTP_TEST` | 221 | `ErgView.jsx:18,914-947` |
| `HR_ZONES` | 231 | `ProgramView.jsx:2,745`, and inside `derivePaceZones` |
| `EST_MHR` | 279 | `ProgramView.jsx:2,742` |
| `SRPE_SCALE` | 281 | `ProgramView.jsx:2,1252` |
| `HR130_POWER` | 284 | `ErgView.jsx:21,181,237,583`, `OverviewView.jsx:26,799` |
| `derivePaceZones(cp)` | 306 | `ErgView.jsx:20,229`; `.design-sync/entry.jsx:23`; `scripts/check-zone-bands.mjs:29,34,100`; `components/__tests__/PaceTrendChart.test.jsx:4,7`; `constants/__tests__/trainingConfig.test.js` |

- The module-private `ZONE_POWER_PCT` is at :295-302.
- None of the to-delete symbols is read by Recovery, LogView, ErgLiveView, PaceTrendChart, mobile views or hooks. `useAnchors` does not import `trainingConfig`.
- **`derivePaceZones` depends on `HR_ZONES` for colour.** `trainingConfig.js:307-313` does `HR_ZONES.find((z) => z.zone === zone)` and `color: hz?.color ?? '#666'`. The Recovery zone has no `HR_ZONES` row, so it always takes `'#666'`. Deleting `HR_ZONES` removes the only source of the other five zone colours (UT2, UT1, AT, TR, AN), which come from `THEME.accent/positive/caution/warning/critical`. `PaceTrendChart.jsx` uses `z.color` as the `ReferenceArea` fill. The 205 fixture at `PaceTrendChart.test.jsx:7` does not assert colours. `trainingConfig.test.js:98-117` pins the UT2/UT1/AT watt bands only.
- **CP source at each call site:**
  - `ErgView.jsx:228-229`: `const { cp, cpStatus, cpAvailable } = useAnchors(); const paceZones = cpAvailable ? derivePaceZones(cp) : [];`. This is the live anchor.
  - `check-zone-bands.mjs:100` passes the CP it parses from markdown.
  - The test fixtures pass the literal 205.
  - No call site uses a `CRITICAL_POWER` literal. `CRITICAL_POWER` carries no CP number: `wPrime: null`, `northStar` and `status` only.
- **`utils/pace.js:16` `classifyZone(watts, cp)`** repeats the 0.55/0.7/0.8/0.9/1.05 breakpoints. It returns `'Recovery'` below 0.55 and null if CP is not finite. `useErgSessions.js:4,22` uses it.
- **Tests that break when the symbols go:**
  - `constants/__tests__/trainingConfig.test.js` imports `CALIBRATION_STATUS`, `CRITICAL_POWER` and `deriveCalibrationStatus`. Lines 13-33 and 35-103 depend on them. The `derivePaceZones` block (:98-117) and the `PACE_ZONES` absence test (:18-20) survive.
  - `ErgView.test.jsx:215-250` asserts `'CP 205W (provisional)'`, `'CP 212W (confirmed)'` and `'CP anchor unavailable'`. All three strings come from `deriveCalibrationStatus` rendering through the calibration panel (`ErgView.jsx:1111-1239`).
- **Docs that name the symbols:** `.claude/skills/architecture.md:19`, `VISION.md:124` (keeps `derivePaceZones`), `.design-sync/NOTES.md`, `STATE_OF_PLAY.md` and `DESIGN_BRIEF.md` (history text).
- **Four reaching surfaces for `derivePaceZones`:** `check-zone-bands.mjs:29`, `.github/workflows/zone-bands.yml:51` (path filter), `.design-sync/entry.jsx:23`, `ErgView.jsx:20,229`. `zone-bands.yml` also filters `utils/pace.js`.

### 2. `views/ErgView.jsx` (1271 lines)
- **`ergTrend`, lines 34-119.** Module-level array of 11 objects `{date 'M/D', dist, pace (s/500m), watts, label, hardPush}`. Feeds the "WORKING POWER TREND" `LineChart` (`data={ergTrend}` :397, `ErgTooltip`). `ErgTooltip.jsx` reads `d.date`, `d.dist`, `d.watts`, `d.pace`, `d.hardPush` (`hardPush` is false/true: "Z2" vs "hard push"). Literals tied to this chart in the same section:
  - `YAxis domain={[110, 200]}` :411
  - `ReferenceLine y={150}` :424, label 'Z2 top'
  - `ReferenceLine y={125}` :437, label 'Z2 base'
  - Prose :490-493: pacer watts, "DF 125", "HR ceiling 136", "6/12 showed 151W at HR130"
- **`analyzeBarometer(points)`, :126-179.** Least-squares over `type==='actual' && !setupArtifact` points. Returns null under 3 points. Epoch at :130 and `xs` at :132 are `new Date('2026/' + date)`, parsing the 'M/D' strings. It returns `{slopePerWeek, r2, residSd, spread, nPoints, currentLevel, verdict}`. The `verdict` strings embed "PLATEAU... Next real signal = end-of-base 5k" and "late-base".
  - `HR130_ANALYSIS = analyzeBarometer(HR130_POWER)` at :181, at module scope.
  - Rendered at :669-780 (`{HR130_ANALYSIS && (...)}`); copy at :775-779 says "4 clean HR130 anchors; the 6/8...".
  - It uses `mean` and `sampleStdDev` from `utils/stats.js`.
- **`HR130_PROJECTION`, :184-190.** `{startWatts, endLow, endHigh, endDate:'early Sep', note}`. The note has a 4-point watts sequence inline. Used at :535-547 (stat boxes, the '6/12 baseline' label at :536), :618 and :631 (`ReferenceLine y={165}`/`y={180}`), :665. The HR130 `LineChart` is at :583 with `domain={[120, 185]}` at :597. Also `hr130Now` at :236-237 feeds the "HR130 POWER" stat tile (:299-303, shows '—' when null).
- **`useErgSessions`:**
  - Defined in `hooks/useErgSessions.js`; the per-file 80/80/70 key is at `vite.config.js:295`.
  - Query key `['erg-sessions']`. `sessions` filtered `type='erg'` and `status in COMPLETED_STATUSES`.
  - Selects `id, date, type, label, duration, srpe, status, distance_m, avg_watts, avg_hr`.
  - Ordered `date_iso desc nullsFirst:false`, then `id desc`, `limit(50)`.
  - `enrich()` adds `pace_500m` (from `avg_watts`, else from distance and duration), `pace_500m_str`, `zone` (`classifyZone(avg_watts, cp)`), `hardPush` (`srpe>=7`) and `date_display` ('M/D' derived via `toISODate`). `date` stays the raw M/D/YY text.
  - The returned `data` is re-sorted newest-first by `toISODate(date)`. Unparseable dates give `''` and sort last.
  - `ErgView` uses `ergQuery.data ?? []`. The hook has no `isLoading`/error handling in ErgView.
  - `ErgView` has no `HR130` source other than the literal. `avg_hr` is selected but not used in ErgView.
- **`toISODate`** (`utils/dateFormat.js`): M/D/YY becomes `20YY-MM-DD` (pads); an already-ISO string passes through; anything else gives `''`.
- **Existing "unavailable"/"insufficient" patterns to copy:**
  - `ErgView.jsx:997-998`: `cpAvailable ? cp + 'W' : 'CP unavailable'` and `'anchor unreachable'`. Pinned by `ErgView.test.jsx:121-132`.
  - `ErgView.jsx:366`: `'More sessions needed for trend analysis.'`, shown when `paced.length < 6` (the `paceSummary` gate at :249).
  - `ErgView.jsx:129`: `actual.length < 3` returns null, so the analysis panel is simply hidden.
  - `OverviewView.jsx:973` ('CP unavailable'), `:976-985` ('TRAINING LOAD UNAVAILABLE').
  - `RecoveryView.jsx:71` ('VITALS UNAVAILABLE'; pending shows 'Loading vitals…').
  - `CalendarView.jsx:264-273`.
  - `MobileAnalytics.jsx:74-78`. Pending is deliberately not shown as unavailable (#196).
- **`PaceTrendChart.jsx` has no minimum-data gate.** It filters `pace_500m != null` and reverses to chronological. With no data it renders an empty `ResponsiveContainer` (`hasData` only guards axis bounds, :89). The only numeric thresholds in the view are `paceSummary` (6) and `analyzeBarometer` (3).
- **Other ErgView literals:**
  - `ErgView.jsx:266` `'#666'` fallback for zone-bar colour (comes from `paceZones.find(...)?.color`).
  - `POWER_DURATION` rows render `predW` / `actualW` (:1048-1100).
  - `FTP_TEST` card at :914-947.
  - Hard-coded `['1-min','1000m','5000m']` highlight list at :1049.
- **Sections 1, 2 and 4** (stat tiles, `PaceTrendChart`, zone bars) are already driven by `useErgSessions` and `useAnchors`.

### 3. `SRPE_GUIDE`
- **`trainingConfig.js:7-47`.** Five rows `{range, label, anchor, zone, color}` (ranges '1-2' to '9-10'). Only reader is `LogView.jsx:54`.
- **`ErgLiveView.jsx:14-25`.** Local 10-row array `{v: 1..10, label: 'N — text'}`. Rendered at `:385` as the sRPE button row: `.map(({v, label}) => <button onClick={() => setSrpe(v)}>`. The labels differ from the shared copy ('Easy' for 2 vs 'Very easy' for 1-2 etc.).
- **The two are different shapes** (range bands vs per-integer buttons), not just duplicate text. `ErgLiveView` also has `srpe` state and `setSrpe(v)` with numeric `v`. No test file references `SRPE_GUIDE` or `SRPE_SCALE` by name.

### 4. check:colours
- **Allowlist entries in `scripts/check-colour-literals.mjs`:**
  - `:71-75` `web/src/constants/trainingConfig.js` hexes `['#666']`
  - `:76-79` `web/src/views/ErgView.jsx` hexes `['#666']`
  - `:80-83` `web/src/views/program/ProgramYear.jsx` hexes `['#666']` (slice 5 drops it)
  - `:66-70` `ErgLiveView.jsx` allows `#a0a0b8` (unrelated to slice 9)
- **A stale entry fails the check.** The script says so at `:45` and `:220`.
- **Hits for `#666` in src outside tests:** `trainingConfig.js:313`, `ErgView.jsx:266`, and `ProgramYear.jsx:212,500`.
- **Dependency of the Recovery fallback:** `trainingConfig.js:313` `hz?.color ?? '#666'` exists because `HR_ZONES` has no Recovery row. Both literals are in the allowlist, so a stale entry fails the check if either literal is removed without dropping its entry.
- **Colour tokens:** `THEME` in `constants/theme.js` (e.g. `THEME.neutral`, used for Recovery in `SRPE_GUIDE`) points at `var(--color-*)`.

### 5. Numeric CP/HR literals and `'2026/'` in src (non-test)
- `'2026/'`: `ErgView.jsx:130,132` only.
- Inside `trainingConfig.js` (slice 9 deletes): `HR_ZONES` bpm strings :236-272; `EST_MHR` :279 (comment has other bpm figures); `HR130_POWER` :284-290; the `'HR zones (MHR 170)'` metric at :111; the CALIBRATION_STATUS comment at :83.
- `ErgView.jsx`: `:185-188` projection numbers; :411, :424, :437, :597, :618, :631 chart axes and reference lines; :490-493 prose with watt targets, DF 125 and HR ceiling 136; :519 'HR130' copy; :84, :108 (`'6/8'`, `'6/12'` dates inside `ergTrend`).
- Outside slice 9 files:
  - `OverviewView.jsx:891` 'pacer cue ... · HR 130' (slice 8)
  - `ProgramView.jsx:817,821` 'bpm 136–148', 'below 136' (slice 5)
  - `constants/program.js:31`, `constants/schedule.js:473`, `constants/logs.js:44,86,113-114,221-224`: each carries HR/watt figures (slices 5/7).
- **Slice 8 and slice 9 must both land before the `git grep` of numeric literals returns nothing.** `constants/logs.js` is not named in any slice I read; the research (§B 1.7) lists it.
- **`OverviewView.jsx:68`** has a comment about the old fixed 190 CP.
- **Guards already in the tree:** `src/__tests__/noHealthLogs.test.js` pins removed identifiers by concatenated needles. Its list already includes `mobilityLog`. `e2e/` is included in its roots.

### 6. `constants/mobility.js` (147 lines) and `MobilityView.jsx` (219 lines)
- **Exports:** `MOBILITY_ROUTINES` (:4) and `MOBILITY_STREAK_NOTE` (:146-147). The file's header comment (:2) is generic. `MOBILITY_STREAK_NOTE` has zero importers; `MobilityView` no longer reads it. The epic's line numbers (`:51/:99/:147`) are stale.
- **Three routines.** ids `foam`, `prep`, `yoga`.
- **Rehab-specific copy at current lines:**
  - `why` :11 ("the rehab area"), :54 ("Protects the rehab area")
  - `rehab: true` flags at :25, 31, 73, 89, 111, 117 (6 blocks)
  - per-block `visual` text naming the left side or "rehab"/"physio" at :27, 33, 75, 91, 113, 119
  - routine `note` at :46, :94, :142
  - `MOBILITY_STREAK_NOTE` :146
  - roster text in `yoga.when` :101 ("Recovery slots (Thu AM)")
- **`MobilityView.jsx`:**
  - Imports only `MOBILITY_ROUTINES` (:2). `mobOpen` state at :7. No DB read.
  - The banner copy (:19-40) mentions no rehab; the view copy is generic as it stands.
  - The `rehab` flag is read at :140 (`borderLeft` green) and :171-182 (renders the ` · REHAB` badge).
  - The epic's `MobilityView.jsx:38` reference lands on generic banner text, so the stale line number is the issue, not rehab copy.
  - The `routine.note` / `why` rendering is not rehab-gated.
- **Tests.** `views/__tests__/MobilityView.test.jsx` has 2 tests:
  - Test 1: asserts 'MOBILITY — a training pillar', 'ROUTINES · ON HAND', 'Foam Roll / Soft Tissue', plus two negative assertions (`RECENT · TRACKED`, `/in chat/i`).
  - Test 2: expand/collapse, and `getAllByText(/· REHAB/i).length > 0` at :22. This test fails if the `rehab` flags are removed.
  - `src/__tests__/App.test.jsx:135,224` stubs the view.
- **Per-file key:** `vite.config.js:330` `'src/views/MobilityView.jsx': { lines: 80, functions: 80, branches: 70 }`. `constants/**` is excluded from coverage.
- **Other references:** `.claude/skills/architecture.md:68` lists it, and `docs/roadmap/RESEARCH_CODEBASE_2026-11-07.md:465`.

### 7. `strengthTrend` and StrengthView
- **`App.jsx:98-136`** (`const strengthTrend = {...}`) has **8 keys, not nine**: Back Squat, Romanian Deadlift, Bench Press, Incline Bench, Cable Row, Barbell Row, Lat Pulldown, Shoulder Press. Each is an array of 2-3 `{date 'M/D', e1rm}`. The epic and D19 say nine; the 2026-11-07 research already notes eight. Item 4 of the acceptance should say eight or the missing one must be identified.
- **App.jsx uses:** `latestSquat` at :254, passed to Overview at :447. `strengthTrend={strengthTrend}` and `strengthSessions={strengthSessions}` at :465-468 into `<StrengthView>`. `strengthSessions = loggedSessions.filter((e) => e.exercises)` at :249.
- **`StrengthView.jsx` (295 lines).**
  - Props are `{strengthTrend, strengthSessions}`. `activeLift` state defaults to `'Back Squat'` (:27).
  - `LIFT_COLOR` (:15-23) has 7 keys. It has no `'Cable Row'`, so `alpha(LIFT_COLOR[lift], '20')` and the button colours get `undefined` for that lift. The keys also include 'Incline Bench'.
  - Selector `Object.keys(strengthTrend).map` at :48. Chart gated on `strengthTrend[activeLift].length > 1` (:78), else the 'One data point — chart builds as sessions are logged' text (:119-127).
  - Callout `strengthTrend[activeLift].slice(-1)[0].e1rm` / `.date` (:~137-150) and a `+diff kg` delta.
  - **Empty-state crash risk:** with `strengthTrend = {}` or a missing/empty `activeLift` array, `strengthTrend[activeLift]` is undefined (`.length` throws) and `.slice(-1)[0].e1rm` throws on an empty array. There is no zero-lift branch today.
  - Static parts: `STRENGTH_TEMPLATES` and `PREHAB_NOTE` from `constants/exercises.js` (:12, :207, :272), and the sessions list (:285-293).
  - Tests: `views/__tests__/StrengthView.test.jsx` has 2 tests with a 2-lift fixture. Per-file key `vite.config.js:325` is 80/80/70.
- **`PRIMARY_LIFTS`** is at `hooks/useStrengthPRs.js:4-11`, six names: 'Back Squat', 'Bench Press', 'Deadlift', 'Romanian Deadlift', 'Overhead Press', 'Bent Over Row'. It filters the `exercise_prs` view (`.in('exercise_name', PRIMARY_LIFTS)`, :15-21), selecting `exercise_name, best_e1rm_kg, heaviest_kg, logged_sets`. The view has no dates. Only consumer is `views/mobile/MobileStrength.jsx:2,7`, whose empty state is 'No strength PRs yet — log your first session' (:64). So the empty-state misreport risk sits in the mobile PR list.
- **"Barbell Squat" appears nowhere in `web/src`, `supabase/` or `docs/`.** The only hit is `coach/REORIENTATION_RESEARCH_2026-11-06.md:372` and `coach/work-orders/WO-004-strength-templates.md:92` (about resolving Fitbod names to the 873-row library). No code maps 'Back Squat' to 'Barbell Squat' or any other name. `StrengthView`'s own names differ from `PRIMARY_LIFTS` for Barbell Row/Bent Over Row and Shoulder Press/Overhead Press (per the 2026-11-07 research).
- **DB data hooks.** No hook fetches per-set e1RM series. `strength_sets` and `strength_workouts` are only touched inside `StrengthLogger.jsx` (excluded from coverage, vanilla DOM): `:339` (`template_exercises`), `:434`, `:928` (insert `strength_sets`: `workout_id, exercise_id, exercise_name, set_index, weight_kg, reps, rpe, is_warmup, completed`), `:935`, `:1524-1532` (history: `strength_workouts` plus `exercise_prs` ordered by `best_e1rm_kg`), `:176` (local Epley `e1rm(w,r)`). Schema is in `supabase/migrations/007_strength_subsystem.sql`. `exercise_prs` has **no migration** in `supabase/migrations/` (grep for `exercise_prs` in `supabase/` returned nothing), so a view-based series would depend on an object that isn't in the repo.
- **Exercise name source:** `strength_sets.exercise_name` is written from the logger's selected exercise; `exercises` library is text-id, 873 rows (per CLAUDE.md). The StrengthLogger reads `exercises` at :1140.

### 8. Per-file coverage keys in `vite.config.js`
- `src/views/StrengthView.jsx` :325, `src/views/MobilityView.jsx` :330, `src/hooks/useErgSessions.js` :295 (all 80/80/70).
- **No keys** for `ErgView.jsx`, `ErgLiveView.jsx`, `trainingConfig.js`, `App.jsx`, `useStrengthPRs.js`, `OverviewView.jsx` (there is one for OverviewView at ~:336, 80/80/70, not relevant to slice 9/10 beyond slice 8). `constants/**` is excluded from coverage (`:212-221`), so `trainingConfig.js` and `mobility.js` count nowhere. Global thresholds are `lines 89 / functions 85 / branches 80` (:240-242). ErgView and ErgLiveView are only held by the global floor, so "ErgView coverage not lowered" has no automated gate. It needs a before/after report from `npx vitest run --coverage`.
- `ErgLiveView.test.jsx` covers the save and summary flows; it has no sRPE-guide assertions, so unifying `SRPE_GUIDE` has no pinned text.

### Files inspected
`web/src/constants/trainingConfig.js`, `web/src/constants/mobility.js`, `web/src/constants/__tests__/trainingConfig.test.js`, `web/src/views/ErgView.jsx` (1-345, 380-500, 880-1175 partially), `web/src/views/ErgLiveView.jsx` (1-60, 375-400), `web/src/views/MobilityView.jsx`, `web/src/views/StrengthView.jsx`, `web/src/App.jsx` (90-140, 240-258, 440-470), `web/src/hooks/useErgSessions.js`, `useAnchors.js`, `useStrengthPRs.js`, `web/src/components/PaceTrendChart.jsx` (partial), `ErgTooltip.jsx`, `web/src/utils/pace.js`, `dateFormat.js`, `web/src/views/__tests__/ErgView.test.jsx` (partial), `MobilityView.test.jsx`, `StrengthView.test.jsx`, `ErgLiveView.test.jsx` (test names only), `web/scripts/check-colour-literals.mjs`, `check-zone-bands.mjs` (head), `web/vite.config.js` (coverage block), `web/.design-sync/entry.jsx` (:15-30), `.github/workflows/zone-bands.yml` (:40-60), `coach/REORIENTATION_EPIC_2026-11-06.md` (§5 slices 5-10, D13-D21), `coach/REORIENTATION_RESEARCH_2026-11-06.md` (§B 1.5, 1.8, 2, 5, 7, §C item 372). Grepped but did not read in full: `StrengthLogger.jsx`, `views/mobile/MobileStrength.jsx`, `OverviewView.jsx`, `ProgramView.jsx`, `constants/logs.js`, `docs/roadmap/RESEARCH_CODEBASE_2026-11-07.md` (lines 386-394). Not inspected: ErgView :500-880 and :1175-1271 beyond grep, supabase migrations other than by name, e2e specs beyond grep.
