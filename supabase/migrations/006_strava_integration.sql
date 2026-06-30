-- 006_strava_integration.sql
-- Strava activity import (issue #54). Additive and idempotent.
-- Adds two tables (integration_tokens, strava_activities) and two RPCs
-- (upsert_integration_token, upsert_strava_session). Edge functions run with the
-- service role (auth.uid() is null), so they set user_id explicitly on every row
-- and write only through these SECURITY DEFINER RPCs. RLS exposes SELECT to the
-- owner only; OAuth tokens are never readable by anon and never written by clients.

-- integration_tokens: OAuth credentials per provider. Service-role writes only.
CREATE TABLE IF NOT EXISTS public.integration_tokens (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) not null,
  provider      text not null,
  access_token  text not null,
  refresh_token text not null,
  expires_at    timestamptz not null,
  scope         text,
  athlete_id    bigint,
  updated_at    timestamptz default now() not null
);

ALTER TABLE public.integration_tokens
  DROP CONSTRAINT IF EXISTS integration_tokens_user_provider_unique;
ALTER TABLE public.integration_tokens
  ADD CONSTRAINT integration_tokens_user_provider_unique UNIQUE (user_id, provider);

-- strava_activities: dedup ledger linking a Strava activity to its sessions row.
CREATE TABLE IF NOT EXISTS public.strava_activities (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid references auth.users(id) not null,
  strava_activity_id bigint not null,
  session_id         uuid references public.sessions(id) on delete set null,
  sport_type         text,
  start_date         timestamptz,
  raw                jsonb,
  last_synced_at     timestamptz default now() not null,
  created_at         timestamptz default now() not null
);

ALTER TABLE public.strava_activities
  DROP CONSTRAINT IF EXISTS strava_activities_user_activity_unique;
ALTER TABLE public.strava_activities
  ADD CONSTRAINT strava_activities_user_activity_unique UNIQUE (user_id, strava_activity_id);

CREATE INDEX IF NOT EXISTS strava_activities_user_start_idx
  ON public.strava_activities (user_id, start_date DESC);

-- RLS: owner SELECT only. No client INSERT/UPDATE/DELETE — the service role
-- bypasses RLS and is the only writer (via the RPCs below).
ALTER TABLE public.integration_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strava_activities  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS integration_tokens_select_own ON public.integration_tokens;
CREATE POLICY integration_tokens_select_own ON public.integration_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS strava_activities_select_own ON public.strava_activities;
CREATE POLICY strava_activities_select_own ON public.strava_activities
  FOR SELECT
  USING (auth.uid() = user_id);

-- upsert_integration_token: store/rotate an OAuth token for (user_id, provider).
CREATE OR REPLACE FUNCTION public.upsert_integration_token(
  p_user_id       uuid,
  p_provider      text,
  p_access_token  text,
  p_refresh_token text,
  p_expires_at    timestamptz,
  p_scope         text,
  p_athlete_id    bigint
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  INSERT INTO public.integration_tokens
    (user_id, provider, access_token, refresh_token, expires_at, scope, athlete_id, updated_at)
  VALUES
    (p_user_id, p_provider, p_access_token, p_refresh_token, p_expires_at, p_scope, p_athlete_id, now())
  ON CONFLICT (user_id, provider) DO UPDATE SET
    access_token  = EXCLUDED.access_token,
    refresh_token = EXCLUDED.refresh_token,
    expires_at    = EXCLUDED.expires_at,
    scope         = EXCLUDED.scope,
    athlete_id    = EXCLUDED.athlete_id,
    updated_at    = now();
$$;

-- upsert_strava_session: idempotently project a mapped Strava activity into the
-- sessions table and record the link in strava_activities. Returns the session id.
-- Re-running updates the existing session's metrics (COALESCE — never null-wipes)
-- without disturbing srpe/exercises/prs/status, and preserves a user-set label.
CREATE OR REPLACE FUNCTION public.upsert_strava_session(
  p_user_id            uuid,
  p_strava_activity_id bigint,
  p_date               date,
  p_type               text,
  p_label              text,
  p_duration           text,
  p_avg_watts          numeric,
  p_avg_hr             numeric,
  p_distance_m         numeric,
  p_sport_type         text,
  p_start_date         timestamptz,
  p_raw                jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_session_id uuid;
BEGIN
  SELECT session_id INTO v_session_id
    FROM public.strava_activities
    WHERE user_id = p_user_id AND strava_activity_id = p_strava_activity_id;

  IF v_session_id IS NOT NULL THEN
    UPDATE public.sessions SET
      avg_watts  = COALESCE(p_avg_watts,  sessions.avg_watts),
      avg_hr     = COALESCE(p_avg_hr,     sessions.avg_hr),
      distance_m = COALESCE(p_distance_m, sessions.distance_m),
      duration   = COALESCE(p_duration,   sessions.duration),
      date       = p_date,
      type       = p_type,
      source     = 'strava',
      label      = COALESCE(sessions.label, p_label)
    WHERE id = v_session_id;
  ELSE
    INSERT INTO public.sessions
      (user_id, date, type, label, duration, avg_watts, avg_hr, distance_m, source, status)
    VALUES
      (p_user_id, p_date, p_type, p_label, p_duration, p_avg_watts, p_avg_hr, p_distance_m, 'strava', 'logged')
    RETURNING id INTO v_session_id;
  END IF;

  INSERT INTO public.strava_activities
    (user_id, strava_activity_id, session_id, sport_type, start_date, raw, last_synced_at)
  VALUES
    (p_user_id, p_strava_activity_id, v_session_id, p_sport_type, p_start_date, p_raw, now())
  ON CONFLICT (user_id, strava_activity_id) DO UPDATE SET
    session_id     = v_session_id,
    sport_type     = EXCLUDED.sport_type,
    start_date     = EXCLUDED.start_date,
    raw            = EXCLUDED.raw,
    last_synced_at = now();

  RETURN v_session_id;
END;
$$;
