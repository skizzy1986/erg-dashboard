-- 005_rename_sessions_columns.sql
-- Sync migration repo with the live DB state.
-- The live sessions table was altered outside migrations to rename 'watts' to
-- 'avg_watts' and 'distance' to 'distance_m' for clarity. This migration is
-- idempotent — safe to run against a DB that already has the new names or
-- against a fresh DB that still has the old names from 000_initial_schema.sql.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sessions' AND column_name = 'watts'
  ) THEN
    ALTER TABLE public.sessions RENAME COLUMN watts TO avg_watts;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sessions' AND column_name = 'distance'
  ) THEN
    ALTER TABLE public.sessions RENAME COLUMN distance TO distance_m;
  END IF;
END $$;
