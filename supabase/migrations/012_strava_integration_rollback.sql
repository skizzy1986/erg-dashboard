-- Rollback for 012_strava_integration.sql. NOT auto-applied.
--
-- UNDEPLOY THE EDGE FUNCTIONS FIRST. strava-connect, strava-oauth-callback,
-- strava-import and strava-sync all call these tables and RPCs. Dropping them
-- while the functions are live turns the cron into a nightly Sentry issue and
-- turns the Connect button into an opaque 500. Run
--   supabase functions delete strava-import strava-sync strava-connect strava-oauth-callback
-- (or at minimum disable the cron job) before this.
--
-- DEAUTHORIZE AT STRAVA BEFORE DROPPING strava_tokens. Deleting the row does
-- not revoke the grant on Strava's side — it only destroys our copy of the
-- refresh token, leaving an app authorisation on Scott's Strava account that
-- nothing can now revoke programmatically. Either hit disconnect in the app
-- first, or revoke manually at https://www.strava.com/settings/apps.
--
-- DATA LOSS: strava_sync_state carries backfill_cursor_before, incremental_after
-- and ambiguous_activity_ids. Dropping it discards the record of which
-- activities the adoption pass refused to guess on. Export it first if the
-- ambiguous list has not been resolved:
--   select user_id, ambiguous_activity_ids from public.strava_sync_state;
--
-- Order matters: the functions reference the tables and
-- public.sessions.strava_activity_id, so they go first. Run 011's rollback
-- after this one, never before.

DROP FUNCTION IF EXISTS public.adopt_strava_session(uuid,bigint,bigint,int,boolean,int);
DROP FUNCTION IF EXISTS public.upsert_strava_session(uuid,bigint,text,text,text,text,int,int,int);

DROP POLICY IF EXISTS strava_sync_state_owner_select ON public.strava_sync_state;

DROP TABLE IF EXISTS public.strava_sync_state;
DROP TABLE IF EXISTS public.strava_oauth_state;
DROP TABLE IF EXISTS public.strava_tokens;
