-- 016_health_records.sql
-- Additive + reversible (016_health_records_rollback.sql). Slice 4b (#417).
--
-- lab_results: one row per marker per blood draw; lipid and hormone panels
-- share it, told apart by `panel`. A typed per-panel table would bake one
-- person's panel into column names and need a migration per new marker.
-- injuries: typed injury history (no numeric value, so it does not fit the
-- lab shape). Both are owner-only RLS with one FOR ALL policy, the shape of
-- 006 (anchors/coach_log). App reads only in v1 (D10); writes go via MCP.
--
-- REFERENCE RANGES: lab-printed ranges live on the row with a mandatory
-- source. lab_results_ref_needs_source makes a range without a source
-- impossible, which is the DB half of acceptance 5 (the code half is the
-- Vitest over LIPID_REF).
--
-- ANON REVOKE (decision 3): no anonymous path reads health data (/squat never
-- imports the client), so anon loses every privilege on all three health
-- tables, including bp_readings, which 015 captured with its Supabase-default
-- grants. RLS already returned anon zero rows; after this anon gets 42501
-- permission denied instead. authenticated keeps full DML behind the owner
-- policy so the future entry forms need no grant migration.
--
-- Depends on 015 (public.bp_readings). Apply 015 first; roll 016 back first.
--
-- APPLY: Scott approves; Supabase MCP apply_migration with name exactly
-- `016_health_records`; then its supabase/migrations/manifest.json entry flips
-- to `applied` with the live version.

create table if not exists public.lab_results (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  collected_on    date not null,
  panel           text not null check (panel in ('lipid', 'hormone', 'other')),
  marker          text not null check (length(trim(marker)) > 0),
  value           numeric not null,
  value_qualifier text check (value_qualifier in ('<', '>')),
  unit            text not null,
  ref_low         numeric,
  ref_high        numeric,
  ref_source      text,
  note            text,
  source          text not null default 'manual',
  created_at      timestamptz not null default now(),
  unique (user_id, collected_on, panel, marker),
  constraint lab_results_ref_needs_source check
    ((ref_low is null and ref_high is null) or length(trim(coalesce(ref_source, ''))) > 0),
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
  side        text check (side in ('left', 'right', 'bilateral')),
  onset_on    date,
  resolved_on date,
  status      text not null default 'active' check (status in ('active', 'monitoring', 'resolved')),
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

revoke all on public.lab_results, public.injuries, public.bp_readings from anon;
