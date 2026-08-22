-- 009_sessions_benchmark_key.sql
-- Additive + reversible. Gives sessions an explicit link to a season-ladder
-- benchmark (#188), replacing the keyword-guessing resolver: a benchmark is
-- "done" only when a completed session carries its slug here, never because of
-- what words happen to appear in a session label.
--
-- Nullable, no default, no FK (the ladder is a git-committed JS constant, not a
-- table) and deliberately NO CHECK on the value set: a CHECK would force a
-- migration on every ladder rename, and an unrecognised key is already inert -
-- it matches no ladder entry, so the benchmark simply stays due.
--
-- RLS is untouched. The four owner policies on public.sessions
-- (001_enable_rls.sql:29-46) are column-agnostic, so the new column is covered
-- from day one with zero policy edits.

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS benchmark_key text;

COMMENT ON COLUMN public.sessions.benchmark_key IS
  'Explicit link to a season-ladder benchmark (#188). The canonical slug list is '
  'EVENT_LADDER in web/src/constants/schedule.js - the `key` field on the '
  'kind=benchmark entries: cp-test-1, cp-test-2, 5k-tt, 2k-test, tune-ups. A '
  'value outside that list is inert: it matches no ladder entry, so the '
  'benchmark stays due and nothing breaks. At most one non-null row per user may '
  'hold each value - enforced by sessions_one_session_per_benchmark.';

-- AC4, the half that survives a Coach-over-MCP write: a duplicate link raises
-- 23505 at the database rather than silently producing an ambiguous badge.
-- Partial, mirroring anchors_one_live_per_key (006_context_store.sql:56-57), so
-- every currently-unlinked row sits outside the predicate and the index cannot
-- fail on existing data.
CREATE UNIQUE INDEX IF NOT EXISTS sessions_one_session_per_benchmark
  ON public.sessions (user_id, benchmark_key)
  WHERE benchmark_key IS NOT NULL;
