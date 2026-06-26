-- 003_add_vitals_columns.sql
-- Additive columns missing from the initial schema.
-- Both are ADD COLUMN IF NOT EXISTS — idempotent and safe to re-run.

-- source: used by both vitals-import and vitals-import-api RPCs to record the ingestion path.
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS source text;

-- sleep_score: referenced in app code; remains null until a data source provides it.
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS sleep_score numeric;
