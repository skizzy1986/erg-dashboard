-- Rollback for 009_sessions_benchmark_key.sql. NOT auto-applied.
--
-- Revert the Vercel deploy FIRST. A client whose .select() names benchmark_key
-- against a schema without the column gets a PostgREST 400 on every sessions
-- read - which is not just a lost link, it blanks every benchmark badge.
--
-- Order matters: the index is built on the column, so it goes first.

DROP INDEX IF EXISTS public.sessions_one_session_per_benchmark;
ALTER TABLE public.sessions DROP COLUMN IF EXISTS benchmark_key;
