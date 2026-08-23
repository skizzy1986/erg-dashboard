import { COMPLETED_STATUSES } from '../constants/sessionStatus.js';

// Does this session's status mean "training that actually happened"?
//
// A pure allow-list. null/undefined is NOT admitted: migration 010 made
// sessions.status NOT NULL behind a CHECK constraint, so the database can no
// longer produce one. The branch that used to admit null was justified by
// LogSessionForm inserting without a `status` field — #221 made it write
// 'completed' explicitly (LogSessionForm.jsx:81), which left the branch dead
// before the constraint removed the last way to reach it.
//
// Failing closed is deliberate. An unknown value hides the session loudly —
// Scott looks for it and it is missing — rather than counting phantom training
// silently. It also matches useTSSHistory.js:17, which excludes unknown
// statuses server-side via .in('status', COMPLETED_STATUSES).
export function isCompletedStatus(status) {
  return COMPLETED_STATUSES.includes(status);
}
