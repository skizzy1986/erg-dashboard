import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const fromMock = vi.fn();

vi.mock('../../supabaseClient.js', () => ({
  supabase: {
    from: (...args) => fromMock(...args),
  },
}));

import { useSessionLog } from '../useSessionLog.js';

function mockQuery(data, error = null) {
  const chain = {
    select: () => chain,
    order: () => Promise.resolve({ data, error }),
  };
  fromMock.mockReturnValue(chain);
}

beforeEach(() => {
  fromMock.mockReset();
});

const ergRow = {
  id: 1,
  date: '06/13/26',
  type: 'erg',
  label: '10k steady',
  duration: 45,
  srpe: 6,
  prs: null,
  exercises: null,
  coach_note: 'keep it easy',
  status: 'completed',
  distance_m: 10000,
  avg_watts: 150,
  avg_hr: 135,
};

describe('useSessionLog', () => {
  it('maps rows, filters Test type, and sets dbStatus ok on success', async () => {
    mockQuery([
      ergRow,
      { id: 2, date: '06/14/26', type: 'Test', label: 'CP test' },
      {
        id: 3,
        date: '06/15/26',
        type: 'cycling',
        label: 'z2 spin',
        status: null,
      },
    ]);
    const { result } = renderHook(() => useSessionLog());
    await waitFor(() => expect(result.current.dbStatus).toBe('ok'));
    const sessions = result.current.allSessions;
    expect(sessions).toHaveLength(2);
    const erg = sessions[0];
    expect(erg.type).toBe('Z2 Aerobic');
    expect(erg.coachNote).toBe('keep it easy');
    expect(erg.exercises).toBe(undefined);
    expect(erg._isErg).toBe(true);
    expect(erg._isCycling).toBe(false);
    expect(erg._fromDb).toBe(true);
    expect(erg._id).toBe(1);
    const bike = sessions[1];
    expect(bike._isErg).toBe(false);
    expect(bike._isCycling).toBe(true);
    expect(bike.status).toBe(null);
  });

  it('sets dbStatus error and falls back to the seed on supabase error', async () => {
    mockQuery(null, { message: 'boom' });
    const { result } = renderHook(() => useSessionLog());
    await waitFor(() => expect(result.current.dbStatus).toBe('error'));
    expect(result.current.allSessions).toEqual([]);
  });

  it('splits planned vs logged and builds loggedKeys from logged only', async () => {
    mockQuery([
      {
        id: 1,
        date: '06/20/26',
        type: 'erg',
        label: 'plan',
        status: 'planned',
      },
      {
        id: 2,
        date: '06/13/26',
        type: 'erg',
        label: 'done',
        status: 'completed',
      },
      {
        id: 3,
        date: '06/12/26',
        type: 'strength',
        label: 'Upper A',
        status: null,
      },
    ]);
    const { result } = renderHook(() => useSessionLog());
    await waitFor(() => expect(result.current.dbStatus).toBe('ok'));
    expect(result.current.plannedSessions).toHaveLength(1);
    expect(result.current.plannedSessions[0]._id).toBe(1);
    expect(result.current.loggedSessions).toHaveLength(2);
    expect(result.current.loggedKeys.has('06/13/26|Z2 Aerobic')).toBe(true);
    expect(result.current.loggedKeys.has('06/12/26|Upper Strength')).toBe(true);
    expect(result.current.loggedKeys.has('06/20/26|Z2 Aerobic')).toBe(false);
  });

  it('fetchSessions refetch updates state', async () => {
    mockQuery([ergRow]);
    const { result } = renderHook(() => useSessionLog());
    await waitFor(() => expect(result.current.allSessions).toHaveLength(1));
    mockQuery([
      ergRow,
      { id: 4, date: '06/16/26', type: 'erg', label: 'new', status: 'logged' },
    ]);
    act(() => {
      result.current.fetchSessions();
    });
    await waitFor(() => expect(result.current.allSessions).toHaveLength(2));
    expect(result.current.allSessions[1]._id).toBe(4);
  });
});

// ── #194: cancelled is SHOWN but not COUNTED ──────────────────────
// Fixture mirroring the live table's status distribution as of 2026-08-22.
// Pre-fix, `loggedSessions` measured 90 here (every non-planned row), because
// the old filter read `status !== 'planned'` — "not planned" meant "done", so
// the 32 cancelled rows counted as training that never happened.
const STATUS_DISTRIBUTION = [
  ['actual', 35],
  ['completed', 23],
  ['cancelled', 32],
  ['planned', 2],
];

function distributionRows() {
  const rows = [];
  let id = 1;
  for (const [status, n] of STATUS_DISTRIBUTION) {
    for (let i = 0; i < n; i++) {
      rows.push({
        id: id++,
        date: '7/5/26',
        type: 'erg',
        label: `${status} ${i}`,
        status,
      });
    }
  }
  return rows;
}

// The proof case from #194: a real cancelled CP retest.
const session61 = {
  id: 61,
  date: '7/5/26',
  type: 'erg',
  label: 'CP RETEST — 1min + 4min max (rested, fed)',
  status: 'cancelled',
};

describe('useSessionLog — cancelled is shown but not counted (#194)', () => {
  it('AC1 keeps cancelled session 61 out of the counted set but in allSessions', async () => {
    mockQuery([
      session61,
      {
        id: 62,
        date: '7/6/26',
        type: 'erg',
        label: 'UT2 60min',
        status: 'completed',
      },
    ]);
    const { result } = renderHook(() => useSessionLog());
    await waitFor(() => expect(result.current.dbStatus).toBe('ok'));
    expect(result.current.loggedSessions.some((e) => e._id === 61)).toBe(false);
    expect(result.current.allSessions.some((e) => e._id === 61)).toBe(true);
  });

  it('AC2 builds no reconciliation key from a cancelled session', async () => {
    mockQuery([
      session61,
      {
        id: 62,
        date: '7/6/26',
        type: 'erg',
        label: 'UT2 60min',
        status: 'completed',
      },
    ]);
    const { result } = renderHook(() => useSessionLog());
    await waitFor(() => expect(result.current.dbStatus).toBe('ok'));
    expect(result.current.loggedKeys.has('7/5/26|Z2 Aerobic')).toBe(false);
    // Control — proves the assertion above is not passing vacuously.
    expect(result.current.loggedKeys.has('7/6/26|Z2 Aerobic')).toBe(true);
  });

  it('AC8 excludes a cancelled row from the counted set no matter what payload it carries', async () => {
    mockQuery([
      {
        id: 70,
        date: '7/8/26',
        type: 'strength',
        label: 'Lower B',
        status: 'cancelled',
        srpe: 9,
        exercises: [{ name: 'Squat' }],
      },
    ]);
    const { result } = renderHook(() => useSessionLog());
    await waitFor(() => expect(result.current.dbStatus).toBe('ok'));
    expect(result.current.loggedSessions).toHaveLength(0);
    expect(result.current.logDisplaySessions.some((e) => e._id === 70)).toBe(
      true
    );
  });

  it('AC9 counts 58 logged of 90 shown on the live status distribution', async () => {
    mockQuery(distributionRows());
    const { result } = renderHook(() => useSessionLog());
    await waitFor(() => expect(result.current.dbStatus).toBe('ok'));
    expect(result.current.allSessions).toHaveLength(92);
    expect(result.current.loggedSessions).toHaveLength(58);
    expect(result.current.logDisplaySessions).toHaveLength(90);
    expect(result.current.plannedSessions).toHaveLength(2);
  });

  it('AC11 shows session 61 in the display list and preserves display order', async () => {
    const rows = [
      {
        id: 60,
        date: '7/4/26',
        type: 'erg',
        label: 'UT2 45min',
        status: 'actual',
      },
      session61,
      {
        id: 62,
        date: '7/6/26',
        type: 'erg',
        label: 'AT plan',
        status: 'planned',
      },
      {
        id: 63,
        date: '7/7/26',
        type: 'erg',
        label: 'UT1 40min',
        status: 'logged',
      },
    ];
    mockQuery(rows);
    const { result } = renderHook(() => useSessionLog());
    await waitFor(() => expect(result.current.dbStatus).toBe('ok'));
    const display = result.current.logDisplaySessions;
    expect(display.some((e) => e._id === 61)).toBe(true);
    expect(display.some((e) => e.status === 'planned')).toBe(false);
    expect(display.map((e) => e._id)).toEqual([60, 61, 63]);
  });

  it('AC14 differs from the counted set by exactly the cancelled rows', async () => {
    mockQuery(distributionRows());
    const { result } = renderHook(() => useSessionLog());
    await waitFor(() => expect(result.current.dbStatus).toBe('ok'));
    const counted = new Set(result.current.loggedSessions.map((e) => e._id));
    const shownOnly = result.current.logDisplaySessions.filter(
      (e) => !counted.has(e._id)
    );
    expect(shownOnly).toHaveLength(32);
    expect(shownOnly.every((e) => e.status === 'cancelled')).toBe(true);
  });
});
