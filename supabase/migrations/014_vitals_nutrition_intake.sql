-- 014_vitals_nutrition_intake.sql
-- Additive + reversible. Daily nutrition intake moves out of the committed
-- front-end constants and onto public.vitals, alongside the day's burn
-- (calories_kcal) and bodyweight (bodyweight_kg) it is judged against.
-- OverviewView reads them through useNutritionDays and judges each day against
-- the live `nutrition_targets` anchor, so no target value lives in schema or
-- code either.
--
-- Every column is nullable and no existing row is touched. The live
-- upsert_vital RPC (vitals-import / vitals-import-api) SETs only the health
-- columns, each wrapped in COALESCE, so it neither writes nor clears these:
-- the nightly import and a manually-logged intake for the same date coexist on
-- one (user_id, date) row.
--
-- Schema only — no seed. Historical intake is loaded separately and read back.
--
-- The kcal CHECK is a typo guard, not a dietary limit. day_type matches the
-- three keys of the nutrition_targets anchor.

alter table public.vitals
  add column if not exists intake_kcal        integer check (intake_kcal between 0 and 10000),
  add column if not exists intake_protein_g   numeric(5,1),
  add column if not exists intake_carbs_g     numeric(5,1),
  add column if not exists intake_fat_g       numeric(5,1),
  add column if not exists nutrition_day_type text check (nutrition_day_type in ('two-a-day','training','rest')),
  add column if not exists nutrition_note     text;

comment on column public.vitals.intake_kcal is
  'Energy eaten that day (kcal). NULL = not logged — distinct from 0. Burn is '
  'calories_kcal on the same row.';
comment on column public.vitals.nutrition_day_type is
  'Which nutrition_targets bucket the day is judged against: two-a-day, '
  'training or rest.';
