-- 011_sessions_strava_activity_id.sql
-- Additive + reversible. Gives sessions the identity key the Strava importer
-- deduplicates on (#54). Nothing else in the schema changes and no existing row
-- is touched: the column is nullable and every current row keeps NULL, which is
-- exactly what marks a row as "not yet linked to a Strava activity" and so makes
-- it a candidate for the adoption pass.
--
-- bigint, not integer, and this is not a style preference. A live activity id in
-- Scott's account is 19859099686 — eleven digits, comfortably past 2^31-1
-- (2147483647). An integer column would reject every real import with a numeric
-- overflow.
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS strava_activity_id bigint;

COMMENT ON COLUMN public.sessions.strava_activity_id IS
  'Strava activity id this session was imported from, or adopted onto. NULL on '
  'every hand-logged / coach-written / bulk-imported row, which is what makes '
  'that row eligible for the importer''s adoption pass. bigint because live ids '
  'are 11 digits. Written only by public.upsert_strava_session and '
  'public.adopt_strava_session.';

-- PARTIAL unique index. The predicate is what lets ~90 existing rows all hold
-- NULL without colliding, while still making a second import of the same
-- activity impossible.
--
-- Consequence to know about before writing any client code: PostgREST's
-- `on_conflict=` cannot target a partial index, so an upsert through
-- supabase-js against this constraint would fail. That is deliberate and it is
-- not a problem here, because every write goes through the SECURITY DEFINER
-- RPCs added in 012, which spell the predicate out in explicit SQL:
--   ON CONFLICT (user_id, strava_activity_id) WHERE strava_activity_id IS NOT NULL
CREATE UNIQUE INDEX IF NOT EXISTS sessions_user_strava_activity_key
  ON public.sessions (user_id, strava_activity_id)
  WHERE strava_activity_id IS NOT NULL;
