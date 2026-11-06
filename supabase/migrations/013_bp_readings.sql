-- 013_bp_readings.sql
-- Additive + reversible. Blood-pressure readings move out of the committed
-- front-end constants and into the database, where they belong: they are
-- personal health data, and the repo is public. RecoveryView reads them through
-- useBpReadings; nothing else writes them yet (entries are logged by Coach via
-- MCP, or by hand), so source defaults to 'manual'.
--
-- Schema only. There is deliberately NO seed here — a seed would put the very
-- values this migration exists to remove straight back into git. Existing
-- readings are loaded separately, with an explicit user_id (auth.uid() does not
-- resolve through the MCP connector), and read back.
--
-- Single-owner RLS, mirroring anchors_owner / coach_log_owner in 006. Never a
-- BYPASSRLS path from the browser.
--
-- The CHECK ranges are plausibility guards against typos (a transposed sys/dia,
-- a missing digit), not clinical thresholds.

create table if not exists public.bp_readings (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
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

comment on table public.bp_readings is
  'Blood-pressure readings, one row per measurement. Personal health data: '
  'single-owner RLS, never seeded from git. clean = taken under standard '
  'conditions (rested, seated, no recent caffeine/exercise) and so comparable '
  'across days; unclean readings are kept but should not drive a trend.';

alter table public.bp_readings enable row level security;
drop policy if exists bp_readings_owner on public.bp_readings;
create policy bp_readings_owner on public.bp_readings
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- No separate index: the only read is "latest N for this user", newest first,
-- and the unique (user_id, measured_at) constraint's btree already serves it
-- (a btree scans backwards as cheaply as forwards).
