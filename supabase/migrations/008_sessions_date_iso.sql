-- 008_sessions_date_iso.sql
-- Additive + reversible. Gives sessions a real DATE key derived from the legacy
-- TEXT `date`, so PostgREST .order() is chronological and .limit() selects the
-- right rows (#187). The TEXT column is untouched: every write path still writes
-- "M/D/YY" via toLogDate(), every display still reads sessions.date.
--
-- to_date(text,text) and text::date are both STABLE (DateStyle-dependent), so
-- NEITHER may appear in a generated column or an index expression. make_date,
-- split_part, text::int and the regex operator are all IMMUTABLE, so the
-- IMMUTABLE marking below is honest rather than a promise.

CREATE OR REPLACE FUNCTION public.session_date_to_iso(d text)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
STRICT
PARALLEL SAFE
-- Pinned so the body cannot be hijacked by a caller's search_path. Everything
-- it calls (make_date, split_part, the int cast, the regex operator) lives in
-- pg_catalog, which Postgres searches implicitly even when the path is empty.
SET search_path = ''
AS $$
BEGIN
  IF d ~ '^\d{1,2}/\d{1,2}/\d{2}$' THEN
    RETURN make_date(2000 + split_part(d, '/', 3)::int,
                     split_part(d, '/', 1)::int,
                     split_part(d, '/', 2)::int);
  ELSIF d ~ '^\d{4}-\d{2}-\d{2}$' THEN
    RETURN make_date(split_part(d, '-', 1)::int,
                     split_part(d, '-', 2)::int,
                     split_part(d, '-', 3)::int);
  END IF;
  RETURN NULL;
EXCEPTION
  -- "2/31/26" passes the regex but make_date raises. Never propagate: this runs
  -- inside every INSERT and every UPDATE of a sessions row, so raising here
  -- would abort a Coach-written session outright and would make any legacy bad
  -- row permanently un-updatable. The CHECK below is what makes a bad write
  -- loud; this handler is what stops it being fatal to the derivation.
  WHEN others THEN RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.session_date_to_iso(text) IS
  'IMMUTABLE parser for the legacy sessions.date TEXT format ("M/D/YY", also '
  'accepts ISO). Do NOT CREATE OR REPLACE this in place: sessions.date_iso is a '
  'STORED generated column and Postgres does not recompute stored values when a '
  'function body changes, so a replaced body silently leaves stale dates. To '
  'change it, drop the CHECK and date_iso, replace the function, re-add both.';

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS date_iso date
  GENERATED ALWAYS AS (public.session_date_to_iso(date)) STORED;

COMMENT ON COLUMN public.sessions.date_iso IS
  'Derived from sessions.date (TEXT "M/D/YY"). READ-ONLY - write `date`; an '
  'INSERT naming date_iso is rejected by Postgres. Ordering key for #187.';

CREATE INDEX IF NOT EXISTS sessions_user_id_date_iso_desc_idx
  ON public.sessions (user_id, date_iso DESC NULLS LAST);

-- NOT VALID: enforced on new INSERT/UPDATE only, existing rows are never
-- re-checked, so this cannot fail on legacy data. All 92 live rows parse today;
-- do NOT run VALIDATE CONSTRAINT - leaving it NOT VALID keeps rollback
-- unconditional rather than contingent on the data.
ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS sessions_date_parseable;
ALTER TABLE public.sessions
  ADD CONSTRAINT sessions_date_parseable
  CHECK (public.session_date_to_iso(date) IS NOT NULL) NOT VALID;
