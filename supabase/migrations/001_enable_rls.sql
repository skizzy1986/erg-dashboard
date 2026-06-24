-- 001_enable_rls.sql
-- Enable Row Level Security and add owner policies. Re-runnable.
--
-- The "8 policies" referenced in the spec are the owner policies on
-- sessions + vitals (4 each). The exercises table is a shared reference
-- table; it gets RLS enabled plus a single authenticated-read policy so it
-- remains readable (without it, RLS would make the table unreadable).

-- 1. Backfill user_id on existing rows BEFORE enabling RLS so no data is
--    orphaned. Single-user app: assign to the earliest (only) auth user.
UPDATE sessions
  SET user_id = (SELECT id FROM auth.users ORDER BY created_at LIMIT 1)
  WHERE user_id IS NULL;

UPDATE vitals
  SET user_id = (SELECT id FROM auth.users ORDER BY created_at LIMIT 1)
  WHERE user_id IS NULL;

-- 2. Enable RLS on all three tables.
ALTER TABLE sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE vitals    ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

-- 3. Owner policies (8 total: 4 sessions + 4 vitals).

-- sessions ---------------------------------------------------------------
DROP POLICY IF EXISTS sessions_select_own ON sessions;
CREATE POLICY sessions_select_own ON sessions
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS sessions_insert_own ON sessions;
CREATE POLICY sessions_insert_own ON sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS sessions_update_own ON sessions;
CREATE POLICY sessions_update_own ON sessions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS sessions_delete_own ON sessions;
CREATE POLICY sessions_delete_own ON sessions
  FOR DELETE
  USING (auth.uid() = user_id);

-- vitals -----------------------------------------------------------------
DROP POLICY IF EXISTS vitals_select_own ON vitals;
CREATE POLICY vitals_select_own ON vitals
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS vitals_insert_own ON vitals;
CREATE POLICY vitals_insert_own ON vitals
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS vitals_update_own ON vitals;
CREATE POLICY vitals_update_own ON vitals
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS vitals_delete_own ON vitals;
CREATE POLICY vitals_delete_own ON vitals
  FOR DELETE
  USING (auth.uid() = user_id);

-- exercises (shared reference table): authenticated read only.
-- Not counted in the 8 owner policies above.
DROP POLICY IF EXISTS exercises_select_authenticated ON exercises;
CREATE POLICY exercises_select_authenticated ON exercises
  FOR SELECT
  TO authenticated
  USING (true);
