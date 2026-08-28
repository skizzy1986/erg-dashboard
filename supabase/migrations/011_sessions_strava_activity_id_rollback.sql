-- Rollback for 011_sessions_strava_activity_id.sql. NOT auto-applied.
--
-- Run 012_strava_integration_rollback.sql FIRST. Both RPCs added in 012 name
-- this column, and dropping a column out from under a SECURITY DEFINER function
-- leaves the function in place but failing at runtime with a bare "column does
-- not exist" the moment anything calls it.
--
-- Revert the Vercel deploy too if any shipped client .select()s
-- strava_activity_id — PostgREST answers 400 on the whole sessions read when a
-- named column is missing, which blanks the Log rather than just the Strava
-- badge (the same failure mode 009's rollback note describes).
--
-- Order matters: the index is built on the column, so it goes first.
--
-- DATA LOSS WARNING: dropping the column discards the activity-id links. A
-- re-import afterwards has no way to know which sessions were already imported
-- or adopted, so it will insert duplicates of every one of them and double the
-- affected CTL/ATL/TSB. Do not run this on a database that has imported rows
-- without first exporting `select id, strava_activity_id from public.sessions
-- where strava_activity_id is not null`.

DROP INDEX IF EXISTS public.sessions_user_strava_activity_key;
ALTER TABLE public.sessions DROP COLUMN IF EXISTS strava_activity_id;
