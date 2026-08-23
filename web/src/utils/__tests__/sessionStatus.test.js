import { describe, it, expect } from 'vitest';
import { COMPLETED_STATUSES } from '../../constants/sessionStatus.js';
import { isCompletedStatus } from '../sessionStatus.js';

describe('isCompletedStatus', () => {
  it('AC3 does NOT treat null or undefined as completed', () => {
    // This inverted with migration 010. The branch admitting null existed
    // because LogSessionForm inserted without a `status` field; #221 made it
    // write 'completed' explicitly, and 010 made sessions.status NOT NULL
    // behind a CHECK, so the database cannot produce one at all.
    expect(isCompletedStatus(null)).toBe(false);
    expect(isCompletedStatus(undefined)).toBe(false);
  });

  it.each(COMPLETED_STATUSES)('AC4 counts a %s session', (status) => {
    expect(isCompletedStatus(status)).toBe(true);
  });

  it('AC5 fails CLOSED on an unknown status — deliberate, not an oversight', () => {
    // sessions_status_known (migration 010) now rejects a sixth value at the
    // database, but this stays the second line of defence: excluding an
    // unknown hides the session loudly rather than counting phantom training
    // silently.
    expect(isCompletedStatus('skipped')).toBe(false);
    expect(isCompletedStatus('')).toBe(false);
  });

  it('AC6 does not count planned or cancelled', () => {
    expect(isCompletedStatus('planned')).toBe(false);
    expect(isCompletedStatus('cancelled')).toBe(false);
  });
});
