-- 010_sessions_status_constraint.sql
-- Additive + reversible. Closes the gap that let sessions.status hold anything at
-- all: the column was plain nullable text with no CHECK, so a Coach MCP typo, a
-- hand edit in the Supabase dashboard, or a future write path inventing 'skipped'
-- would all be accepted silently.
--
-- Consumers already fail closed on an unknown value (utils/sessionStatus.js is an
-- allow-list, useTSSHistory filters server-side with .in(...)), so a bad value
-- makes a session go visibly missing rather than counting as phantom training.
-- That is a mitigation, not a fix - the hazard is that the column accepts it.
--
-- Safe on current data, verified before writing rather than assumed: 92 rows,
-- four distinct statuses (actual 35, cancelled 32, completed 23, planned 2), and
-- ZERO nulls. Every row already satisfies both constraints below.
--
-- No writer breaks either. All three insert paths already name a status:
--   web/src/components/LogSessionForm.jsx:81  -> 'completed' (since #221)
--   web/src/views/ErgLiveView.jsx             -> 'logged'
--   web/src/hooks/useOfflineQueue.js:75       -> spreads the ErgLiveView row
--
-- RLS is untouched. The four owner policies on public.sessions
-- (001_enable_rls.sql:29-46) are column-agnostic, so nothing here needs a policy
-- edit.

-- Deliberately NO DEFAULT. A default is the exact failure this migration exists
-- to close: a write path that forgets `status` would land silently as phantom
-- training ('completed') or a phantom prescription ('planned') instead of raising.
-- Every current writer states its intent explicitly; not-null-without-default
-- forces the next one to do the same.
ALTER TABLE public.sessions
  ALTER COLUMN status SET NOT NULL;

-- Added VALID in one step, not NOT VALID + VALIDATE. All 92 rows conform and the
-- scan is trivial, so the two-step form would buy nothing and leave a second step
-- to forget. (sessions_date_parseable is NOT VALID for the opposite reason - it
-- was added over data that could not all be guaranteed to pass.)
ALTER TABLE public.sessions
  ADD CONSTRAINT sessions_status_known
  CHECK (status IN ('actual', 'completed', 'logged', 'planned', 'cancelled'));

COMMENT ON COLUMN public.sessions.status IS
  'Lifecycle of the session. The canonical list lives in '
  'web/src/constants/sessionStatus.js and MUST stay in step with the '
  'sessions_status_known CHECK: COMPLETED_STATUSES = actual | completed | logged '
  '(all three mean it happened - actual/completed are bulk-imported history, '
  'logged is written by the live PM5 Bluetooth save path), PLANNED_STATUS = '
  'planned (a forward-looking prescription, never counts as done), and cancelled '
  '(a decision worth seeing in the Log but never counted as training). Adding a '
  'sixth value means editing both this constraint and that constants file.';
