-- Rollback for 016_health_records.sql. NOT auto-applied.
--
-- DESTRUCTIVE: DROPS lab_results AND injuries WITH EVERY ROW. Nothing restores
-- them — public.backup_snapshot() does not cover health tables (#428). Export
-- first and keep the output outside git:
--   select * from public.lab_results order by collected_on, panel, marker;
--   select * from public.injuries order by onset_on nulls last;
--
-- ROLL BACK THE APP CODE FIRST. useLabResults and useInjuries read these
-- tables; dropping them under a live deploy turns every Recovery visit into a
-- Sentry issue.
--
-- bp_readings is NOT dropped (015 owns it); only its anon grant is restored
-- to the Supabase default it had before 016. Run 015's rollback after this
-- one, never before.

grant all on public.bp_readings to anon;
drop table if exists public.injuries;
drop table if exists public.lab_results;
