// Session statuses that represent a session that actually happened (as
// opposed to 'planned' or 'cancelled'). Historical bulk-imported data uses
// 'actual'/'completed'; the live PM5 Bluetooth save path (ErgLiveView.jsx)
// writes 'logged'. All three must count as "done" for TSS/CTL/ATL/TSB, or
// newly-logged sessions silently vanish from training-load calculations.
export const COMPLETED_STATUSES = ['actual', 'completed', 'logged'];

// A forward-looking prescription — a session Scott intends to do, not one that
// happened. Deliberately NOT in COMPLETED_STATUSES: it must never clear a
// benchmark, only reschedule one.
export const PLANNED_STATUS = 'planned';
