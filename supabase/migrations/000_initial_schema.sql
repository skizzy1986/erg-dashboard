-- 000_initial_schema.sql
-- Initial schema for erg-dashboard. Additive and idempotent.
-- Reflects the columns the app already inserts at real insert sites.

-- sessions: all workouts (erg, strength, cycling, rest)
CREATE TABLE IF NOT EXISTS sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id),
  date        date not null,
  type        text not null,
  label       text,
  -- duration is kept as text on purpose: the app inserts an integer (minutes)
  -- in some places and a trimmed text string (or null) in others. Using text
  -- avoids silently dropping non-numeric values on insert.
  duration    text,
  srpe        numeric,
  exercises   jsonb default '[]'::jsonb,
  watts       numeric,
  hr          numeric,
  distance    numeric,
  status      text default 'logged',
  source      text,
  -- prs: StrengthLogger sends a value here (currently a count integer); typed
  -- as jsonb per the approved spec so it can hold structured PR data later.
  prs         jsonb,
  created_at  timestamptz default now()
);

-- vitals: daily health metrics
CREATE TABLE IF NOT EXISTS vitals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id),
  date        date not null,
  rhr         numeric,
  hrv         numeric,
  sleep       numeric,
  bodyweight  numeric,
  created_at  timestamptz default now()
);

-- exercises: shared reference table for exercise definitions (no user_id)
CREATE TABLE IF NOT EXISTS exercises (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  category    text,
  created_at  timestamptz default now()
);

-- Defensive additive columns, in case the tables somehow pre-exist without them.
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS user_id uuid references auth.users(id);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS prs jsonb;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE vitals   ADD COLUMN IF NOT EXISTS user_id uuid references auth.users(id);
