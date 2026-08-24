import {
  COMPLETED_STATUSES,
  CANCELLED_STATUS,
} from '../constants/sessionStatus.js';

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

// Was this session decided against? A deviation worth showing on the calendar,
// never one worth counting. Strict equality against the single allowed
// spelling — same fail-closed posture as isCompletedStatus, so an unknown value
// is not silently rendered as a cancellation.
export function isCancelledStatus(status) {
  return status === CANCELLED_STATUS;
}
