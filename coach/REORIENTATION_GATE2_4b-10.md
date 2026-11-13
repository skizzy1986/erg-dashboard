# SplitIQ reorientation — slices 4b–10: Gate 2 packet

> `/orchestrate #417–#423`, 2026-11-13, `main` at `2cd7d9e`. Session:
> https://claude.ai/code/session_018vVjPzsLzCJ8rT1K1ixETr
>
> Gate 1 was passed at epic level (2026-11-06); each issue body is the approved story, so Stage 2
> was skipped. Stage 1 (Codebase Onboarding Engineer, sonnet) and Stage 3 (Workflow Architect,
> opus) ran read-only; `git status` was clean after every spawn. The 9–10 spec agent ran three
> shape-only `SELECT`s (counts and booleans) against production. The orchestrator ran one
> catalogue read of `bp_readings`. **No application code has changed.** Health and lift data are
> described by shape only.
>
> **Status: waiting at GATE 2 for Scott.** Nothing is built until the decisions below are answered.
> The full specs (§S) and research maps (`REORIENTATION_RESEARCH_4b-10.md`) are the build briefs.

## Measured baseline (2026-11-13, `2cd7d9e`)

| Measure | Value |
|---|---|
| Tests | 132 files, 2,202 tests, all passing |
| Coverage (global) | lines 93.7 / functions 90.0 / branches 86.2 against floors 89 / 85 / 80 |
| Bundle | entry 146.9 / 150 KB; total 377.6 / 400 KB; squat entry 120.2 / 122 |

## Delivery plan

Build order: **5 → 4b → 6 → 7 → 8 → 9 → 10**, one PR each, each leaving `main` green.
5 goes first because it is a pure deletion and it removes the journal data still served in the
public `logs-*` chunk (the open item from 4a). 4b is independent of 5–10 but needs a production
DDL apply, so it waits for Scott's approval of the SQL. 9 and 10 both depend only on 8.

**G1 — branching.** This session may push only to `claude/pensive-einstein-43gyr1`. One PR per
slice needs one branch per slice. Recommendation: authorise `feature/slice-<n>-<slug>` branches,
each cut from fresh `origin/main` after its predecessor merges. Alternative: run the slices
serially on this one branch, restarting it from `main` after each merge. That is slower, because
every slice waits on a merge.

## Orchestrator reconciliations across the specs

- **One guard file, not three.** The slice 5 spec proposes `noProgramJournal.test.js`, the 6–8
  spec `noPrescriptionEngine.test.js`, and the 10 spec extends `noHealthLogs.test.js`. Use one
  instead: `src/__tests__/noCulledCode.test.js`, created in slice 5 on the `noHealthLogs` walker.
  Slices 6–10 each append a needle group commented with their issue number, and `noHealthLogs`
  stays as 4a left it.
- **`SRPE_SCALE` conflict.** D12 says it goes with the Program reference content; #422 lists it as
  Out. The slice 5 spec says D12 wins; the 9 spec keeps it as an orphan. My recommendation:
  **delete it in slice 9.** It has no reader after slice 5, and an orphan export contradicts
  acceptance 5.3. Decision 5-2 below.
- **Plan errors found by research:**
  - The "MobileRecovery deficit block" (D16) is the HRV tile, not nutrition.
  - `strengthTrend` has 8 series, not nine.
  - Slice 6 removes 7 per-file coverage keys, not 3, and about 139 tests, not about 90.
  - `computeReadiness` already lives in `recoveryAnalytics.js`.
  - `program.js` holds none of the Out-listed constants, so it really can be deleted whole.
  - **MobileStrength misreports today:** `PRIMARY_LIFTS` filters on "Back Squat", but the only
    live lift is "Barbell Squat".

## Decisions for Scott (★ = changes an approved criterion or scope line)

### Slice 4b (#417) — health records
1. **Schema → hybrid.** Keep `bp_readings` as live. Add one `lab_results` table (one row per marker
   per draw, `panel` ∈ lipid/hormone/other) and one typed `injuries` table. The alternatives are
   D8's typed per-panel tables (they bake one person's hormone panel into column names) and the
   issue's generic `health_markers` (injuries don't fit it). This departs from both D8 and
   `VISION.md`'s name; approve the name `lab_results` or pick another. Full DDL for all three
   options is in §S-4b.
2. `015_bp_readings` is idempotent and asserts the live shape. It changes no grants. The
   `liveOnly` manifest row stays, with its note updated.
3. ★ **Revoke `anon` on all three health tables** (in 016). This changes production for
   `bp_readings`. Acceptance 2's anon proof becomes "permission denied" rather than "zero rows".
4. **Reference ranges.** Ranges printed by the lab go in the DB (`ref_low`/`ref_high`) behind a
   CHECK that a range must carry `ref_source`. `LIPID_REF` stays in code, unchanged.
5. **Health tables bypass the Workbox `supabase-api` cache** (a `NetworkOnly` route), so health
   responses never sit on the device. Cost: no offline view across a reload for those cards.
6. **`bpCategory`: park it.** The BP card shows raw values with no category. File the
   classification bug (`||` and a missing source) as its own issue.
7. ★ **"Offline serves cached data"** means data fetched earlier in the session stays on screen
   through a failed refetch. No persister is added.
8. **The RLS proof inserts a probe row per table inside a rolled-back transaction in production**
   (owner sees ≥1, a second user sees 0). This needs your OK. Apply order: PR lands both
   migrations as `pending`; you approve; `apply_migration` runs 015 then 016; read-back; the
   manifest flips to `applied` in the same PR before merge.

### Slice 5 (#418) — Program and Journal tabs
1. Leave the `schedule.js` orphans (`PHASES`, `SEASON`, `SEASON_2`, `VOLUME_PROGRESSION`) for
   slices 7 and 8.
2. ★ Leave `trainingConfig.js` untouched (acceptance 6). **`SRPE_SCALE` is deleted in slice 9**
   (see the reconciliation above), so #422's Out line changes.
3. Delete `constants/nutrition.js` whole now. All that would remain is an orphan
   `NUTRITION_TARGETS` and an unused import.
4. Close #77 (split ProgramView) as not planned.

### Slices 6–8 (#419–#421) — benchmarks, Calendar, Overview
1. ★ **Remove Overview's "today strip" in slice 7, not 8.** It imports five roster functions that
   slice 7 deletes. Slice 7 adds a small readiness card in its place. This changes #420's
   "Out: Overview".
2. ★ **Calendar data comes from the existing `useSessionLog`** (pass `plannedSessions` and
   `dbStatus`), not react-query, because `useSessions`' `.limit(50)` would drop history. Reword
   the "offline → query cache" edge case to "rows already loaded stay visible; a first-load
   failure shows an error, never an empty calendar".
3. ★ **`logEntriesForDate` moves to `utils/dateFormat.js`**, where it de-duplicates
   `localLogDate`. `utils/schedule.js` is deleted whole in slice 7, and acceptance 7.1 then points
   at the rewritten `dayStrip` test.
4. **Keep the MobileRecovery HRV tile.** D16 misnamed it.
5. Overview renders `anchors.current_phase` (· `current_block`) as a pill only when it is set,
   like MobileToday.
6. Make `TSB_COPY` descriptive, not prescriptive. "Protect Thursday rest" and "ready for hard
   sessions" go.
7. Past-dated planned rows show "PLANNED", never "missed".
8. The Calendar window stays 3 days back, 14 forward.

### Slice 9 (#422) — personal calibration
1. **The HR130 barometer has no live source.** Replace it with an "aerobic efficiency" trend
   (`avg_watts / avg_hr` per session, least-squares slope, no verdict prose); the alternative is
   to delete it with `stats.js`.
2. Delete `HR130_PROJECTION` with no replacement.
3. Delete the MODEL CALIBRATION STATUS panel; every row in it is a personal figure. The CP card
   stays as the live CP surface.
4. Delete the `POWER_DURATION` table, the W′ card and the NORTH STAR card. `FTP_TEST` stays.
5. One constant, `MIN_TREND_POINTS = 3`, gates both trend charts with an "insufficient data" line.
6. The "HR130 POWER" tile becomes "W / BPM".
7. ErgLiveView's sRPE buttons take their labels from the shared `SRPE_GUIDE` bands. The visible
   label text changes.
8. `derivePaceZones(205)` byte-identity is pinned by a test committed **before** the change.
   Recovery keeps `#666` and its allowlist entry, because a THEME token would change the output.
9. Add a per-file coverage key for ErgView at its measured baseline (91 / 88 / 75), so acceptance 5
   becomes a CI gate.

### Slice 10 (#423) — mobility and strength
1. ★ **MobileStrength is in scope:** drop the `PRIMARY_LIFTS` filter, which causes the live
   misreport, and add an error state.
2. StrengthView's trend comes from a new `useLiftHistory` hook (`strength_workouts` embedding
   `strength_sets`, Epley e1RM per lift per workout). It distinguishes "no sets" from "sets
   exist, none scoreable", which is the live state today.
3. One accent colour for every lift; `LIFT_COLOR`, keyed on personal lift names, goes.
4. D19: before the deletion commit I export the 8 series to a scratch file outside git; **you
   keep it or say "discard"**. The PR records only the decision, the date, the count and a hash.
5. The mobility copy rule: no injury or rehab reference, no named injured side, no roster slot.
   Movement laterality and generic safety copy stay.

---

## §S — Full specs (Workflow Architect, verbatim)

### §S-4b

#### Stage 3 spec: slice 4b (#417), health records in the database

READ-ONLY. No files were written and nothing in the DB was queried. Health data is described by shape only.

**How claims were checked**
- Library claims were checked with Context7: `/tanstack/query` and `/vitest-dev/vitest/v5.0.3`.
- Repo claims were checked against `main` working-tree files.
- Anything not verified is marked **[assumed]**.

---

#### A. Decisions for Scott at Gate 2 (each with my recommendation)

1. **Schema shape → hybrid (Option C).** Three tables:
   - `bp_readings` (live, captured as it is).
   - One `lab_results` table: one row per marker per blood draw, with `panel` set to `lipid | hormone | other`.
   - One typed `injuries` table.

   Why this split:
   - A lab panel really is a set of `(marker, value, unit)` rows from one draw. A typed `hormone_panels` table would bake one person's panel into column names. That is the personal-prescription smell 4a removed when it deleted `HORMONE_REF`, and every new marker would need its own migration.
   - Injury history has no numeric value, so it does not fit the generic shape.
   - This honours D8 where the shape is fixed (BP, injury) and avoids D8 where it is not (lab panels).
   - The name departs from both D8 and `VISION.md:126` (`health_markers`). Scott should approve the name `lab_results`. The alternative name is `blood_markers`.
2. **`015_bp_readings` captures the table exactly as it is, and changes no grants.** Hardening is a separate statement in 016, so the capture stays faithful (the epic says "exactly as it is").
3. **Revoke `anon` on all three tables, in 016: recommend yes.** This changes production for `bp_readings`.
   - Today anon is blocked by RLS alone, because the only policy is `TO authenticated`.
   - The revoke adds defence in depth at no cost, since no anonymous path reads health data. `/squat` never imports the client.
   - **Side effect on acceptance 2:** anon then gets `permission denied` (42501) rather than "zero rows". That is stronger, but it is not the literal wording of the criterion. Scott should accept the reworded proof.
   - Keep full DML for `authenticated`, behind the owner policy, so the future entry forms (D10) need no grant migration.
4. **Reference ranges → lab-printed ranges in the DB, with a mandatory source.**
   - `lab_results` gets `ref_low`, `ref_high` and `ref_source`, plus a CHECK that a range cannot exist without a source.
   - App-doctrine limits stay in code (`LIPID_REF`, already sourced and covered by the Vitest). No hormone reference constant comes back.
   - Acceptance 5 is met in two layers: a Vitest over the code table, and the CHECK read back from `pg_constraint` for the DB rows. A Vitest cannot assert over production rows. The DB constraint is the honest equivalent, and the hook test pins that a returned `ref_source` is rendered.
   - Alternative: no range columns in v1. That is simpler, but the hormone card would then show values with no context at all.
5. **Health tables bypass the Workbox `supabase-api` cache: recommend yes.**
   - Add a `NetworkOnly` route for `/rest/v1/(bp_readings|lab_results|injuries)` ahead of the generic rule in `web/vite.config.js`.
   - Today any REST response sits in Cache Storage on the device for up to 5 minutes. Nothing clears that cache on sign-out (grep for `caches.` in `src` found nothing).
   - Cost: offline across a full reload shows "offline" for these cards rather than stale rows. Acceptance 3 is about react-query, which this does not affect.
6. **`bpCategory` → park it, do not render a category in 4b.**
   - The BP card shows raw sys/dia/pulse values with no classification.
   - The function stays unused, and its tests are kept untouched (acceptance 6).
   - The `||` → `&&` fix is not enough on its own. **[assumed, not verified]** The Heart Foundation 2016 categories are "and/or", i.e. the worse of the systolic and diastolic categories. On that rule (125,82) should be Normal, but the code says High-normal.
   - A correct fix needs that source read and a new test table. Track it as its own issue (labelled `bug`), referenced in the PR.
7. **Local date and time rendering.**
   - Date: reuse `toLogDate(new Date(measured_at))` from `utils/dateFormat.js`, which reads local fields.
   - Time: **move** the private `clockTime(ms)` from `utils/stravaStatus.js:64-67` into `utils/dateFormat.js` as an export, and make `stravaStatus.js` import it. This relocates an existing helper rather than adding a date-format variant.
   - `date`-typed columns (`collected_on`, `onset_on`) go through `toLogDate(isoString)`. That is string-parsed, so there is no timezone shift. Never use `new Date('YYYY-MM-DD')`, which parses as UTC.
8. **Apply order (Scott approves each step):**
   1. The PR lands both migrations as `pending`.
   2. Scott approves, then `apply_migration` runs `015_bp_readings` and then `016_health_records`.
   3. Read-back (§F).
   4. Flip both entries to `applied` **in the same PR, before merge**. This avoids recreating #429 drift; it is slice 3's B1 rule.

---

#### B. Capturing `bp_readings`: file and manifest mechanics (from reading `check-migrations.mjs` in full)

**Why the existing live row cannot simply be claimed:**
- R18 (`:283-296`): an `applied` entry numbered 014 or higher must carry a live name equal to its file stem, or starting with `stem_`. The live row is named `bp_readings`; the stem is `015_bp_readings`. So 015 **cannot** claim version `20261106035559`.
- R19: `mirror` is banned for 014 and later.
- `unapplied` would escape drift detection, which is the same reason `mirror` is banned.

**So:**
- Make `015_bp_readings.sql` **idempotent** and apply it for real under the name `015_bp_readings`. On production it changes nothing structurally and records a new version.
- The `liveOnly` entry `20261106035559 / bp_readings` **stays**. It is still a live row, and removing it would raise `live-unaccounted`. Change only its `note` to: `"Created before tracking; structure captured by 015_bp_readings.sql. Backup coverage gap tracked in #428"`. Keep `issue: 428`.
- Leave the fixture `web/scripts/__tests__/fixtures/live-migrations-2026-11-09.json` untouched; it is a dated snapshot.

**Manifest entries:**
- On landing:
  - `{"file":"015_bp_readings.sql","status":"pending","issue":417}`
  - `{"file":"016_health_records.sql","status":"pending","issue":417}`
- After the apply:
  - `{"file":"015_bp_readings.sql","status":"applied","live":[{"version":"<v>","name":"015_bp_readings"}],"issue":417}`
  - The same shape for 016.

**Pre-build step for the orchestrator (read-only):**
- Read `select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid='public.bp_readings'::regclass`.
- Write the **actual** constraint names into 015. The names below are Postgres defaults **[assumed]**.

**Shape guard:** `CREATE TABLE IF NOT EXISTS` silently skips a table whose live shape has drifted. 015 therefore asserts the live shape and raises on mismatch, which turns "capture" into "verified capture".

### `015_bp_readings.sql`
```sql
-- 015_bp_readings.sql
-- Captures public.bp_readings, created live on 2026-11-06 (version 20261106035559,
-- liveOnly in manifest.json) with no file. Idempotent: on production this is a
-- verified no-op; on a fresh database it creates the table exactly as live.
-- Grants are NOT changed here (hardening, if approved, is in 016).
-- APPLY: Scott approves; apply_migration name exactly `015_bp_readings`.

create table if not exists public.bp_readings (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  measured_at timestamptz not null,
  sys_mmhg    smallint not null check (sys_mmhg between 60 and 260),
  dia_mmhg    smallint not null check (dia_mmhg between 30 and 160),
  pulse_bpm   smallint check (pulse_bpm between 30 and 220),
  context     text,
  clean       boolean not null default false,
  source      text not null default 'manual',
  created_at  timestamptz not null default now(),
  unique (user_id, measured_at)
);

alter table public.bp_readings enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies
                 where schemaname='public' and tablename='bp_readings'
                   and policyname='bp_readings_owner') then
    create policy bp_readings_owner on public.bp_readings
      for all to authenticated
      using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
  if (select count(*) from information_schema.columns
      where table_schema='public' and table_name='bp_readings') <> 10 then
    raise exception '015: live bp_readings has drifted from the captured shape';
  end if;
end $$;
```
The live CHECK bounds (60..260, 30..160, 30..220) are what the read-back reported. Postgres renders `between` as `>= AND <=`, and the orchestrator compares the two with `pg_get_constraintdef`.

### `015_bp_readings_rollback.sql`: a documented no-op
```sql
-- Rollback for 015_bp_readings.sql. NOT auto-applied.
-- DELIBERATELY A NO-OP. 015 created nothing in production: the table predates it
-- (20261106035559). Dropping it would destroy health rows (D9 re-entered BP via
-- MCP) that 015 never created. Removing bp_readings is its own destructive
-- decision for Scott; if ever taken, export first:
--   select * from public.bp_readings order by measured_at;
--   -- then: drop table public.bp_readings;
select 1;
```

---

#### C. Schema options: full DDL

### Option C (RECOMMENDED): `016_health_records.sql`
```sql
-- 016_health_records.sql
-- Additive + reversible (016_health_records_rollback.sql). Slice 4b (#417).
-- lab_results: one row per marker per draw (lipid + hormone panels share it).
-- injuries: typed injury history. Both owner-only RLS, one FOR ALL policy,
-- shape of 006 (anchors/coach_log). App reads only in v1 (D10); writes via MCP.
-- APPLY: Scott approves; apply_migration name exactly `016_health_records`.

create table if not exists public.lab_results (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  collected_on    date not null,
  panel           text not null check (panel in ('lipid','hormone','other')),
  marker          text not null check (length(trim(marker)) > 0),
  value           numeric not null,
  value_qualifier text check (value_qualifier in ('<','>')),
  unit            text not null,
  ref_low         numeric,
  ref_high        numeric,
  ref_source      text,
  note            text,
  source          text not null default 'manual',
  created_at      timestamptz not null default now(),
  unique (user_id, collected_on, panel, marker),
  constraint lab_results_ref_needs_source check
    ((ref_low is null and ref_high is null) or length(trim(coalesce(ref_source,''))) > 0),
  constraint lab_results_ref_order check
    (ref_low is null or ref_high is null or ref_low <= ref_high)
);
alter table public.lab_results enable row level security;
drop policy if exists lab_results_owner on public.lab_results;
create policy lab_results_owner on public.lab_results
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.injuries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  region      text not null check (length(trim(region)) > 0),
  side        text check (side in ('left','right','bilateral')),
  onset_on    date,
  resolved_on date,
  status      text not null default 'active' check (status in ('active','monitoring','resolved')),
  note        text,
  source      text not null default 'manual',
  created_at  timestamptz not null default now(),
  constraint injuries_dates check (resolved_on is null or onset_on is null or resolved_on >= onset_on)
);
alter table public.injuries enable row level security;
drop policy if exists injuries_owner on public.injuries;
create policy injuries_owner on public.injuries
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Decision 3 (only if Scott approves): no anonymous path reads health data.
revoke all on public.lab_results, public.injuries, public.bp_readings from anon;
```

### `016_health_records_rollback.sql`
```sql
-- Rollback for 016_health_records.sql. NOT auto-applied.
-- DESTRUCTIVE: DROPS lab_results AND injuries WITH EVERY ROW. Nothing restores
-- them — public.backup_snapshot() does not cover health tables (#428). Export
-- first and keep the output outside git:
--   select * from public.lab_results order by collected_on, panel, marker;
--   select * from public.injuries order by onset_on nulls last;
-- Roll back the app code that reads them first (the hooks would otherwise error
-- into Sentry). bp_readings is NOT dropped (015 owns it); only its anon grant is
-- restored to the Supabase default it had before 016.
grant all on public.bp_readings to anon;
drop table if exists public.injuries;
drop table if exists public.lab_results;
```

### Option A: typed per marker class (D8 as written). Not recommended.
```sql
create table if not exists public.lipid_panels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  collected_on date not null,
  total_chol_mmol numeric(4,2), ldl_mmol numeric(4,2), hdl_mmol numeric(4,2), trig_mmol numeric(4,2),
  fasting boolean, note text, source text not null default 'manual',
  created_at timestamptz not null default now(), unique (user_id, collected_on));
create table if not exists public.hormone_panels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  collected_on date not null,
  testosterone_total_nmol numeric, testosterone_free_pmol numeric, shbg_nmol numeric,
  lh_iu numeric, fsh_iu numeric, oestradiol_pmol numeric,
  note text, source text not null default 'manual',
  created_at timestamptz not null default now(), unique (user_id, collected_on));
-- + public.injuries exactly as Option C
-- + per table: enable RLS; <t>_owner FOR ALL TO authenticated USING/WITH CHECK (user_id = auth.uid());
-- Rollback: drop table if exists public.injuries, public.hormone_panels, public.lipid_panels;  (DESTRUCTIVE header as above)
```
Cost of Option A:
- The hormone column list is one person's panel.
- Adding a marker needs a migration.
- There is nowhere to put a lab's reference range without six more column pairs.

### Option B: one generic `health_markers` (issue text). Not recommended.
```sql
create table if not exists public.health_markers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date date not null, marker text not null, value numeric, unit text,
  ref_low numeric, ref_high numeric, note text,
  created_at timestamptz not null default now(), unique (user_id, date, marker));
alter table public.health_markers enable row level security;
create policy health_markers_owner on public.health_markers for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
-- Rollback: drop table if exists public.health_markers;  (DESTRUCTIVE header)
```
Cost of Option B:
- Injuries become `marker='injury', value null`, with region, side and status buried in `note`.
- Nothing distinguishes a lipid row from a hormone row.
- The ranges carry no source.

---

#### D. Code changes

**Architecture layers**

| Layer | File | Change |
|---|---|---|
| hooks | `web/src/hooks/useBpReadings.js` | new |
| hooks | `web/src/hooks/useLabResults.js` | new |
| hooks | `web/src/hooks/useInjuries.js` | new |
| utils | `web/src/utils/dateFormat.js` | export `clockTime(ms)`, moved verbatim |
| utils | `web/src/utils/stravaStatus.js` | import `clockTime`; delete the private copy |
| utils | `web/src/utils/healthRecords.js` | new, pure. `groupLabDraws(rows, panel)` returns `[{collectedOn, markers:[…]}]`, newest draw first, markers sorted by name. `formatLabValue(row)` returns `"<0.5 nmol/L"` and handles the qualifier. |
| components | `web/src/components/HealthRecordCard.jsx` | new. Card shell and state machine; no Supabase. |
| views | `web/src/views/RecoveryView.jsx` | restructure (see below) |
| config | `web/vite.config.js` | per-file coverage keys; health `NetworkOnly` route (decision 5) |
| migrations | `supabase/migrations/015_*`, `016_*` (+ rollbacks), `manifest.json` | as in §B and §C |

**Hook contract.** All three hooks follow the `useAnchors` shape:
- `useQuery`, `queryFn` does `if (error) throw error`, and the hook returns `{...query, rows}` with `rows = query.data ?? []`.
- No `user_id` filter; RLS scopes the rows.
- `staleTime: 5 * 60_000`. The data is written out of band and rarely. Reversible call.
- Ordering and limits follow repo precedent (`useVitals.js:24`), not a fresh Context7 lookup.

| Hook | queryKey | select | order / limit |
|---|---|---|---|
| `useBpReadings` | `['bp_readings']` | `id, measured_at, sys_mmhg, dia_mmhg, pulse_bpm, context, clean` | `.order('measured_at',{ascending:false}).limit(30)` |
| `useLabResults` | `['lab_results']` | `id, collected_on, panel, marker, value, value_qualifier, unit, ref_low, ref_high, ref_source, note` | `.order('collected_on',{ascending:false}).limit(200)` |
| `useInjuries` | `['injuries']` | `id, region, side, onset_on, resolved_on, status, note` | `.order('onset_on',{ascending:false, nullsFirst:false}).limit(50)` |

- Numeric columns are cast with `Number()` in the hook, as in `useVitals`. PostgREST returns `numeric` as string or number **[assumed; the hook casts either way]**.
- One `useLabResults` query feeds both the lipid card and the hormone card, through `groupLabDraws(rows,'lipid')` and `groupLabDraws(rows,'hormone')`.

**Error path.** `throw` → `QueryCache({onError: handleQueryError})` (`main.jsx:42-57`) → `captureError(error, {source:'react-query', kind:'query', queryKey})`. No direct Sentry call is added.

**`HealthRecordCard` props**
- `title: string`
- `accent: string` (a THEME token)
- `query: {isPending, isError, isPaused, data}` (the hook result)
- `isEmpty: boolean`
- `emptyText: string`
- `children: node` (the rows)

The card picks exactly one state, in this order:
1. `isPending && isPaused` → "Offline: no saved data yet." Per the Context7 network-mode guide, a first mount offline stays `pending` with `fetchStatus:'paused'` indefinitely, so "Loading…" there would never resolve.
2. `isPending` → "Loading…"
3. `isError && data === undefined` → "Couldn't load {title}." (`role="alert"`)
4. `isEmpty` → the existing empty text.
5. Otherwise → `children`, plus a muted "Couldn't refresh, showing earlier data." line when `isError`.

The card uses the existing local `EmptyPanel` style; move `EmptyPanel` into the component file. Inline styles, THEME only.

**`RecoveryView` restructure**
- Split the render into `{vitalsSection}{healthSections}`. `vitalsSection` is the current IIFE minus lines `:350-482`, and keeps its `if (!today)` loading/unavailable gate.
- `healthSections` always renders four `HealthRecordCard`s:
  - **BP:** rows show `toLogDate(d) clockTime(d)`, `sys/dia mmHg`, `pulse bpm`, the `context` text and `clean` as a muted marker. No category (decision 6).
  - **Lipid:** the latest draw's markers, then the unchanged `LIPID_REF` limits and the source link. The limits render even when the card is empty, as they do today.
  - **Hormone:** the latest draw's markers. Show `ref_low–ref_high` plus `ref_source` only when present.
  - **Injury:** active and monitoring entries first, then resolved.
- The header comment is updated: health cards now read the DB.

---

#### E. Acceptance criteria → tests

| # | Criterion | Test or evidence |
|---|---|---|
| 1 | `bp_readings` read-back matches | §F queries 1–2, diffed against 015 by the orchestrator. Recorded in the PR body. |
| 2 | RLS, policies, zero rows | §F queries 3–6. Recorded in the PR body. |
| 3a | loading / error / empty / paused render | `components/__tests__/HealthRecordCard.test.jsx`: one test per state. Also an `it.each` in `RecoveryView.test.jsx` over the four cards × {pending, error, empty, data}. |
| 3b | errors reach `captureError` | `hooks/__tests__/useBpReadings.test.js`: the wrapper's `QueryClient` uses `new QueryCache({onError: handleQueryError})` and `vi.mock('../../utils/sentry.js')`. The mocked chain resolves `{error}`; assert `captureError` was called with `{source:'react-query', kind:'query', queryKey:['bp_readings']}`. Mirror this once for the lab and injuries hooks. |
| 3c | offline serves cached data | **Definition: rows fetched earlier in this session stay on screen while the app is offline or a refetch fails. Nothing is persisted across a reload; no persister is added.** Hook test: resolve rows, then make the mock reject, then `await result.current.refetch()`. Assert `isError === true` and `data` is still the first rows; the query-core reducer keeps `...state` on error (Context7, `query.ts`). Second test: `onlineManager.setOnline(false)` (imported from `@tanstack/react-query`) before mount, assert `isPending && fetchStatus === 'paused'`; reset with `setOnline(true)` in `afterEach`. Card test: an error with data present renders the rows plus the "showing earlier data" line. |
| 4 | local time near midnight | `RecoveryView.test.jsx` follows the precedent in `dateFormat.test.js:86-93` and `eventWindow.test.js:203-210`: `globalThis.process.env.TZ = 'Australia/Perth'`, `afterEach` deletes it. A row with `measured_at: '2026-08-20T16:30:00Z'` must render `8/21/26 00:30`, and the test asserts the UTC date `2026-08-20` is absent. Also a `clockTime` unit test in `dateFormat.test.js`. This works because the default Vitest pool is `forks`: the Vitest 5.0.3 docs say TZ set in a test has no effect only in the `threads` and `vmThreads` pools. The repo sets no `pool` (grep), and the two precedent TZ tests pass in CI. |
| 5 | every range sourced | `logs.test.js` is unchanged (`LIPID_REF`). `healthRecords.test.js` checks that `groupLabDraws` keeps `ref_source` with its range. The DB side is the `lab_results_ref_needs_source` CHECK, read back in §F query 2. |
| 6 | `bpCategory` tests kept | `formatting.test.js:156-210` untouched. Global coverage thresholds are not lowered. |

**Mocks to add**
- `RecoveryView.test.jsx`:
  - `vi.mock` for `useBpReadings`, `useLabResults` and `useInjuries`, each defaulting to `{rows:[], data:[], isPending:false, isError:false, isPaused:false}`.
  - Change the "unavailable" test so it also asserts that the four health cards **do** render when there are no vitals.
- `App.test.jsx`: no change; it already stubs `RecoveryView`.

**Coverage keys** in `web/vite.config.js`, at `{lines:80, functions:80, branches:70}`:
- `src/hooks/useBpReadings.js`
- `src/hooks/useLabResults.js`
- `src/hooks/useInjuries.js`
- `src/utils/healthRecords.js`
- `src/components/HealthRecordCard.jsx`

---

#### F. Read-back SQL (orchestrator, after the apply)

Read-only, except query 6, which writes inside a transaction that rolls back. That needs Scott's OK because it touches production.

```sql
-- 1 structure
select table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns where table_schema='public'
  and table_name in ('bp_readings','lab_results','injuries')
order by table_name, ordinal_position;
-- 2 constraints (incl. lab_results_ref_needs_source)
select conrelid::regclass, conname, pg_get_constraintdef(oid) from pg_constraint
where conrelid in ('public.bp_readings'::regclass,'public.lab_results'::regclass,'public.injuries'::regclass)
order by 1,2;
-- 3 RLS flags
select relname, relrowsecurity, relforcerowsecurity from pg_class
where oid in ('public.bp_readings'::regclass,'public.lab_results'::regclass,'public.injuries'::regclass);
-- 4 policies: expect exactly one per table, cmd ALL, roles {authenticated}, qual = with_check
select tablename, policyname, cmd, roles, qual, with_check from pg_policies
where schemaname='public' and tablename in ('bp_readings','lab_results','injuries');
-- 5 grants (anon absent if decision 3)
select table_name, grantee, string_agg(privilege_type, ',' order by privilege_type)
from information_schema.role_table_grants where table_schema='public'
  and table_name in ('bp_readings','lab_results','injuries') group by 1,2 order by 1,2;
-- 6 isolation with a positive control (tables are empty, so a bare zero proves nothing)
begin;
insert into public.lab_results (user_id, collected_on, panel, marker, value, unit)
  values ('<scott_uuid>', '2000-01-01', 'other', 'rls_probe', 0, 'x');
insert into public.injuries (user_id, region) values ('<scott_uuid>', 'rls_probe');
insert into public.bp_readings (user_id, measured_at, sys_mmhg, dia_mmhg)
  values ('<scott_uuid>', '2000-01-01T00:00:00Z', 120, 80);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"<scott_uuid>","role":"authenticated"}', true);
select 'owner' who, (select count(*) from public.bp_readings) bp,
       (select count(*) from public.lab_results) lab, (select count(*) from public.injuries) inj;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select 'other_user' who, (select count(*) from public.bp_readings) bp,
       (select count(*) from public.lab_results) lab, (select count(*) from public.injuries) inj;
rollback;
-- anon, separately (expect 42501 permission denied per table if revoked; 0 rows if not)
begin; set local role anon; select count(*) from public.bp_readings; rollback;
```
**Expected results:**
- The owner sees ≥1 row in each table, which is the probe row plus any real rows.
- The other user sees 0 in each table.
- Anon is denied, or sees 0.

**[assumed]** `execute_sql` accepts an explicit `begin … rollback` in one call. If it does not, wrap the inserts and role switches in a `do` block that ends with `raise exception` to force the rollback, and read the counts from `raise notice`. After running it, confirm that no `rls_probe` rows remain.

---

#### G. Out of scope (parked)

- Entry forms (D10).
- Readiness, RHR and sleep sections.
- `MobileRecovery.jsx`, which shows vitals only.
- Health-table backup coverage (#428): flag it in the PR, because 016's rollback cannot restore data.
- The `bpCategory` fix (decision 6).
- A react-query persister.
- `vitals_nutrition_intake` (live-only).
- The `VISION.md:126` wording (slice 11, #424). Note in the PR that D8 and this spec supersede it.

#### H. Risks the build stage must honour

- The real `bp_readings` constraint names must be read before 015 is written (§B).
- **[assumed]** `apply_migration` runs in one transaction, so 015's guard rolls back cleanly.
- The anon revoke changes the wording of acceptance 2 (decision 3).
- **[assumed]** Workbox expiry is enforced lazily, so entries can outlive 300 s on disk. Decision 5 removes the question for health tables.
- With the gate lifted, the four cards now fetch on every Recovery visit even when vitals are down. That is intended.

**Files read:**
- `/home/user/erg-dashboard/web/scripts/check-migrations.mjs` (full)
- `/home/user/erg-dashboard/supabase/migrations/manifest.json`
- `/home/user/erg-dashboard/supabase/migrations/012_strava_integration.sql`, `013_drop_coach_messages_rollback.sql`, `014_revoke_default_function_execute.sql`
- `/home/user/erg-dashboard/web/src/views/RecoveryView.jsx`
- `/home/user/erg-dashboard/web/src/views/__tests__/RecoveryView.test.jsx`
- `/home/user/erg-dashboard/web/src/hooks/useAnchors.js` and its test
- `/home/user/erg-dashboard/web/src/utils/formatting.js`, `dateFormat.js`, `stravaStatus.js`
- `/home/user/erg-dashboard/web/src/utils/__tests__/dateFormat.test.js`, `eventWindow.test.js`
- `/home/user/erg-dashboard/web/src/constants/logs.js`
- `/home/user/erg-dashboard/web/src/main.jsx`
- `/home/user/erg-dashboard/web/vite.config.js`
- `/home/user/erg-dashboard/VISION.md`
- `/home/user/erg-dashboard/coach/REORIENTATION_EPIC_2026-11-06.md`
- `/home/user/erg-dashboard/coach/REORIENTATION_SLICE_SPECS.md`
- The two scratchpad inputs.

**Research correction:** Stage 1 said no existing test pins TZ. Two do: `dateFormat.test.js:86-93` and `eventWindow.test.js:203-210`. They are the precedent used for acceptance 4.

### §S-5

#### Slice 5 (#418) spec: delete the Program and Journal tabs

Read-only stage. I wrote nothing and the tree is clean. Checked against `main` at `2cd7d9e`. Paths below are relative to `/home/user/erg-dashboard/web/` unless they start with `.github/` or `coach/`.

#### Decisions for Scott (each with my recommendation)

1. **`PHASES`, `SEASON`, `SEASON_2`, `VOLUME_PROGRESSION` in `constants/schedule.js`: leave them.**
   - Slice 7 already names `SEASON`, `SEASON_2` and `VOLUME_PROGRESSION` in its In list. Slice 8 deletes "the remainder of `constants/schedule.js`", which covers `PHASES`.
   - Slice 4a set the precedent: it removed the importers and left the definitions to the slice that owns them.
   - These are side-effect-free object literals, so Rollup should drop them from `dist` once nothing imports them. That is an expectation; the bundle proof below checks it.
   - Acceptance 3 is about exports this slice deletes, so leaving them does not break it. List them in the PR body as orphans handed on to slices 7 and 8.
2. **`EST_MHR` and `SRPE_SCALE` in `trainingConfig.js`: leave them. Acceptance 6 rules out touching the file.**
   - Slice 9 already deletes `EST_MHR`.
   - `SRPE_SCALE` is a conflict in the epic itself. D12 says it goes with the Program reference content, but slice 9 (#422) lists it as Out.
   - Recommendation: D12 wins. Move `SRPE_SCALE` into slice 9's In list and fix #422's Out line.
   - `HR_ZONES` loses its only outside importer but stays in use inside the file (`derivePaceZones`, `:308`). It is already on slice 9's list.
3. **`NUTRITION_TARGETS`: delete `constants/nutrition.js` whole.**
   - Once the issue's eight exports go, the file holds one export with zero importers. Its `import { THEME }` becomes unused, because only `FUELLING` uses it (`:127-139`). `no-unused-vars` would then warn, and acceptance 3 requires a clean lint, so the file has to be edited either way.
   - Slice 8 deletes this file anyway.
   - The alternative is to keep `NUTRITION_TARGETS` and drop the `THEME` import. That is a bigger diff with no reader at the end of it.
4. **`TECHNOGYM_CONVERSION`: no decision needed.** It lives in `program.js`, which is deleted whole.
5. **Close #77 ("split ProgramView") as not planned when this merges.** The file it splits no longer exists. It is the same kind of close as #177.

#### Research corrections

- **The `#666` question resolves itself.** `ProgramView.jsx:500` has no `#666`; the literal is in `views/program/ProgramYear.jsx`, at `:212` and `:500`. The `ProgramYear.jsx` allowlist entry covers both, since the allowlist works per file and per hex. Both go with the file, so there is nothing to decide.
- **`logs.js`: delete lines 2–275.** That is everything between `import { THEME }` (`:1`) and the `// ── LIPID PANEL DECISION LIMITS` comment (`:276`). `THEME` stays because `LIPID_REF` uses it (`:290-318`).

#### Edits, file by file

**Delete (8 source/test files + 2 PNGs):**
- `src/views/ProgramView.jsx`
- `src/views/program/ProgramMicrocycle.jsx`
- `src/views/program/ProgramYear.jsx`
- `src/views/JournalView.jsx`
- `src/views/__tests__/ProgramView.test.jsx`
- `src/views/__tests__/JournalView.test.jsx`
- `src/views/program/__tests__/ProgramMicrocycle.test.jsx`
- `src/views/program/__tests__/ProgramYear.test.jsx`. This file holds the only literal pin `EVENT_LADDER.toHaveLength(9)`. The other suites compare against `EVENT_LADDER.length`. Do not move the pin anywhere; slice 6 deletes the ladder.
- `src/constants/program.js` (whole file)
- `src/constants/nutrition.js` (whole file, per decision 3)
- `e2e/visual.spec.js-snapshots/desktop-program-visual-linux.png`
- `e2e/visual.spec.js-snapshots/desktop-journal-visual-linux.png`

**`src/constants/exercises.js`:**
- Delete `REP_SCHEMES` (`:2-28`), `LOWER_DIFFERENTIATION` (`:29-43`) and `STRENGTH_PRINCIPLES` (`:117`–end).
- Keep `STRENGTH_TEMPLATES` (`:44`) and `PREHAB_NOTE` (`:114`). `THEME` is still used 5 times inside `:44-116`, so the import stays.

**`src/constants/logs.js`:** delete `:2-275`: `DECISION_LOG`, `HYPOTHESES`, `RULE_FIRING_HISTORY`, `CONFIDENCE_MIGRATION` and their banner comments.

**`scripts/check-colour-literals.mjs`:** delete the `'web/src/views/program/ProgramYear.jsx'` entry (`:80-83`). The script fails on an allowlist entry whose file no longer exists.

**`src/App.jsx`:**
- `:15-18`: rewrite the comment so it no longer names ProgramView: "…and three of them are among the heaviest files in the repo (StrengthLogger ~1,682, OverviewView ~1,423, ErgView ~1,271)…".
- `:23`: delete the `JournalView` lazy import. `:28`: delete the `ProgramView` lazy import.
- `:45-46`: in the MAP comment, drop `program ·` and `· journal`.
- `:195`: delete `const [expanded, setExpanded] = useState(null);`. `useState` is still used by `view` and `nowTick`.
- `:352` and `:361`: delete the `['program','Program']` and `['journal','Journal']` tuples, which leaves 11.
- `:366-369`: change the handler to `onClick={() => setView(v)}`.
- `:433-436`: delete the PROGRAM VIEW comment and its branch. `:486-487`: delete the JOURNAL VIEW comment and its branch.
- Leave the stale banners at `:40` and `:137`. Their owners are slices 7 and 8.

**`src/__tests__/App.test.jsx`:**
- `:116-122`: delete the `JournalView` mock. Move the throw-on-demand into the `SettingsView` mock (`:109-111`), with the flag renamed `settingsThrows` and the message `'settings blew up'`. I chose Settings because it is the only stub tab no epic slice rewrites or culls.
- `:161-163`: delete the `ProgramView` mock.
- `:204`: in `beforeEach`, reset `settingsThrows = false`.
- `:218` and `:227`: delete the PROGRAM and JOURNAL rows from `NAV`.
- `:240-245`: change the comment to "Eleven tabs: Coach retired in #414, Program and Journal in #418." Set both `toHaveLength(13)` assertions to `toHaveLength(11)`. Add `queryByRole('button', { name: 'PROGRAM' })` and `{ name: 'JOURNAL' }` → `toBeNull()`, as slice 2 did for COACH.
- `:345-354`: set `settingsThrows = true`, click `SETTINGS`, and expect `error.message` to be `'settings blew up'`.

**`e2e/smoke.spec.js`:** delete `'program'` (`:18`) and `'journal'` (`:27`) from `TABS`, leaving 11.

**`e2e/visual.spec.js`:** delete `test('program')` (`:134-139`) and `test('journal')` (`:141-146`). The measurement comments at `:93-96` and `e2e/fixtures.js:74` describe a PROGRAM-tab switch timing. They are a historical record and match no guard needle, so I'd leave them and note them as parked.

**New guard, `src/__tests__/noProgramJournal.test.js`.** This is the one guard I recommend; do not also extend `constants/__tests__/logs.test.js`. That test only inspects the keys of `logs.js`, so it cannot pin the views or the `exercises`/`nutrition`/`program` exports.
- Clone `noHealthLogs.test.js` exactly: walk `src/` and `e2e/`, same file extensions, needles built by concatenation, case-sensitive, `\b`-bounded. Keep its three tests: both roots scanned, the pattern self-check, and an offenders list that must equal `[]`.
- Needles:
  - The four view names: `ProgramView`, `ProgramMicrocycle`, `ProgramYear`, `JournalView`.
  - The four journal exports.
  - The 8 `exercises`/`nutrition` exports: `REP_SCHEMES`, `LOWER_DIFFERENTIATION`, `STRENGTH_PRINCIPLES`, `MACRO_TARGETS`, `MF_PROGRAM`, `DEFICIT_PROGRAM`, `NUTRITION_PRINCIPLES`, `FUELLING`.
  - `NUTRITION_TARGETS`.
  - The 13 `program.js` exports: `ERGZONE_FORMAT`, `INTENSITY_EVOLUTION`, `BUILD1_SESSIONS`, `VOLUME_EXTRAS`, `TECHNIQUE_WORK`, `MOVEMENT_SCREEN`, `MOBILITY_WARMUP`, `TECHNOGYM_CONVERSION`, `ATHLETE_BACKGROUND`, `RACE_TARGET`, `ORGS`, `EVENT_PATHWAY`, `ANNUAL_ARC`.
- Verified today: none of these words appears in `src/` or `e2e/` outside the files being deleted, `App.jsx` and `App.test.jsx`. So the guard goes green once the edits above land, and it fails on the base tree.
- Do not include `schedule.js` or `trainingConfig.js` names (decisions 1 and 2).
- `scripts/__tests__/entry-graph.test.mjs:35-63` uses `ProgramView` as a made-up module name inside a fake build manifest, not as an import. The guard does not scan `scripts/`, so leave it.

**Not touched:** `vite.config.js`. It has no per-file coverage key for any deleted file, and `constants/**` is already outside coverage. Global floors stay as they are.

#### The `logs-*` chunk and the bundle proof

There is no reason to rename `logs.js`; slice 4b will touch it anyway. After this slice the only importer of `logs.js` is `RecoveryView.jsx`, a lazy tab. So the separate `logs-*` chunk should disappear, with `LIPID_REF` inlined into the RecoveryView chunk. That is my expectation, not something I verified. The proof is one-off and not committed, using the slice 4a method:

1. Build at base (`2cd7d9e`) and at HEAD.
2. A scratch script loads the deleted exports from base:
   - the four journal exports;
   - every `program.js` and `nutrition.js` export;
   - the three `exercises.js` exports;
   - for decision 1, `SEASON_2` and `VOLUME_PROGRESSION`.
   It collects every string of 4 or more characters and keeps the ones that appear in no base `dist` file except the chunks for the deleted views and constants.
3. It prints counts only: matches in `dist/` at base (the positive control, must be above 0) and at HEAD (must be 0).
4. Two more checks: `ls dist/assets/logs-*` (expect none, or a chunk with only lipid rows), and `grep -c 'logs-' dist/sw.js`.
5. Old deployments and installed PWAs keep serving the old chunk. Removing them is outside the repo, as it was in 4a.

#### Visual baselines: exactly what the orchestrator does

`.github/workflows/e2e-web.yml` works like this:
- `visual-baselines` runs only on `workflow_dispatch` with `update_baselines: true`. It runs `npm run test:visual:update` inside the Playwright container and uploads the PNGs.
- `commit-baselines` refuses to run on `main`. It overwrites the PNGs in place and pushes a fast-forward commit, using `VISUAL_BASELINE_PAT`.
- The re-run of Playwright Visual comes through `pull_request`, so the PR must already be open.
- The job never deletes a PNG. The workflow's own comment says "retiring a baseline … stays a manual edit."

Steps:
1. In the build commit, `git rm` the two `desktop-{program,journal}` PNGs. The commit job would not remove them.
2. Push the branch and open the PR.
3. Run `gh workflow run e2e-web.yml --ref <branch> -f update_baselines=true`.
4. Wait for the "test: regenerate visual baselines (run …)" commit, then `git pull --ff-only` before any further local commit, because the job pushes fast-forward only.
5. Check what changed:
   - **Expected to change:** `desktop-overview` and `desktop-calendar`. The nav uses `flex: '1 1 auto'`, so 11 buttons re-flow.
   - **Expected unchanged:** the four `mobile-*` PNGs, `login` and `error-fallback`. The mobile bottom bar is separate. If any of these change, stop and investigate.
6. Confirm Playwright Visual and Smoke go green. Neither is a required check, so look at them explicitly.

#### Test plan (criterion → proof)

| # | Criterion | Proof |
|---|---|---|
| 1 | Files gone; 11 tabs; specs updated | `noProgramJournal.test.js`. `App.test.jsx`: 11 tabs, no PROGRAM or JOURNAL button, the error boundary still reports through the Settings tab. Smoke: 11 tests green. Visual: two tests and two PNGs removed, baselines regenerated, check green. |
| 2 | `check:colours` passes | Output of `npm run check:colours` in the PR body |
| 3 | Every deleted export has zero importers; no unused imports | The guard, plus `git grep -wE '<needles>' -- web/src web/e2e` showing nothing. `npm run lint` with 0 warnings, including `no-unused-vars`. |
| 4 | Global thresholds not lowered | Coverage before and after: lines 93.7, functions 90.0, branches 86.2 against floors 89/85/80. ProgramView was at 83.87 lines and 47.76 branches, so lines and branches should go up (inferred). Functions are unknown, so measure them. Floors are not edited either way. |
| 5 | `npm run size` passes | Report entry and total. Entry should barely move, because `App` is loaded lazily from `AuthGate`. Total should drop. Measure, don't predict. |
| 6 | `trainingConfig.js` untouched | `git diff --stat origin/main -- web/src/constants/trainingConfig.js` is empty |
| 7 | Mobile suites pass | The full `npm test` run, plus the `src/views/mobile` and `src/components/mobile` lines from it |
| — | No deleted data ships | The count-only bundle proof above |

Expected counts, inferred, to be measured: test files 132 − 4 + 1 = 129, and tests about 2,202 − 13 + 3 = 2,192. The four deleted test files hold 3, 5, 2 and 3 tests.

Also run `build`, `format:check` and `check:design-sync`. `entry.jsx`, `config.json` and `ownership.json` reference none of these files.

#### Files touched

- `src/App.jsx`
- `src/__tests__/App.test.jsx`
- `src/__tests__/noProgramJournal.test.js` (new)
- `src/constants/exercises.js`
- `src/constants/logs.js`
- `scripts/check-colour-literals.mjs`
- `e2e/smoke.spec.js`
- `e2e/visual.spec.js`
- the 12 deletions listed above
- `desktop-overview` and `desktop-calendar` PNGs, changed only by the bot commit

#### Out of scope

- **Slice 6:** `EVENT_LADDER`.
- **Slices 7 and 8:** the `schedule.js` orphans (decision 1).
- **Slice 9:** all of `trainingConfig.js`: `EST_MHR`, `SRPE_SCALE`, `HR_ZONES`.
- **Kept, StrengthView reads them:** `STRENGTH_TEMPLATES`, `PREHAB_NOTE`.
- **Slice 11:** the docs that still name `ProgramView` or #77:
  - `CLAUDE.md:59,145`. Editing the doctrine docs sets off the `doctrine_sha` guard, which is another reason to keep this slice clear of them.
  - `README.md:101`
  - `.claude/skills/architecture.md`
  - `.claude/skills/refactor/SKILL.md:3,19`. Its description goes stale on merge.
  - `.claude/AGENTS.md:27`
- **Slice 12:** design-sync prose (`DESIGN_BRIEF.md`, `HANDOFF.md`, `designs/*`, `splitiq-load.js`).
- **Left alone:** the made-up `ProgramView` module name in `entry-graph.test.mjs`, the historical PROGRAM measurement comments in e2e, and the `App.jsx:40`/`:137` banners.
- **Outside the repo:** git-history rewriting (D11), and the personal Drive file ID in the journal data that the 4a review flagged. It stays in git history after this slice.


### §S-6-7-8

#### Stage 3 spec: slices 6, 7 and 8 of #412 (#419, #420, #421)

This spec is read-only; I changed nothing. Repo HEAD is 2cd7d9e. All paths are under `/home/user/erg-dashboard/web/` unless noted. Line numbers are taken from main as it stands; slice 5 will shift some of them, so the builder should locate code by symbol. I read these files directly: CalendarView, utils/schedule.js :100-140, useSessionLog, useSessions, WorkoutItem, dateFormat.js, OverviewView :1-160 plus a symbol grep, the App.jsx ranges, the vite coverage block, noHealthLogs.test.js, invalidateSessionQueries(+test), MobileToday :104-170 and its test, e2e fixtures and smoke, and e2e-web.yml. The react-query claims cite Context7 `/tanstack/query/v5.90.3` (network-mode.md, queries.md).

### Decisions for Scott (each has a recommendation; the starred ones change an approved criterion or scope)

1. ★ **Seam A: move the Overview "today strip" removal from slice 8 into slice 7.**
   - I recommend yes. Overview imports five roster functions, and slice 7's In list deletes all of them.
   - Keeping those functions until slice 8 would mean slice 7 deletes almost nothing from `utils/schedule.js`, which contradicts #420's In list.
   - Removing the strip (`OverviewView.jsx:73-390`) in slice 7 lets slice 7 delete `utils/schedule.js` whole. Slice 7 then adds the small readiness card that the strip's removal requires.
   - The strip also contains the `autoregulate` signal, so a prescription surface goes one slice early. That is harmless.
   - This changes #420's "Out: Overview" line and moves the `desktop-overview` baseline change into slice 7 as well.
2. ★ **Where the Calendar gets its data, and the "offline → query cache" edge case.**
   - I recommend passing `plannedSessions` and `dbStatus` from the `useSessionLog()` that App.jsx already calls. It needs no new hook and no new coverage key.
   - `useSessionLog` fetches every row with no limit, ordered by `date_iso desc, id desc`. `useSessions` is wrong for this: its `.limit(50)` over a desc order lets future planned rows push recent history out of the window.
   - Offline behaviour under this recommendation:
     - Rows already fetched this session stay visible, because App state persists across tab switches.
     - A failed first load shows an error line.
   - That is the same as what react-query would actually give here. react-query's cache is in-memory only, with no persister in `main.jsx`. In the default `online` network mode, a query that is offline on first load is `pending` with `fetchStatus: 'paused'`, and data that is already cached is kept (Context7, network-mode.md).
   - Reword the edge case to: "offline → rows already loaded stay visible; a first-load failure shows an error, never an empty calendar."
   - The alternative is a new `useCalendarSessions(fromISO, toISO)` hook using react-query, with key `['sessions','calendar',from,to]`, which `invalidateSessionQueries`' prefix already covers. It costs a hook, about 8 tests and a per-file key. The trigger for choosing it would be wanting the Calendar to refresh after a react-query-side write without calling `fetchSessions`.
3. ★ **`logEntriesForDate` moves to `utils/dateFormat.js` in slice 7, and `utils/schedule.js` plus `schedule.test.js` are deleted in slice 7.**
   - Its key is byte-identical to the private `localLogDate` in `dateFormat.js:22-24`, so the move removes a duplicate date formatter.
   - `dateFormat.js` already has an 80/80/70 gate.
   - Acceptance 7.1 and 7.2 then point at `dateFormat.test.js` and `CalendarView.dayStrip.test.jsx`, because `schedule.test.js` no longer exists. Acceptance 8.5 ("no schedule import") holds once slice 8 deletes `constants/schedule.js`.
4. **Keep the MobileRecovery HRV tile (seam F).**
   - `MobileRecovery.jsx:269-317` is the HRV "↓ deficit vs baseline" tile, not nutrition. D16's intent is nutrition, so I recommend keeping the tile.
   - The correction should be recorded in the slice 8 PR body and in `coach/REORIENTATION_SLICE_SPECS.md`.
   - Nutrition in views is only the Overview stub (slice 8) and ProgramView (slice 5).
5. **Desktop Overview phase display (seam J).**
   - I recommend rendering `anchors.current_phase` (· `current_block`) only when present, copying MobileToday's pattern. Criterion 8.1's "with it set, only the anchor value renders" reads as a positive requirement, and rendering nothing would satisfy it only vacuously.
   - The alternative, rendering no phase at all, is about 15 fewer lines.
6. **`TSB_COPY` rewording (seam K).**
   - I recommend making all four bands descriptive rather than prescriptive. "ready for hard sessions", "Protect Thursday rest" and "Don't add sessions" each tell the user what to do, which the slice 8 story forbids.
   - Proposed copy:
     - fresh: `✅ Fresh — form positive; recent load below fitness`
     - neutral: `⚡ Neutral — recent load and fitness balanced`
     - fatigued: `⚠️ Fatigued — recent load above fitness`
     - deep: `🔴 High fatigue — recent load well above fitness`
   - The minimum alternative is to change only the Thursday line.
7. **Past-dated DB `planned` rows render as "PLANNED".** They are not hidden and not labelled missed. The DB says planned and the Calendar repeats it, with no inference.
8. **Calendar window stays `BACK=3, FWD=14`.** Widening the history view is a separate issue.
9. **Use one shared guard file, extended per slice (seam P).**
   - Create `src/__tests__/noPrescriptionEngine.test.js` in slice 6, using the `noHealthLogs.test.js` walker (same ROOTS `src`+`e2e`, needles built by concatenation, case-sensitive `\b` matching).
   - Slices 7 and 8 each append a needle group, commented with their issue number.
   - One walker beats three copies. Each slice's PR still shows its own needle diff.

`dayStatus` (seam B) is deleted in slice 7. It is the only producer of "missed", and #265's "closes because dayStatus deleted" already assumes this, so it is not a scope change.

### Seam map (what each PR leaves on main)

| After | `utils/schedule.js` | `constants/schedule.js` | Overview imports | Calendar |
|---|---|---|---|---|
| 6 | unchanged | minus `EVENT_LADDER` | unchanged | roster strip, no ladder |
| 7 | **deleted** (`logEntriesForDate` → `dateFormat.js`) | only `PHASE_CONTEXT` | analysis, coaching, `PHASE_CONTEXT`, `deriveTargets`, `HR130_POWER`; no schedule utils, no `WorkoutItem`, no `nowTick` | DB rows only |
| 8 | — | **deleted** | none of analysis/coaching/nutrition/schedule | unchanged |

Each PR builds on its own. The only cross-slice import, `PHASE_CONTEXT` used by Overview, survives in slice 7 and is deleted in slice 8 together with its last reader.

---

#### Brief: Slice 6 (#419), benchmarks cull

**Precondition:** slice 5 is merged. Its `ProgramYear.jsx` imported `EVENT_LADDER`, and `constants/logs.js:144` (prose naming `EVENT_LADDER`) goes with `DECISION_LOG`. If either is still present, stop.

**Delete (7 source files, 9 test files)**
- `src/utils/benchmarkStatus.js`, `src/utils/eventWindow.js`
- `src/hooks/useBenchmarkStatuses.js`, `src/hooks/useBenchmarkSessions.js`, `src/hooks/useLinkBenchmarkSession.js`
- `src/components/BenchmarkBadge.jsx`, `src/components/BenchmarkLinkControl.jsx`
- Tests:
  - `utils/__tests__/benchmarkStatus.test.js`, `utils/__tests__/eventWindow.test.js`
  - `hooks/__tests__/useBenchmarkStatuses.test.js`, `hooks/__tests__/useBenchmarkSessions.test.js`, `hooks/__tests__/useLinkBenchmarkSession.test.js`
  - `components/__tests__/BenchmarkBadge.test.jsx`, `components/__tests__/BenchmarkLinkControl.test.jsx`
  - `views/__tests__/CalendarView.test.jsx`, `views/__tests__/CalendarView.benchmark.test.jsx` (both are ladder-only)

**Edit**
- `src/constants/schedule.js`: delete the `EVENT_LADDER` export (`:338` to the line before `VOLUME_PROGRESSION`, `:418`).
- `src/views/CalendarView.jsx`:
  - Remove imports at `:1` (`useState`), `:3-10` and `:18`.
  - Remove the hook block, the `linkingKey` state and `linkError` (`:29-45`).
  - Remove `visibleEvents` (`:96-104`).
  - Remove the ladder panel, from the `{/* Upcoming events from the ladder */}` comment (`:243`) to the end of the fragment. Keep the closing `</>`.
  - Drop `alpha` if ESLint reports it unused.
  - The roster strip is untouched.
- `src/views/__tests__/CalendarView.dayStrip.test.jsx`: delete the three benchmark `vi.mock` blocks (`:7-23`) and the header comment lines about the ladder. Do not touch assertions.
- `vite.config.js`: remove all **seven** per-file keys:
  - `src/utils/eventWindow.js`, `src/utils/benchmarkStatus.js`
  - `src/hooks/useBenchmarkStatuses.js`, `src/hooks/useBenchmarkSessions.js`, `src/hooks/useLinkBenchmarkSession.js`
  - `src/components/BenchmarkBadge.jsx`, `src/components/BenchmarkLinkControl.jsx`
- `src/utils/invalidateSessionQueries.js:3-4`: reword the comment to "`['sessions']` is a prefix, so it also reaches any `['sessions', …]` sub-key — do not list those separately." Remove the `benchmark-window` name.
- `src/utils/__tests__/invalidateSessionQueries.test.js:24-45`:
  - Rename the sub-key fixture to `['sessions','window']` and retitle both tests generically ("does not name sub-keys — the sessions prefix covers them", "marks a cached sub-key query stale via the sessions prefix").
  - Drop the `['benchmark-sessions']` negative assertion.
- `src/hooks/useErgSessions.js:42`: reword the comment so it no longer names `benchmarkStatus`.
- **New** `src/__tests__/noPrescriptionEngine.test.js`, with needle group #419:
  - `EVENT_LADDER`, `benchmark_key`, `useBenchmarkStatuses`, `useBenchmarkDataUnavailable`, `useBenchmarkSessions`, `useLinkBenchmarkSession`, `BenchmarkBadge`, `BenchmarkLinkControl`, `benchmarkStatus`, `eventWindow`, `benchmark-window`, `SEASON 1 LADDER`.
  - Use the same three tests as `noHealthLogs`: scans both roots, needle self-test, no offenders.

**Not touched:** migration 009 and its `sessions_one_session_per_benchmark` index; `supabase/functions/strava-import/mapper.ts:292` (a comment, outside `web/src`); `scripts/__tests__/fixtures/live-migrations-*.json`; `.design-sync/DESIGN_BRIEF.md:83,440` and `NOTES.md:219` (prose, slice 12). `check-colour-literals.mjs` has no entry for any deleted file (verified at `:48-80`), so it needs no edit.

**Acceptance 6.2 SQL (read-only).** Run once on main before merge, and again after the Vercel production deploy. Both results must be identical.
```sql
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'sessions'
order by ordinal_position;

select count(*) filter (where benchmark_key is not null) as linked, count(*) as total
from public.sessions;

select id, benchmark_key from public.sessions
where benchmark_key is not null order by id;

select indexname, indexdef from pg_indexes
where schemaname = 'public' and tablename = 'sessions'
  and indexname = 'sessions_one_session_per_benchmark';
```

**Test count.** The deleted files hold about 139 `it`/`test` cases plus 5 `it.each` generators, which is more than the epic's "~90". Report the before and after figures from `npx vitest run` (the baseline is post-slice-5, not 2,202).

| Criterion | Proof |
|---|---|
| 6.1 no `EVENT_LADDER\|benchmark_key` reader in `web/src` | `git grep -nE "EVENT_LADDER\|benchmark_key" web/src` returns nothing, and the new guard passes |
| 6.2 column list and non-null rows unchanged | the four queries above, before and after, pasted into the PR body |
| 6.3 seven keys gone; global holds | `vite.config.js` diff; `npx vitest run --coverage` global ≥ 89/85/80 with figures reported (baseline 93.7/90.0/86.2 leaves room); if the global falls below a floor, add tests and never lower the floor |
| 6.4 no Calendar test matches 'SEASON 1 LADDER' | the guard needle, plus `git grep "SEASON 1 LADDER" web/src` returns nothing |
| 6.5 test count | before/after numbers in the PR body |
| Calendar per-file 80/80/70 | coverage table row for `CalendarView.jsx` (only dayStrip tests now cover it, and the ladder code is gone) |
| Build/size | `npm run build && npm run size`; entry should be unchanged (Calendar is lazy) |

Baseline: `desktop-calendar` changes because the panel is gone (see §Baselines).

---

#### Brief: Slice 7 (#420), Calendar from DB rows and `utils/schedule.js` deleted

**Delete**
- `src/utils/schedule.js`, entirely. Its exports are `ROSTER_ANCHOR`, `getRosterMode`, `SESSION_OVERRIDES`, `resolveDay`, `dayStatus`, `getToday`, `getUpcomingSessions` and `daySessions`, plus the private helpers. `logEntriesForDate` moves rather than being deleted.
- `src/utils/__tests__/schedule.test.js`, entirely. Its 3 `logEntriesForDate` cases are re-homed (below).
- From `src/constants/schedule.js`: `ROSTER_REGIMES`, `ROSTER_OVERRIDES`, `MICROCYCLE`, `SEASON`, `SEASON_2`, `VOLUME_PROGRESSION`, and `PHASES` if slice 5 left it. Only `PHASE_CONTEXT` remains, and the file header comment should say so.

**Move: `logEntriesForDate` → `src/utils/dateFormat.js`**
- Keep the signature `logEntriesForDate(date, sessions)`.
- Build the key with the existing private `localLogDate(date)`, not `toLogDate`. `toLogDate` falls back to *today* on an invalid Date, which would wrongly match today's rows.
- Return `[]` when `date` is not a valid Date.
- Treat `sessions` null or undefined as `[]`.
- Carry over the status-blind CONTRACT comment (#194) verbatim, minus the `dayStatus`/`getUpcomingSessions` names.

**`src/utils/__tests__/dateFormat.test.js`: new `describe('logEntriesForDate')`.** Use synthetic years only, with no `2026` anywhere.
- Unpadded key: `new Date(2030, 6, 9)` matches `'7/9/30'` and does not match `'07/09/30'`.
- Single-digit month with a double-digit day (`'3/14/30'`), and a double-digit month with a single-digit day (`'11/5/30'`).
- December → January rollover: `new Date(2030, 11, 31)` gives `'12/31/30'`; `new Date(2030, 11, 31 + 1)` gives `'1/1/31'`; each matches only its own row.
- Two-digit year padding: `new Date(2000, 0, 5)` gives `'1/5/00'`.
- No match → `[]`; null or undefined list → `[]`; invalid Date → `[]`.
- Status-blind: a `cancelled` row and a `completed` row on the same day both come back.

**`src/views/CalendarView.jsx`: rewrite the data path**
- **Props:** `{ loggedSessions = [], plannedSessions = [], cancelledSessions = [], dbStatus = 'ok', isWide }`.
- **Imports:** `WorkoutItem`, `logEntriesForDate` from `../utils/dateFormat.js`, `THEME`. No schedule imports, no `PHASE_CONTEXT`.
- **Loading and error states.** These come from `dbStatus` and replace the strip:
  - `'loading'` → one line, "Loading sessions…".
  - `'error'` → one line, "Sessions could not be loaded." (`useSessionLog` already calls `captureError`, so do not call it again).
  - Neither state renders cells, so the strip never claims emptiness it has not verified.
- **Window:** keep `BACK = 3, FWD = 14` (17 days), built from local midnight `today0`. For each day `d`:
  - `done = logEntriesForDate(d, loggedSessions)`
  - `planned = logEntriesForDate(d, plannedSessions)`
  - `cancelled = logEntriesForDate(d, cancelledSessions)`
  - No roster input and no `isOverride`.
- **Day status label**, in priority order:
  - `done.length` → `✓ DONE` (with ` ×N` when N > 1)
  - else `planned.length` → `PLANNED` (applies to past dates too; decision 7)
  - else no label.
  - The `⊘ N CANCELLED` badge stays as it is. `⇄ SWAPPED`, `— not logged` and the header's `● TODAY` are deleted; WorkoutItem already prints `● TODAY` when `highlight && showRail`.
- **Opacity:** `0.85` when `done && isPast`, otherwise `1`. The two `missed` branches are deleted.
- **Rows per day:** completed, then planned, then cancelled, each in the order received. `useSessionLog`'s `date_iso desc, id desc` order is preserved, and nothing sorts on the text `date`. Each row becomes a WorkoutItem:
  - completed `{ label, note: coachNote, done: true }`
  - planned `{ label, note: coachNote, done: false }`
  - cancelled `{ label: '⊘ ' + label, note: coachNote, done: false }`
  - The first row gets `showRail` and `highlight={isToday}`.
  - A day with no rows renders `<WorkoutItem session={null} rail highlight={isToday} showRail />`, unchanged.
  - Mapping `coachNote` to `note` gives DB rows WorkoutItem's existing expand detail. WorkoutItem itself is not edited.
- **Banner:** replace "YOUR WEEKS · … · PHASE" and the roster-switch text with a legend: `LAST 3 DAYS · NEXT 14 · ✓ done · planned · ⊘ cancelled`, using the same styles and theme tokens.
- **Empty state:** with `dbStatus === 'ok'` and no row in the window across all three lists, render the 17 "—" cells and then one line, "No sessions in this window." This is acceptance 7.3, and it is new behaviour.

**`src/App.jsx`**
- Add `dbStatus` to the `useSessionLog()` destructure (`:222-228`).
- Pass `plannedSessions={plannedSessions}` and `dbStatus={dbStatus}` to `<CalendarView>` (`:426-430`).
- Delete the `nowTick` state (`:196`) and its interval effect (`:207-210`). Overview was the only reader.
- Remove `nowTick={nowTick}` (`:451`).
- Rewrite the header map comment: delete `:40` ("Plans: MICROCYCLE, SEASON…"), the "ROSTER" token at `:41`, and `:48-50` (roster auto-switch, `ROSTER_ANCHOR`, `daySessions()`).
- Delete the `// ── 2-WEEK MICROCYCLE (roster-driven)` block (`:141-143`).

**`src/views/OverviewView.jsx` (decision 1)**
- Delete the imports `WorkoutItem` (`:10`) and the `utils/schedule` block (`:14-20`). Delete the `nowTick` prop (`:57`).
- Replace the whole strip IIFE (`:73-390`) with a readiness card. Use the same container styling as the strip minus the `sig` border colour (use `THEME.border`). Structure: `<section aria-label="Readiness">` → label `READINESS` → value `{readiness?.score ?? '—'}` in its own element → `{readiness?.status}` as subtext when the score is non-null.
- This removes the `autoregulate` signal, the `PHASE_CONTEXT` subline, the today box, the countdown/upcoming list and the duplicate "Recently completed" mini-list (seam I). "RECENT SESSIONS" (`:1157-1179`) stays.
- `evaluateRules`, `checkConsistency`, `autoregulate`, `PHASE_CONTEXT`, coaching, `deriveTargets` and `HR130_POWER` stay, because the Decision Engine, Prescription and Phase card still use them until slice 8. `todayRec` and `personalBaselines` stay for the same reason.
- `src/views/__tests__/OverviewView.test.jsx`:
  - Drop `nowTick` from `baseProps`.
  - Retarget the readiness tests to `within(screen.getByRole('region', { name: 'Readiness' }))`: one expects `'20'`, the other `'—'`.
  - Add one test asserting that no roster text renders (`queryByText(/YOUR WEEKS|FIFO|not logged/i)` is null).

**`src/views/__tests__/CalendarView.dayStrip.test.jsx`: rewrite.**
- Pin `vi.setSystemTime(new Date(2031, 0, 2, 9))` so the window crosses Dec → Jan.
- Build every fixture with a local `mdy(offsetDays)` helper, so no literal 2026 appears anywhere.
- Cases:
  1. Zero sessions, `ok` → 17 "—" cells plus "No sessions in this window.", with no throw.
  2. `loading` → loading line, no cells.
  3. `error` → error line, no cells.
  4. One completed row today → `✓ DONE` plus its label.
  5. Two completed rows on one day → `✓ DONE ×2`.
  6. A future planned row → `PLANNED` plus its label, and no `✓`.
  7. A past day with only a planned row → `PLANNED`, and `queryByText(/not logged|missed/i)` is null across the whole view (acceptance 7.4).
  8. A cancelled row → `⊘ 1 CANCELLED` plus `⊘ label`, and that day has no `✓ DONE`.
  9. A row outside the window does not render.
  10. A completed row whose `coachNote` is set expands to show the note on click.
  11. No `YOUR WEEKS` and no `SWAPPED`.
  12. Rails show `Dec` and `Jan`.

**Guard:** append needle group #420 to `noPrescriptionEngine.test.js`:
- `getRosterMode`, `ROSTER_ANCHOR`, `ROSTER_REGIMES`, `ROSTER_OVERRIDES`, `resolveDay`, `getToday`, `getUpcomingSessions`, `SESSION_OVERRIDES`, `daySessions`, `dayStatus`, `MICROCYCLE`, `SEASON`, `SEASON_2`, `VOLUME_PROGRESSION`, `nowTick`, `YOUR WEEKS`.
- Leave `PHASES` out: `src/squat/constants/phases.js` legitimately exports a `PHASES`.
- The current hits outside the culled files are only the App.jsx comments (edited above) and the `logs.js` prose that slice 5 removes. Verified by grep.

**Seam check:** `WorkoutItem` remains used by CalendarView and `.design-sync/entry.jsx`, so it is not orphaned and its key stays. `MobileToday` imports nothing culled (verified); it reads `todays.find(s => s.status === PLANNED_STATUS)` from `useSessions`.

| Criterion | Proof |
|---|---|
| 7.1 no 2026 in those files | `schedule.test.js` is deleted; `git grep -n 2026 -- web/src/views/__tests__/CalendarView.dayStrip.test.jsx` returns nothing (decision 3 re-points the criterion) |
| 7.2 `logEntriesForDate` edge cases | the new `dateFormat.test.js` describe, cases listed above |
| 7.3 zero sessions → empty calendar | dayStrip case 1 |
| 7.4 no roster "missed" | `dayStatus` is deleted; guard needle; dayStrip case 7 |
| 7.5 `CalendarView.jsx` ≥ 80/80/70 | coverage table row; cases 1-3 and 6-8 cover every branch |
| 7.6 mobile suites pass, MobileToday DB-planned | `npx vitest run src/views/mobile` output; `git grep -nE "schedule\|benchmark" web/src/views/mobile` returns nothing |
| Edge: loading / offline / order | cases 2-3; order comes from the `useSessionLog` query (`date_iso desc nullsFirst:false`, `id desc`); offline is per decision 2 |
| Overview still 80/80/70 | coverage table row |
| Global floors | before/after reported |
| Build/size | `npm run build && npm run size`, entry and total reported |

Baselines: `desktop-calendar` and `desktop-overview` both change.

---

#### Brief: Slice 8 (#421), Overview reduced to load, readiness and recent sessions

**Delete**
- `src/utils/analysis.js` and `src/utils/__tests__/analysis.test.js`.
- `src/constants/coaching.js` and `src/constants/nutrition.js`. Delete `nutrition.js` if it is still present: slice 5 removes its ProgramView importer and may delete the file itself. `NUTRITION_TARGETS` was already orphaned.
- `src/constants/schedule.js`, entirely; only `PHASE_CONTEXT` is left in it after slice 7.
- `deriveTargets` (`utils/trainingLoad.js:112-129`) and its describe (`trainingLoad.test.js:407` onwards). `sessionLoad`, `calcTrainingLoad`, `TSB_BANDS` and `tsbBand` are untouched.
- `assessMacro` and `macroColor` (`utils/formatting.js:35-49`) and their describes (`formatting.test.js:104-153`).

**`src/views/OverviewView.jsx`**
- Imports:
  - Remove `deriveTargets` (keep `tsbBand`), the analysis block, `HR130_POWER` (`trainingConfig.js` stays untouched because ErgView uses it; slice 9 owns it), `PHASE_CONTEXT`, and `ADAPTIVE_RULES`/`RULE_EVOLUTION`.
  - Remove whatever ESLint then reports as unused (probably `alpha`; the chart keeps `FONT` and `ReferenceLine`).
- Remove the `latestSquat` prop.
- Remove `todayRec` and `personalBaselines` from the destructure if nothing else reads them. `readiness` stays.
- Delete these sections:
  - Phase context card (`:392-496`)
  - The SQUAT e1RM tile (`:519`); the stats grid drops to 3 tiles, with columns `isWide ? 3 : 2`
  - Adaptive Decision Engine (`:557-782`)
  - Today's Prescription (`:784-947`)
  - Nutrition Status stub (`:1125-1155`)
  - Sequencing rules (`:1181-end`)
- Keep: the readiness card from slice 7, the stats grid (3 tiles), the Training Load chart (`:949-1123`), and RECENT SESSIONS.
- Phase (decision 5): add `anchors` to the existing `useAnchors()` destructure. Compute:
  - `phase = anchors?.current_phase?.value ?? null`
  - `block = anchors?.current_block?.value ?? null`
- When `phase` is set, render `<div aria-label="Training phase">{[phase, block].filter(Boolean).join(' · ').toUpperCase()}</div>` as a small pill above the readiness card, styled like MobileToday's pill with theme tokens. Render nothing when `phase` is null.
- `TSB_COPY`: use the four strings from decision 6. The fallback "No training-load reading — form status unknown." stays.

**`src/App.jsx`:** delete `latestSquat` (`:254`) and the `latestSquat={latestSquat}` prop (`:447`). `strengthTrend` (`:98-136`) and its StrengthView prop stay; slice 10 owns them (seam G).

**`src/utils/recoveryAnalytics.js:3`:** reword the comment so it no longer names `evaluateRules`.

**Not touched:** `MobileRecovery.jsx` (decision 4), `computeReadiness`, `useAnchors`, `trainingConfig.js`.

**Tests**
- `OverviewView.test.jsx`:
  - Drop `latestSquat` from `baseProps`.
  - Delete the empty-nutrition test.
  - Add:
    - (a) phase null (`anchors: {}`) → `queryByLabelText('Training phase')` is null, and `queryByText(/Phase 1|BASE/i)` is null;
    - (b) block set but phase null → no pill;
    - (c) phase `'Base'` with block `'wk 3/12'` → `'BASE · WK 3/12'`, and nothing from the old `PHASE_CONTEXT` copy;
    - (d) the load chart renders: with `loadData`, "TRAINING LOAD" plus CTL/ATL/TSB tile values 62 / 67 / -5;
    - (e) the combined null-CP path: `cp: null, cpAvailable: false, latest: null, loadUnavailable: true` → "TRAINING LOAD UNAVAILABLE" and "CP unavailable";
    - (f) the readiness fallback at view level: one vitals row (fewer than 14 samples) → `personalBaselines.rhrPersonal === false`, and the region shows the score `computeReadiness(row, {}, tsb)` returns from the defaults;
    - (g) none of `ADAPTIVE`, `PRESCRIPTION`, `NUTRITION`, `SEQUENCING`, `e1RM` is present.
- `MobileToday.test.jsx`, strengthening the "absent" test:
  - With `anchors: {}`, no element matches `/BASE|WK/i` in the header.
  - With `{ current_block: { value: 'wk 3/12' } }` and no phase, `queryByText(/WK 3\/12/i)` is null.
  - Add phase-only `'Base'` → `'BASE'`.
- Guard: append needle group #421:
  - `evaluateRules`, `checkConsistency`, `autoregulate`, `ADAPTIVE_RULES`, `RULE_EVOLUTION`, `DAILY_ROUTINE`, `PHASE_CONTEXT`, `deriveTargets`, `assessMacro`, `macroColor`, `latestSquat`, `NUTRITION_TARGETS`, `MACRO_TARGETS`.
  - Add one import-path regex: `/from\s+['"][^'"]*\/(analysis|coaching|nutrition|schedule)(\.js)?['"]/`. This is the mechanical proof of 8.5.

| Criterion | Proof |
|---|---|
| 8.1 phase null → no claim; set → anchor only, on Overview and MobileToday | Overview tests (a), (b), (c); the strengthened MobileToday tests; the `PHASE_CONTEXT` file is gone |
| 8.2 load chart and the null-CP "unavailable" path | tests (d), (e) |
| 8.3 fewer than 14 samples uses fallbacks | `recoveryAnalytics.test.js:37-41` (util level), unchanged and passing; test (f) at view level |
| 8.4 Overview ≥ 80/80/70 | coverage table row |
| 8.5 no analysis/coaching/nutrition/schedule import | guard import regex; `git grep -nE "from .*/(analysis\|coaching\|nutrition\|schedule)" web/src` returns nothing |
| 8.6 build and bundle | `npm run build && npm run size`, entry and total reported (Overview is lazy, so total should fall and entry be flat) |
| Out-of-scope functions unchanged | `trainingLoad.test.js` (`sessionLoad`, `calcTrainingLoad`) and `tsbBand.test.js` pass unedited |
| HRV tile kept | `MobileRecovery.jsx` absent from the diff; correction recorded in the PR body |

Baseline: `desktop-overview` changes.

---

#### Baselines (seam N), applies to every slice

- Visual PNGs can only be regenerated in the Playwright container.
- After a slice's PR is open, the orchestrator dispatches **E2E — Web** (`.github/workflows/e2e-web.yml`, `workflow_dispatch`, input `update_baselines: true`) **on the PR branch**.
- `visual-baselines` regenerates the PNGs. `commit-baselines` commits them to the branch, refuses `main`, and pushes with `VISUAL_BASELINE_PAT` so the PR's Visual check re-runs. Without that secret, GITHUB_TOKEN commits but triggers no re-run, so push again to refresh the check.
- Gate 3 judges the committed PNG diff by eye. e2e stubs Supabase to `[]` (`e2e/fixtures.js:44-52`), so after slice 7 the Calendar baseline shows the zero-session state, and the Overview baseline shows readiness "—" with no phase pill.
- Slice 6 changes `desktop-calendar`. Slice 7 changes `desktop-calendar` and `desktop-overview`. Slice 8 changes `desktop-overview`.
- The smoke spec needs no edit: the calendar and overview tabs remain, and it asserts only that no error boundary appears.

#### Risks
- Slice 7 Calendar coverage depends on the dayStrip rewrite covering every status branch. Gate 2 should hold the builder to the case list above.
- If slice 5 leaves `PHASES` or the `logs.js` prose in place, the slice 6 and 7 guards will flag them. The fix is "if still present, delete", never weakening a needle.
- Decision 2's alternative, a react-query hook, would need its supabase-js `.gte`/`.lte` filter usage checked through Context7 before it is built. I did not check it, because I am not recommending that path.


### §S-9-10

#### Stage 3 spec: slices 9 (#422) and 10 (#423)

I made no edits. Two kinds of check fed this spec: read-only `git grep`/`sed`, and three shape-only `SELECT`s on Supabase that returned counts and booleans, never values. Library claims and their sources: Supabase embedded selects come from Context7 `/supabase/supabase-js` (the `filter()` JSDoc example on a referenced table). Recharts `ReferenceLine ifOverflow` (`'discard'` is the default; `'extendDomain'` widens the axis) comes from Context7 `/recharts/recharts` (`src/util/IfOverflow.ts`), and the repo has `recharts ^3.10.1`.

#### What I verified that changes the plan
- **The 2 live `strength_sets` rows give no e1RM.** Both are "Barbell Squat" in one completed coach-origin workout. One is a warm-up with no weight or reps. The other is a working set with `completed=false` and no weight. On live data StrengthView is therefore always in its empty state, and the empty state has to say "sets exist, none can be scored", not "nothing logged".
- **The `exercise_prs` view exists live** (it has no migration in the repo). It has one row, "Barbell Squat", with a null e1RM. `PRIMARY_LIFTS` filters on "Back Squat", so **MobileStrength shows "No strength PRs yet" today even though a set exists.** This is the misreport acceptance 5 describes.
- **`utils/stats.js` has exactly one importer, ErgView** (it feeds `analyzeBarometer`). If the barometer is deleted, stats.js becomes an orphan.
- **The `PaceTrendChart` fixture does not check colours** (`PaceTrendChart.test.jsx:7`). `trainingConfig.test.js:98-117` checks only the UT2, UT1 and AT watt bands. Nothing currently pins byte-identity, so slice 9 has to add that test.
- **Visual baselines:** `e2e/visual.spec.js:15` excludes the desktop erg, strength and mobility views. `mobile-progress` opens on `PANES[0]`, not on Strength. **Neither slice moves any baseline.** `e2e/smoke.spec.js` mounts the erg, strength and mobility tabs against an all-`[]` Supabase stub, so the zero-row paths get exercised in e2e as a side effect.
- Baseline coverage for ErgView (from `scratchpad/baseline-test.txt`): stmts 89.42 / branches 75 / functions 88.57 / lines 91.01. No per-file key exists for it.

---

#### Decisions for Scott (each has a recommendation)

1. **The HR130 barometer has no live source.** Rebuilding it needs an HR literal, which breaks acceptance 3. **Recommended: replace it with an "aerobic efficiency" trend.** It plots watts per beat (`avg_watts / avg_hr`) from `useErgSessions` and reuses the existing least-squares maths in `stats.js`. That stays generic, uses live data and has no literals, and it matches #179's rescope ("live-wire the calibration off real sessions"). The alternative is to delete the section along with `stats.js` and its test, which is the smaller diff but drops the one trend-of-fitness readout.
2. **`HR130_PROJECTION`: delete it, with no replacement.** A projection is a prescription and has no data source.
3. **"MODEL CALIBRATION STATUS" panel (ErgView :1102-1239): delete all of it.** Every row is a personal figure (RHR, TDEE, HRV, MHR, the projection). The CP card is the live CP surface already (`cp + 'W'` / `cpStatus`, `'CP unavailable'` / `'anchor unreachable'`).
4. **`POWER_DURATION` table, `CRITICAL_POWER` W′ card and "NORTH STAR" card: delete them.** The predicted-watts column is a personal estimate, and W′ is always null. The ROWING METRICS section keeps only the CP card. `FTP_TEST` (the CP test card) is Out and stays.
5. **Minimum points: one constant, `MIN_TREND_POINTS = 3`, for both the working-power chart and the efficiency fit.** 3 is the gate `analyzeBarometer` already uses. The `< 6` gate stays where it is: `paceSummary` needs it for first-3 versus last-3.
6. **Section 1 tile "HR130 POWER": replace it with "W / BPM"**, the latest efficiency value, or `'—'` when there is none. The alternative is to drop the tile and go to a 3-column grid.
7. **SRPE: ErgLiveView imports the shared `SRPE_GUIDE`** and expands its five bands into ten per-integer buttons labelled `` `${v} — ${band.label}` `` (for example "3 — Easy (UT2)"). The shared constant is unchanged, as the Out list requires. This changes the visible label text, and no test pins those labels.
8. **`SRPE_SCALE` stays as an orphan**, because the issue lists it as Out. Name it as a slice-11/12 cleanup in the PR body.
9. **MobileStrength is in scope for slice 10.** Drop the `PRIMARY_LIFTS` `.in(...)` filter and the constant, and add an error state. Acceptance 5 names `PRIMARY_LIFTS`, and the misreport is live. The alternative is to fix only StrengthView and file an issue for mobile.
10. **The StrengthView trend comes from a new hook over `strength_sets` and `strength_workouts`, not from `exercise_prs`.** `exercise_prs` has no dates and no migration, and that migration is Out (#222 item 3).
11. **Lift colour: one colour, `THEME.accent`, for every lift.** `LIFT_COLOR` is keyed on personal lift names and already misses "Cable Row". The alternative is a palette cycled by index.
12. **Workout status filter for e1RM: none.** A set with `completed=true`, not a warm-up, and with weight and reps counts even if its workout is still `in_progress`.
13. **D19, the export:** before the deletion commit, the main thread (not a subagent) runs
   `git show origin/main:web/src/App.jsx | sed -n '/^const strengthTrend = {/,/^};/p' > <scratchpad>/strengthTrend-export.js`.
   Scott moves that file wherever he wants it, or says "discard". The PR body records only: exported or discarded, the date, 8 series, and the file's sha256. No values go in the repo or the PR. **There are 8 series, not nine:** Back Squat, Romanian Deadlift, Bench Press, Incline Bench, Cable Row, Barbell Row, Lat Pulldown, Shoulder Press. Git history still holds the literal either way, so the export gives Scott a usable copy; it is not erasure.
14. **New per-file coverage keys:**
    - ErgView at its measured baseline floors: lines 91, functions 88, branches 75. This makes acceptance 5 a CI gate rather than a manual comparison.
    - `utils/ergTrend.js`, `utils/liftSeries.js` and `hooks/useLiftHistory.js` at 80/80/70.

---

#### Brief A: Slice 9 (#422), personal calibration

**Precondition.** Slices 5–8 have merged. Before writing any code, run the literal grep (criterion 3) on a fresh `origin/main`. If it finds anything in a file this brief does not list, stop and report it; do not absorb it.

### Commit 1: pin byte-identity on unchanged code
**`web/src/constants/__tests__/trainingConfig.test.js`**
- Add the test `derivePaceZones(205) is byte-identical to the pre-#422 output`. It asserts `JSON.stringify(derivePaceZones(205))` against a string literal captured from the **unchanged** function. Literals in a test fixture are allowed.
- Commit this alone, with green CI, before touching `trainingConfig.js`. Commit 2 must not change the test.

### Commit 2: everything else

**`web/src/constants/trainingConfig.js`**
- Delete `CALIBRATION_STATUS` (:46-~150, including its leading comment), `deriveCalibrationStatus` (:152-168), `CRITICAL_POWER` (:170-176), `POWER_DURATION` (:178-219), `HR_ZONES` (:231-277) and `HR130_POWER` (:284-291).
- Delete `EST_MHR` (:279) if it is still present.
- Keep `SRPE_GUIDE`, `FTP_TEST`, `SRPE_SCALE` and `derivePaceZones`.
- Add a `color` to each `ZONE_POWER_PCT` row:
  - Recovery `'#666'`
  - UT2 `THEME.accent`
  - UT1 `THEME.positive`
  - AT `THEME.caution`
  - TR `THEME.warning`
  - AN `THEME.critical`
  
  These are exactly the values the old `HR_ZONES` lookup and its fallback produced.
- In `derivePaceZones`, drop the `HR_ZONES.find` and emit `color` from the row. Keep the key order `zone, color, wattsLow, wattsHigh, paceFloor, paceCeil` so the `JSON.stringify` output stays identical.
- Recovery keeps `'#666'` because swapping in any `THEME` token would change the output (a `var(--color-*)` string is not `'#666'`).

**`web/scripts/check-colour-literals.mjs`**
- Keep both `#666` entries:
  - trainingConfig.js now holds the literal in the Recovery row.
  - `ErgView.jsx:266` is untouched.
- Only the trainingConfig `reason` changes, to say it is the Recovery band colour with no HR row behind it and still wants a token decision. Nothing else in the file changes.

**`web/src/utils/ergTrend.js` (new, pure)**
- `MIN_TREND_POINTS = 3`.
- `workingPowerSeries(sessions)`:
  - Input is enriched `useErgSessions` rows, newest first.
  - Drop rows where `avg_watts == null` or `toISODate(date) === ''`.
  - Return the rest chronologically as `{ date: date_display, watts: avg_watts, pace: pace_500m, dist: label, hardPush }`. This is the shape `ErgTooltip` reads.
- `efficiencySeries(sessions)`:
  - Keep rows with `avg_watts > 0`, `avg_hr > 0` and a parseable date.
  - Return chronological `{ iso, date, wpb: avg_watts / avg_hr }`.
- `fitTrend(points)`:
  - The least-squares fit moved out of `analyzeBarometer`.
  - The x axis is days from the first point's ISO date, using `new Date(iso + 'T00:00:00')`. There is **no `'2026/'`**.
  - Returns null below `MIN_TREND_POINTS`.
  - Otherwise returns `{ slopePerWeek, r2, residSd, nPoints, current }`, using `mean` and `sampleStdDev` from `utils/stats.js`.
  - It returns **no verdict string**.
- `zoneGuides(paceZones)`:
  - Returns `[]` when `paceZones` is empty.
  - Otherwise returns `[{ y: UT2.wattsLow, label: 'UT2 floor' }, { y: UT1.wattsHigh, label: 'UT1 top' }]`.

**`web/src/views/ErgView.jsx`**
- Imports:
  - Drop `CRITICAL_POWER`, `POWER_DURATION`, `deriveCalibrationStatus`, `HR130_POWER`, `mean` and `sampleStdDev`.
  - Keep `FTP_TEST` and `derivePaceZones`.
  - Add the `ergTrend.js` exports.
- Delete `ergTrend` (:34-119), `analyzeBarometer` (:125-179), `HR130_ANALYSIS` (:181), `HR130_PROJECTION` (:183-190), `calibrationStatus` (:230-234) and `hr130Now` (:236-237).
- **Leave the `derivePaceZones(cp)` call at :229 byte-unchanged.** That is how this brief reads acceptance 1's "ErgView untouched", because the In list rewrites the rest of the file.
- In the component:
  - `power = workingPowerSeries(sessions)`
  - `eff = efficiencySeries(sessions)`
  - `effFit = fitTrend(eff.map(p => ({ x: p.iso, y: p.wpb })))`, or whatever argument shape `fitTrend` ends up taking (an implementation choice).
  - `guides = zoneGuides(paceZones)`
- Section 1:
  - The tile becomes `W / BPM`.
  - It shows `eff.at(-1)?.wpb.toFixed(2)`, or `'—'`.
- Section 3, WORKING POWER TREND:
  - If `power.length < MIN_TREND_POINTS`, render `Insufficient data — {n} of {MIN_TREND_POINTS} sessions with power logged.`
  - Otherwise render the chart with `data={power}` and `YAxis domain={['auto','auto']}`.
  - Draw `guides.map(g => <ReferenceLine y={g.y} label={g.label} ifOverflow="extendDomain" …/>)`.
  - Delete the prose at :487-494.
  - Keep the subtitle.
- HR130 section (:496-781): replace it with "AEROBIC EFFICIENCY · W PER BEAT".
  - Subtitle: neutral copy along the lines of "average watts ÷ average heart rate per session; rising = more power per beat". It must contain no numbers.
  - If `effFit` is null, render `Insufficient data — {n} of {MIN_TREND_POINTS} sessions with power and heart rate.`
  - Otherwise render three stat boxes: LATEST, TREND (`±x.xx /wk`), FIT (`r² · n`).
  - No chart, no projection, no verdict, no coaching prose.
- ROWING METRICS (:950-1100):
  - Keep the header and the CP card only.
  - Delete the explanatory prose at :985-989, the W′ and NORTH STAR cards, the "YOUR 3 RACE FORMATS" table and its footnote.
- Delete the MODEL CALIBRATION STATUS panel (:1102-1239).
- The zone-bar `?? '#666'` (:266) is untouched.

**Literal residue outside ErgView** (comments only, and only if still present after slices 5–8):
- `App.jsx` ~:159-162: delete the "TRAINING LOAD DATA … FTP estimated at …W" comment.
- `utils/stats.js:8`: "published HR130 spread figure" becomes "published spread figure".
- `utils/trainingLoad.js:34`: remove the parenthetical `(150 W, sRPE 7)`.

**`web/src/views/ErgLiveView.jsx`**
- Delete the local `SRPE_GUIDE` (:14-25).
- Import the shared one.
- Module-level `SRPE_BUTTONS = SRPE_GUIDE.flatMap(b => { const [lo, hi] = b.range.split('-').map(Number); … ({ v, label: \`${v} — ${b.label}\` }) })`.
- Change `:385` to map `SRPE_BUTTONS`.
- `srpe` state, `setSrpe` and the insert payload do not change.

**`web/vite.config.js`**
- Add `'src/views/ErgView.jsx': { lines: 91, functions: 88, branches: 75 }`.
- Add `'src/utils/ergTrend.js': { lines: 80, functions: 80, branches: 70 }`.
- The global floors are untouched and may only go up.

### Tests
- **`trainingConfig.test.js`:**
  - Remove the `CALIBRATION_STATUS`, `CRITICAL_POWER` and `deriveCalibrationStatus` blocks (:13-33 in part, :35-97).
  - Keep the `PACE_ZONES` absence test and the watt bands.
  - Add `import * as cfg` and assert that each of the 7 deleted names is `undefined`.
- **`utils/__tests__/ergTrend.test.js` (new). Each function gets these cases:**
  - M/D/YY input sorted chronologically, plus an unparseable date dropped.
  - Null-watts rows dropped.
  - `fitTrend` returns null at 2 points and a positive slope on a rising 3-point series.
  - `efficiencySeries` excludes `avg_hr` 0 or null.
  - `zoneGuides([])` returns `[]`.
  - `zoneGuides(derivePaceZones(205))` gives the UT2 floor and UT1 top from the bands.
- **`ErgView.test.jsx`:**
  - Rewrite :215-250:
    - The 205 case asserts `205W` and `provisional`.
    - The 212 case asserts `212W` and `confirmed`.
    - The unavailable case keeps `CP unavailable` and `anchor unreachable` and drops `CP anchor unavailable`.
  - Add:
    - (a) 0 sessions, then 2 powered sessions: `/insufficient data/i` appears in both sections.
    - (b) 3 powered sessions without HR: the power section is not insufficient, the efficiency section is.
    - (c) 3 sessions with power and HR: the "W / BPM" tile is not `'—'`.
    - (d) `textContent` contains none of `HR130`, `KEY BAROMETER`, `MODEL CALIBRATION STATUS`, `RACE FORMATS`, `PROJECTED`.
- **`ErgLiveView.test.jsx`:**
  - 10 sRPE buttons render.
  - Clicking `7 — Hard (threshold)` before `save()` puts `srpe: 7` in the inserted row.

### Scope boundary
- No change to `PaceTrendChart`, `check-zone-bands.mjs`, `zone-bands.yml`, `.design-sync/entry.jsx`, `useErgSessions`, `useAnchors` or `ErgTooltip`.
- No doc edits. `.claude/skills/architecture.md:19` naming the deleted symbols belongs to slice 11; list it in the PR body.
- `PaceTrendChart` has no minimum-data gate. That is noted, not fixed here.

### Criterion → proof (slice 9)
| # | Criterion | Proof |
|---|---|---|
| 1 | `derivePaceZones(205)` byte-identical; four surfaces untouched | The commit-1 test passes unchanged in commit 2. `npm run check:zones` passes. `git diff origin/main --stat` shows no change to `check-zone-bands.mjs`, `zone-bands.yml` or `.design-sync/entry.jsx`. `git diff` on ErgView shows line :229 unchanged. |
| 2 | `check:colours` passes, `#666` valid | `npm run check:colours` passes. Both entries are still present and both literals still exist. |
| 3 | No `'2026/'`, no numeric CP/HR literals | `git grep -n "'2026/'" -- web/src` is empty. `git grep -nIE "\bHR ?1[0-9]{2}\b\|\b1[0-9]{2} ?bpm\b\|MHR ?1[0-9]{2}\|\b[0-9]{2,3} ?W\b\|\bCP ?[0-9]{3}\b\|\b(cp\|ftp\|CP\|FTP)\s*[:=]\s*[0-9]{3}\b" -- web/src ':!web/src/**/__tests__/**' ':!web/src/**/*.test.*'` is empty. `git grep -nE "y=\{[0-9]+\}\|domain=\{\[[0-9]" -- web/src/views/ErgView.jsx` is empty. Expected residue after slices 5–8 is none: the `logs.js` journal exports, `program.js`, `coaching.js`, `nutrition.js`, both `schedule.js` files, `ProgramView`, `ProgramMicrocycle`, `deriveTargets` and the Overview prescription/ADE hits all go in those slices. Readiness-score `y={80}`/`y={60}` in `MobileRecovery` is not CP/HR, so the chart grep is scoped to ErgView. |
| 4 | "Insufficient data" below the minimum; "CP unavailable" without an anchor | The new ErgView tests (a) and (b), plus the rewritten unavailable test. |
| 5 | ErgView coverage not lowered | The new per-file key at the baseline floors passes in `Test & Coverage`. The PR body quotes the before/after row. |
| — | Gates | `npm run build && npm run size`: entry ≤ 150, ErgView lazy. `npm test`, `npm run lint`, `npm run format:check`. Smoke e2e erg tab green. |

---

#### Brief B: Slice 10 (#423), mobility and strength literals

**Precondition.** Slice 8 has merged (`latestSquat` is gone). Item 13 (the D19 export or discard) is recorded **before** the deletion commit.

**`web/src/constants/mobility.js`**
- Remove every `rehab: true` (:25, 31, 73, 89, 111, 117).
- Delete `MOBILITY_STREAK_NOTE` (:146-147).
- Rewrite `why` (:11, :54), the three `note`s (:46, :94, :142), the injury lines in `visual` (:27, :33, :75, :91, :113, :119) and `yoga.when` (:101).
- **Rule:**
  - No injury or rehab reference: no "rehab", "physio" or "rehab area".
  - No injured side named ("on the left", "left side", "left hamstring/glute").
  - No roster slot (day or time, e.g. "Thu AM").
  - Instructional laterality inside a movement ("right foot forward") stays.
  - Generic safety copy ("discomfort ok, sharp pain no") stays.
- The routine ids, names, move lists and the header comment (:2, already generic) do not change.

**`web/src/views/MobilityView.jsx`**
- Delete the `b.rehab` border branch (:~140) and the `· REHAB` badge (:~171-182).
- The banner copy is already generic. The epic's ":38" line reference is stale; it has no rehab copy to remove.

**`web/src/utils/liftSeries.js` (new, pure)**
- `epley1rm(weightKg, reps)`:
  - Returns `Math.round(w * (1 + r / 30))`, the same formula as `StrengthLogger.jsx:176`.
  - Returns null when weight or reps is not > 0.
  - StrengthLogger keeps its own copy because it is excluded from coverage and out of scope; note the duplicate in the PR body.
- `buildLiftSeries(workouts)`:
  - Input is `[{ workout_date, strength_sets: [...] }]`.
  - Scoreable set: `completed && !is_warmup && hold_seconds == null && epley1rm != null`.
  - Output is `{ lifts: { [exercise_name]: [{ date: toLogDate(workout_date), e1rm }] }, setCount, scoredCount }`, keeping the best e1RM per exercise per workout, in chronological order.
  - **No name filtering.**

**`web/src/hooks/useLiftHistory.js` (new)**
- `useQuery` with `['lift-history']`.
- Query: `supabase.from('strength_workouts').select('workout_date, strength_sets(exercise_name, weight_kg, reps, is_warmup, completed, hold_seconds)').order('workout_date', { ascending: true })`.
- Throw on error. Errors reach Sentry automatically through the existing QueryCache sink.
- `select: buildLiftSeries`.
- It is read-only and RLS-scoped, and it does no inserts.

**`web/src/views/StrengthView.jsx`**
- Props become `{ strengthSessions }`. Call `useLiftHistory()` inside.
- Delete `LIFT_COLOR`; `liftColor = THEME.accent`.
- `activeLift` state starts as `null`. `active = lifts[activeLift] ? activeLift : Object.keys(lifts)[0]`.
- States:
  - Pending: `Loading strength history…`
  - Error: `Strength history unavailable.`
  - `setCount === 0`: `No strength sets logged yet.`
  - `setCount > 0 && scoredCount === 0`: `{setCount} sets logged — none with weight and reps to estimate e1RM.`
  - Otherwise: the existing selector, chart and callout read `lifts[active]`.
  - The chart needs ≥2 points; otherwise the existing "One data point" copy.
- All `.slice(-1)[0]` reads sit behind the non-empty branch.
- Templates and sessions sections unchanged.

**`web/src/App.jsx`**
- Delete `strengthTrend` (:98-136) and the `strengthTrend=` prop (:466).
- Delete the nutrition comment block ~:164-169 only if slice 8 left it.

**`web/src/hooks/useStrengthPRs.js` and `views/mobile/MobileStrength.jsx`** (decision 9)
- Delete `PRIMARY_LIFTS` and `.in(...)`.
- MobileStrength:
  - Add an `isError` state, `Strength records unavailable.`
  - The empty copy shows only on `!isLoading && !isError && data.length === 0`.
  - The existing `best_e1rm_kg != null` guard already handles the live null.

**`web/vite.config.js`**
- Add 80/80/70 keys for `src/utils/liftSeries.js` and `src/hooks/useLiftHistory.js`.
- Keep the StrengthView and MobilityView keys.

**Removed-identifier guard.** Extend `src/__tests__/noHealthLogs.test.js` `NEEDLES` with `'strength' + 'Trend'`, `'MOBILITY_' + 'STREAK_NOTE'` and `'PRIMARY_' + 'LIFTS'`. These go in concatenated, which is the file's own convention, so the test does not itself become a hit. The new names (`useLiftHistory`, `buildLiftSeries`) were chosen so they cannot match.

### Tests
- **`MobilityView.test.jsx:22`:** replace the `· REHAB` assertion with `expect(screen.queryByText(/REHAB/i)).not.toBeInTheDocument()` after expanding.
- **New `constants/__tests__/mobility.test.js`:** no field of any routine or block matches `/rehab|physio|\bleft (side|hamstring|glute)\b|on the left|\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b/i`, and no block has a `rehab` key.
- **New `utils/__tests__/liftSeries.test.js`:**
  - `epley1rm` null and zero cases.
  - The live-shape fixture (a warm-up with no weight, plus an incomplete working set) gives `setCount 2, scoredCount 0, lifts {}`.
  - Best-of-workout selection and chronological order.
  - Any `exercise_name` survives, including `'Barbell Squat'`.
  - Hold sets are excluded.
- **New `hooks/__tests__/useLiftHistory.test.js`:** mock supabase and assert:
  - The select string.
  - The error path throws.
- **`StrengthView.test.jsx`:** mock `useLiftHistory`, rename the fixtures, and cover:
  - Zero sets.
  - The live-shape case ("2 sets logged — none…").
  - The `'Barbell Squat'` multi-point case: the button renders, there is a callout and a delta.
  - A single-point lift.
  - Loading.
  - Error.
- **New `views/mobile/__tests__/MobileStrength.test.jsx`:**
  - A row named `'Barbell Squat'` renders, and the empty copy does not.
  - Error shows "unavailable", not the empty copy.
- **New `hooks/__tests__/useStrengthPRs.test.js`:** asserts that `.in` is not called.

### Scope boundary
- Out of scope:
  - Per-user mobility assignment (D18).
  - The `exercise_prs` migration.
  - Editing `StrengthLogger`.
  - `PREHAB_NOTE` / `STRENGTH_TEMPLATES` copy in StrengthView. It is coach-flavoured; park it as a follow-up issue.
- Docs (`architecture.md:68`) are slice 11.

### Criterion → proof (slice 10)
| # | Criterion | Proof |
|---|---|---|
| 1 | Removed identifiers have zero hits | `git grep -nE "\bstrengthTrend\b\|MOBILITY_STREAK_NOTE\|PRIMARY_LIFTS\|rehab:" -- web/src` is empty, and the `noHealthLogs` guard passes. |
| 2 | MobilityView per-file gate | `Test & Coverage` is green with the 80/80/70 key. |
| 3 | StrengthView renders with the 2 live rows and with zero | The live-shape and zero StrengthView tests, plus smoke e2e on the strength tab with the `[]` stub. |
| 4 | Series exported or discarded before merge | The PR body records Scott's call, date, "8 series" and the sha256, with no values. Reviewer checks this before Gate 3. |
| 5 | Name mismatch does not misreport | The `liftSeries` test for "any name survives"; the StrengthView `'Barbell Squat'` test; the MobileStrength `'Barbell Squat'` test; the `useStrengthPRs` "no `.in`" test. The empty copy keys on `setCount`, never on a name list. |
| — | Gates | build + size (entry ≤ 150; StrengthView stays lazy), test, lint, format:check, `check:colours`. |

---

#### Assumptions
| # | Assumption | Status |
|---|---|---|
| A1 | Slices 5 and 8 remove every non-ErgView literal hit listed above | Unverified. The precondition grep catches it. |
| A2 | `strength_workouts` and `strength_sets` RLS is owner-only, so the embedded select returns only the user's rows | Per CLAUDE.md, not re-read in the migration |
| A3 | `ifOverflow="extendDomain"` keeps the guides visible with an auto domain | Context7 `/recharts/recharts`, v3 source |
| A4 | The PostgREST embed works through the `workout_id` FK | Context7 supabase-js. The FK is in `007_strength_subsystem.sql:87`. |
| A5 | Commit 1's captured string is taken on the unmodified function | Process. The reviewer checks commit order. |

Files referenced (all under /home/user/erg-dashboard/web/):
- src/constants/trainingConfig.js
- src/constants/__tests__/trainingConfig.test.js
- src/views/ErgView.jsx
- src/views/__tests__/ErgView.test.jsx
- src/views/ErgLiveView.jsx
- scripts/check-colour-literals.mjs
- src/utils/stats.js
- src/utils/trainingLoad.js
- src/App.jsx
- src/constants/mobility.js
- src/views/MobilityView.jsx
- src/views/StrengthView.jsx
- src/hooks/useStrengthPRs.js
- src/views/mobile/MobileStrength.jsx
- src/__tests__/noHealthLogs.test.js
- vite.config.js
- e2e/visual.spec.js
- e2e/smoke.spec.js

