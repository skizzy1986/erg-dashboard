-- Rollback for 013_drop_coach_messages.sql. NOT auto-applied.
--
-- RESTORES STRUCTURE ONLY. NO ROWS COME BACK. The table held 43 rows of in-app
-- coach chat history when 013 ran, and no copy exists: public.backup_snapshot()
-- has never included coach_messages (it names eight tables), so none of the
-- retained backup_snapshots rows hold it. Scott waived the snapshot
-- precondition (epic decision D5) on 2026-11-06 ("Drop without a copy") and
-- accepted the rows as lost. See coach/REORIENTATION_SLICE_SPECS.md, slice 3.
--
-- NOTHING CALLS THIS TABLE. The client was removed in #414 and the coach-chat
-- function in #415. Running this recreates an empty owner-only table that no
-- code reads or writes; the only reason to run it is to undo 013 itself.
--
-- Recreates the shape read back from production on 2026-11-06 before the drop,
-- which matched 002_coach_messages.sql, including the role check, the foreign
-- key to auth.users and the owner policy. Table grants were the Supabase
-- defaults, which CREATE TABLE in public re-applies, so none are written here.
-- The index name cannot carry a schema (Postgres creates an index in its
-- table's schema), so ON qualifies it.

CREATE TABLE IF NOT EXISTS public.coach_messages (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null default auth.uid(),
  role        text not null check (role in ('user', 'assistant')),
  content     text not null,
  model       text,
  created_at  timestamptz default now()
);

ALTER TABLE public.coach_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS coach_messages_owner ON public.coach_messages;
CREATE POLICY coach_messages_owner
  ON public.coach_messages FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS coach_messages_user_created
  ON public.coach_messages (user_id, created_at DESC);
