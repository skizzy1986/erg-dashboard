-- Rollback for 014_vitals_nutrition_intake.sql. NOT auto-applied.
--
-- Revert the Vercel deploy first if the shipped client selects these columns
-- (useNutritionDays): PostgREST answers 400 on the whole vitals read when a
-- named column is missing, which blanks the nutrition card rather than just
-- emptying it.
--
-- DATA LOSS WARNING: dropping the columns discards every logged intake day, and
-- that history is not in git (by design). Export first:
--   select date, intake_kcal, intake_protein_g, intake_carbs_g, intake_fat_g,
--          nutrition_day_type, nutrition_note
--   from public.vitals where intake_kcal is not null order by date;
--
-- The column CHECK constraints are dropped with their columns. The health
-- columns and the upsert_vital RPC are untouched.

alter table public.vitals
  drop column if exists nutrition_note,
  drop column if exists nutrition_day_type,
  drop column if exists intake_fat_g,
  drop column if exists intake_carbs_g,
  drop column if exists intake_protein_g,
  drop column if exists intake_kcal;
