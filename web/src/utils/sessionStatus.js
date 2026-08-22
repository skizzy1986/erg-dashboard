import { COMPLETED_STATUSES } from '../constants/sessionStatus.js';

// Does this session's status mean "training that actually happened"?
//
// null/undefined is admitted, and that branch is LOAD-BEARING — not defensive
// padding. LogSessionForm.jsx:72-81 inserts a session without naming a `status`
// field at all, so every session Scott saves through the app's own "Log Session"
// form lands with status NULL. A pure COMPLETED_STATUSES.includes() check would
// make those sessions vanish the instant they were saved.
//
// Everything else is an allow-list, not an exclude-list. There is no CHECK
// constraint on sessions.status, so an unknown sixth value can appear at any
// time; failing closed hides it loudly (Scott looks for a session and it is
// missing) rather than counting phantom training silently. It also matches
// useTSSHistory.js:17, which already excludes unknown statuses server-side via
// .in('status', COMPLETED_STATUSES).
export function isCompletedStatus(status) {
  if (status == null) return true;
  return COMPLETED_STATUSES.includes(status);
}
