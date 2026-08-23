-- Rollback for 010_sessions_status_constraint.sql. NOT auto-applied.
--
-- REVERT THE VERCEL DEPLOY FIRST. The frontend that ships with 010 removes its
-- null-tolerance: utils/sessionStatus.js used to return true for a null status
-- (treating legacy rows as completed) and no longer does. Drop the constraints
-- while that build is live and any NULL-status row that appears afterwards is
-- silently excluded from loggedSessions - it vanishes from the Log, the recent-4
-- list and every CTL/ATL/TSB figure, with no error anywhere. Roll the deploy back
-- to a build whose isCompletedStatus still admits null, THEN run this.
--
-- Order matters in the other direction to the forward migration: drop the CHECK
-- before re-allowing NULL, or the DROP NOT NULL leaves a window where a NULL can
-- be written that the still-present CHECK would reject anyway.

ALTER TABLE public.sessions
  DROP CONSTRAINT IF EXISTS sessions_status_known;

ALTER TABLE public.sessions
  ALTER COLUMN status DROP NOT NULL;

COMMENT ON COLUMN public.sessions.status IS NULL;
