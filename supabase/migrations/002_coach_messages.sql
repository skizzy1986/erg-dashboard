-- 002_coach_messages.sql
-- Chat history table for the Claude fitness coach feature.
-- Messages are owner-only via RLS; no shared/public access.

CREATE TABLE IF NOT EXISTS coach_messages (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null default auth.uid(),
  role        text not null check (role in ('user', 'assistant')),
  content     text not null,
  model       text,
  created_at  timestamptz default now()
);

ALTER TABLE coach_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS coach_messages_owner ON coach_messages;
CREATE POLICY coach_messages_owner
  ON coach_messages FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS coach_messages_user_created
  ON coach_messages (user_id, created_at DESC);
