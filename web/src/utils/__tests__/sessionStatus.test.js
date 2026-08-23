import { describe, it, expect } from 'vitest';
import { COMPLETED_STATUSES } from '../../constants/sessionStatus.js';
import { isCompletedStatus } from '../sessionStatus.js';

describe('isCompletedStatus', () => {
  it('AC3 treats null and undefined as completed (LogSessionForm writes no status)', () => {
    expect(isCompletedStatus(null)).toBe(true);
    expect(isCompletedStatus(undefined)).toBe(true);
  });

  it.each(COMPLETED_STATUSES)('AC4 counts a %s session', (status) => {
    expect(isCompletedStatus(status)).toBe(true);
  });

  it('AC5 fails CLOSED on an unknown status — deliberate, not an oversight', () => {
    // sessions.status has no CHECK constraint, so an unknown sixth value can
    // appear. Excluding it hides the session loudly rather than counting
    // phantom training silently.
    expect(isCompletedStatus('skipped')).toBe(false);
    expect(isCompletedStatus('')).toBe(false);
  });

  it('AC6 does not count planned or cancelled', () => {
    expect(isCompletedStatus('planned')).toBe(false);
    expect(isCompletedStatus('cancelled')).toBe(false);
  });
});
