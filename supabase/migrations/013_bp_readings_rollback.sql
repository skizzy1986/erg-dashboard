-- Rollback for 013_bp_readings.sql. NOT auto-applied.
--
-- Revert the Vercel deploy first if the shipped client reads bp_readings
-- (useBpReadings): PostgREST answers 404 on a missing table, which turns the
-- RecoveryView BP card into its error state rather than its empty state.
--
-- DATA LOSS WARNING: dropping the table discards every recorded reading, and
-- they are not in git anywhere (by design). Export first:
--   select measured_at, sys_mmhg, dia_mmhg, pulse_bpm, context, clean, source
--   from public.bp_readings order by measured_at;
--
-- The policy and index are dropped with the table.

drop table if exists public.bp_readings;
