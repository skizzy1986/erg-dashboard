-- 015_bp_readings.sql
-- Captures public.bp_readings, created live on 2026-11-06 (version
-- 20261106035559, liveOnly in manifest.json) with no file. Slice 4b (#417).
--
-- Idempotent: on production this is a verified no-op; on a fresh database it
-- creates the table exactly as live. Grants are NOT changed here, so the
-- capture stays faithful; the anon revoke is in 016.
--
-- Constraint names are written explicitly and match the live names read from
-- pg_constraint before this file was written (bp_readings_pkey,
-- bp_readings_user_id_fkey, bp_readings_user_id_measured_at_key and the three
-- *_check). The CHECKs are spelled `x >= a and x <= b` so pg_get_constraintdef
-- renders them identically to live: CHECK (((sys_mmhg >= 60) AND (sys_mmhg <= 260))).
-- RLS is enabled, not forced, as live.
--
-- SHAPE GUARD: `create table if not exists` silently skips a table whose live
-- shape has drifted, so the closing block asserts the live column count and
-- raises on mismatch. That turns "capture" into "verified capture".
--
-- APPLY: Scott approves; Supabase MCP apply_migration with name exactly
-- `015_bp_readings` (R18: an applied 014+ entry's live name must equal its
-- file stem, so it cannot claim the 20261106035559 row). Then its
-- supabase/migrations/manifest.json entry flips to `applied` with the new
-- live version; the liveOnly bp_readings row stays.

create table if not exists public.bp_readings (
  id          uuid not null default gen_random_uuid(),
  user_id     uuid not null default auth.uid(),
  measured_at timestamptz not null,
  sys_mmhg    smallint not null,
  dia_mmhg    smallint not null,
  pulse_bpm   smallint,
  context     text,
  clean       boolean not null default false,
  source      text not null default 'manual',
  created_at  timestamptz not null default now(),
  constraint bp_readings_pkey primary key (id),
  constraint bp_readings_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade,
  constraint bp_readings_user_id_measured_at_key unique (user_id, measured_at),
  constraint bp_readings_sys_mmhg_check check (sys_mmhg >= 60 and sys_mmhg <= 260),
  constraint bp_readings_dia_mmhg_check check (dia_mmhg >= 30 and dia_mmhg <= 160),
  constraint bp_readings_pulse_bpm_check check (pulse_bpm >= 30 and pulse_bpm <= 220)
);

alter table public.bp_readings enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies
                 where schemaname = 'public' and tablename = 'bp_readings'
                   and policyname = 'bp_readings_owner') then
    create policy bp_readings_owner on public.bp_readings
      for all to authenticated
      using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;

  if (select count(*) from information_schema.columns
      where table_schema = 'public' and table_name = 'bp_readings') <> 10 then
    raise exception '015: live bp_readings has drifted from the captured shape (expected 10 columns)';
  end if;
end $$;
