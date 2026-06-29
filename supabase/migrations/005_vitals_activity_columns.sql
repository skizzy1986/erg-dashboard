-- 005_vitals_activity_columns.sql
-- Add daily activity metrics from Google Health API (steps, distance, active minutes, calories).
-- Idempotent: safe to re-run against a DB that already has these columns.

ALTER TABLE public.vitals
  ADD COLUMN IF NOT EXISTS steps_count   integer,
  ADD COLUMN IF NOT EXISTS distance_m    numeric,
  ADD COLUMN IF NOT EXISTS active_minutes integer,
  ADD COLUMN IF NOT EXISTS calories_kcal integer;

ALTER TABLE public.vitals
  DROP CONSTRAINT IF EXISTS vitals_steps_count_check,
  ADD CONSTRAINT vitals_steps_count_check CHECK (steps_count IS NULL OR steps_count BETWEEN 0 AND 100000);

ALTER TABLE public.vitals
  DROP CONSTRAINT IF EXISTS vitals_distance_m_check,
  ADD CONSTRAINT vitals_distance_m_check CHECK (distance_m IS NULL OR distance_m BETWEEN 0 AND 200000);

ALTER TABLE public.vitals
  DROP CONSTRAINT IF EXISTS vitals_active_minutes_check,
  ADD CONSTRAINT vitals_active_minutes_check CHECK (active_minutes IS NULL OR active_minutes BETWEEN 0 AND 1440);

ALTER TABLE public.vitals
  DROP CONSTRAINT IF EXISTS vitals_calories_kcal_check,
  ADD CONSTRAINT vitals_calories_kcal_check CHECK (calories_kcal IS NULL OR calories_kcal BETWEEN 0 AND 20000);

-- Drop existing 7-arg upsert_vital and recreate with 4 new optional params.
-- CREATE OR REPLACE cannot add parameters; must drop by exact signature.
DROP FUNCTION IF EXISTS public.upsert_vital(uuid, date, integer, integer, numeric, numeric, text);

CREATE FUNCTION public.upsert_vital(
  p_user_id    uuid,
  p_date       date,
  p_rhr        integer,
  p_hrv        integer,
  p_sleep      numeric,
  p_bodyweight numeric,
  p_source     text    DEFAULT 'health_export',
  p_steps      integer DEFAULT NULL,
  p_distance   numeric DEFAULT NULL,
  p_active_min integer DEFAULT NULL,
  p_calories   integer DEFAULT NULL
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  INSERT INTO public.vitals (user_id, date, rhr_bpm, hrv_ms, sleep_hours, bodyweight_kg, source, steps_count, distance_m, active_minutes, calories_kcal)
  VALUES (p_user_id, p_date, p_rhr, p_hrv, p_sleep, p_bodyweight, p_source, p_steps, p_distance, p_active_min, p_calories)
  ON CONFLICT (user_id, date) DO UPDATE SET
    rhr_bpm        = COALESCE(EXCLUDED.rhr_bpm,        public.vitals.rhr_bpm),
    hrv_ms         = COALESCE(EXCLUDED.hrv_ms,         public.vitals.hrv_ms),
    sleep_hours    = COALESCE(EXCLUDED.sleep_hours,    public.vitals.sleep_hours),
    bodyweight_kg  = COALESCE(EXCLUDED.bodyweight_kg,  public.vitals.bodyweight_kg),
    steps_count    = COALESCE(EXCLUDED.steps_count,    public.vitals.steps_count),
    distance_m     = COALESCE(EXCLUDED.distance_m,     public.vitals.distance_m),
    active_minutes = COALESCE(EXCLUDED.active_minutes, public.vitals.active_minutes),
    calories_kcal  = COALESCE(EXCLUDED.calories_kcal,  public.vitals.calories_kcal);
$$;
