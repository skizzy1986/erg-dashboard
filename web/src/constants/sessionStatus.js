// Session statuses that represent a session that actually happened (as
// opposed to 'planned' or 'cancelled'). Historical bulk-imported data uses
// 'actual'/'completed'; the live PM5 Bluetooth save path (ErgLiveView.jsx)
// writes 'logged'. All three must count as "done" for TSS/CTL/ATL/TSB, or
// newly-logged sessions silently vanish from training-load calculations.
export const COMPLETED_STATUSES = ['actual', 'completed', 'logged'];
