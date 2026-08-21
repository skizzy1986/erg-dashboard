-- Rollback for 008_sessions_date_iso.sql. NOT auto-applied.
--
-- Revert the Vercel deploy FIRST. A client carrying .order('date_iso') against a
-- schema without the column gets a PostgREST 400 on every sessions read.
-- The function can only be dropped after its two dependants.

ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS sessions_date_parseable;
DROP INDEX IF EXISTS public.sessions_user_id_date_iso_desc_idx;
ALTER TABLE public.sessions DROP COLUMN IF EXISTS date_iso;
DROP FUNCTION IF EXISTS public.session_date_to_iso(text);
