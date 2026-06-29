-- 004_vitals_column_renames.sql
-- Sync migration repo with the live DB state.
-- The live vitals table was altered outside migrations to add unit suffixes to
-- column names, add readiness/soreness/notes columns, and install the
-- upsert_vital RPC. This migration is idempotent — safe to run against a DB
-- that already has the new column names or against a fresh DB that has the old ones.

-- Rename columns to include unit suffixes (only if the old names still exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'vitals' AND column_name = 'rhr'
  ) THEN
    ALTER TABLE public.vitals RENAME COLUMN rhr TO rhr_bpm;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'vitals' AND column_name = 'hrv'
  ) THEN
    ALTER TABLE public.vitals RENAME COLUMN hrv TO hrv_ms;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'vitals' AND column_name = 'sleep'
  ) THEN
    ALTER TABLE public.vitals RENAME COLUMN sleep TO sleep_hours;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'vitals' AND column_name = 'bodyweight'
  ) THEN
    ALTER TABLE public.vitals RENAME COLUMN bodyweight TO bodyweight_kg;
  END IF;
END $$;

-- Add type constraints on the renamed columns
ALTER TABLE public.vitals
  ALTER COLUMN rhr_bpm TYPE integer USING rhr_bpm::integer,
  ALTER COLUMN hrv_ms TYPE integer USING hrv_ms::integer;

-- Drop sleep_score (added in 003 but not used in practice)
ALTER TABLE public.vitals DROP COLUMN IF EXISTS sleep_score;

-- Add wellbeing and annotation columns present in the live DB
ALTER TABLE public.vitals
  ADD COLUMN IF NOT EXISTS readiness smallint CHECK (readiness IS NULL OR readiness BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS soreness smallint CHECK (soreness IS NULL OR soreness BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS notes text;

-- Add check constraints on numeric columns
ALTER TABLE public.vitals
  DROP CONSTRAINT IF EXISTS vitals_rhr_bpm_check,
  ADD CONSTRAINT vitals_rhr_bpm_check CHECK (rhr_bpm IS NULL OR rhr_bpm BETWEEN 30 AND 120);

ALTER TABLE public.vitals
  DROP CONSTRAINT IF EXISTS vitals_hrv_ms_check,
  ADD CONSTRAINT vitals_hrv_ms_check CHECK (hrv_ms IS NULL OR hrv_ms BETWEEN 0 AND 300);

ALTER TABLE public.vitals
  DROP CONSTRAINT IF EXISTS vitals_sleep_hours_check,
  ADD CONSTRAINT vitals_sleep_hours_check CHECK (sleep_hours IS NULL OR sleep_hours BETWEEN 0 AND 24);

ALTER TABLE public.vitals
  DROP CONSTRAINT IF EXISTS vitals_bodyweight_kg_check,
  ADD CONSTRAINT vitals_bodyweight_kg_check CHECK (bodyweight_kg IS NULL OR bodyweight_kg BETWEEN 40 AND 200);

-- Unique constraint on (user_id, date) — required for the upsert_vital ON CONFLICT clause
ALTER TABLE public.vitals
  DROP CONSTRAINT IF EXISTS vitals_user_date_unique;
ALTER TABLE public.vitals
  ADD CONSTRAINT vitals_user_date_unique UNIQUE (user_id, date);

-- Install upsert_vital RPC: idempotent upsert preserving existing values via COALESCE
CREATE OR REPLACE FUNCTION public.upsert_vital(
  p_user_id    uuid,
  p_date       date,
  p_rhr        integer,
  p_hrv        integer,
  p_sleep      numeric,
  p_bodyweight numeric,
  p_source     text DEFAULT 'health_export'
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  INSERT INTO public.vitals (user_id, date, rhr_bpm, hrv_ms, sleep_hours, bodyweight_kg, source)
  VALUES (p_user_id, p_date, p_rhr, p_hrv, p_sleep, p_bodyweight, p_source)
  ON CONFLICT (user_id, date) DO UPDATE SET
    rhr_bpm       = COALESCE(EXCLUDED.rhr_bpm,       public.vitals.rhr_bpm),
    hrv_ms        = COALESCE(EXCLUDED.hrv_ms,        public.vitals.hrv_ms),
    sleep_hours   = COALESCE(EXCLUDED.sleep_hours,   public.vitals.sleep_hours),
    bodyweight_kg = COALESCE(EXCLUDED.bodyweight_kg, public.vitals.bodyweight_kg);
$$;
