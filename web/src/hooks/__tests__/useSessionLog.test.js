import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const fromMock = vi.fn();

vi.mock('../../supabaseClient.js', () => ({
  supabase: {
    from: (...args) => fromMock(...args),
  },
}));

import { useSessionLog } from '../useSessionLog.js';

// The hook chains .order('date_iso').order('id').then(...), so `order` has to
// return the chain rather than a Promise, and the chain itself has to be
// thenable. orderCalls records the arguments so a test can assert the ordering
// contract directly instead of inferring it from row order.
let orderCalls = [];

function mockQuery(data, error = null) {
  orderCalls = [];
  const chain = {
    select: () => chain,
    order: (column, opts) => {
      orderCalls.push([column, opts]);
      return chain;
    },
    then: (resolve, reject) =>
      Promise.resolve({ data, error }).then(resolve, reject),
  };
  fromMock.mockReturnValue(chain);
}

beforeEach(() => {
  fromMock.mockReset();
  orderCalls = [];
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
        status: 'actual',
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
    expect(bike.status).toBe('actual');
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
        status: 'actual',
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

// ── #232-D: training-date order, not insertion order ──────────────
// The hook used to .order('created_at', { ascending: false }). That is
// INSERTION order: a session imported or edited late sorted as "most recent"
// however long ago it was actually done. Measured against the live table, the
// latest-erg tile named the 7/14/26 session while 8/6, 8/4, 8/2 and 7/30 all
// existed — 23 days stale.
describe('useSessionLog — orders by training date (#232-D)', () => {
  it('D-AC1 requests date_iso desc with NULLS LAST, then id as a tiebreak', async () => {
    mockQuery([ergRow]);
    const { result } = renderHook(() => useSessionLog());
    await waitFor(() => expect(result.current.dbStatus).toBe('ok'));
    // nullsFirst is asserted explicitly: postgrest-js omits the clause entirely
    // when it is undefined, and Postgres defaults descending to NULLS FIRST,
    // which would float a date the generated column could not parse to the top
    // as "most recent".
    expect(orderCalls).toEqual([
      ['date_iso', { ascending: false, nullsFirst: false }],
      ['id', { ascending: false }],
    ]);
    expect(orderCalls.some(([column]) => column === 'created_at')).toBe(false);
  });

  it('D-AC2 does not float a late-created, early-dated row to the top', async () => {
    // As the database returns them under date_iso desc. Row 99 was inserted
    // last (highest id, latest created_at) but trained first, so under the old
    // created_at ordering it arrived at position 0 and became `latestErg`.
    mockQuery([
      {
        id: 2,
        date: '8/6/26',
        type: 'erg',
        label: 'UT1 50min',
        status: 'actual',
      },
      {
        id: 3,
        date: '8/4/26',
        type: 'erg',
        label: 'build 40min',
        status: 'actual',
      },
      {
        id: 99,
        date: '7/14/26',
        type: 'erg',
        label: 'backfilled months later',
        status: 'actual',
      },
    ]);
    const { result } = renderHook(() => useSessionLog());
    await waitFor(() => expect(result.current.dbStatus).toBe('ok'));
    const logged = result.current.loggedSessions;
    expect(logged[0]._id).toBe(2);
    expect(logged[0].date).toBe('8/6/26');
    expect(logged.at(-1)._id).toBe(99);
  });

  it('D-AC3 excludes a null status now that the column is NOT NULL (010)', async () => {
    // Migration 010 means the database cannot produce this row. If one ever
    // reaches the predicate anyway, isCompletedStatus fails closed: the session
    // goes visibly missing rather than counting as phantom training.
    mockQuery([
      { id: 1, date: '8/6/26', type: 'erg', label: 'real', status: 'actual' },
      { id: 2, date: '8/5/26', type: 'erg', label: 'impossible', status: null },
    ]);
    const { result } = renderHook(() => useSessionLog());
    await waitFor(() => expect(result.current.dbStatus).toBe('ok'));
    expect(result.current.loggedSessions.map((e) => e._id)).toEqual([1]);
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

// ── #242: cancelled carried as its own list for the day strip ─────
// The calendar needs to mark a day where a session was cancelled without
// re-inspecting `status` in the view. The list is a strict subset of the SHOWN
// set and disjoint from the COUNTED set — that relationship is the contract.
describe('useSessionLog — cancelled sessions are carried separately (#242)', () => {
  it('AC1 puts cancelled session 61 in its own list, out of the counted one', async () => {
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
    expect(result.current.cancelledSessions.map((e) => e._id)).toEqual([61]);
    expect(result.current.loggedSessions.some((e) => e._id === 61)).toBe(false);
    expect(result.current.logDisplaySessions.some((e) => e._id === 61)).toBe(
      true
    );
  });

  it('AC2 adds a fourth accumulator without perturbing the other three', async () => {
    mockQuery(distributionRows());
    const { result } = renderHook(() => useSessionLog());
    await waitFor(() => expect(result.current.dbStatus).toBe('ok'));
    expect(result.current.cancelledSessions).toHaveLength(32);
    expect(result.current.loggedSessions).toHaveLength(58);
    expect(result.current.logDisplaySessions).toHaveLength(90);
    expect(result.current.plannedSessions).toHaveLength(2);
    const counted = new Set(result.current.loggedSessions.map((e) => e._id));
    expect(
      result.current.cancelledSessions.every((e) => !counted.has(e._id))
    ).toBe(true);
  });

  it('AC3 preserves date_iso-desc order inside the cancelled list', async () => {
    // Same ordering guarantee as the counted list: the rows arrive in
    // date_iso-desc order and the single pass must not reshuffle them.
    mockQuery([
      {
        id: 2,
        date: '8/6/26',
        type: 'erg',
        label: 'UT1 50min',
        status: 'cancelled',
      },
      {
        id: 3,
        date: '8/4/26',
        type: 'erg',
        label: 'build 40min',
        status: 'actual',
      },
      {
        id: 99,
        date: '7/14/26',
        type: 'erg',
        label: 'backfilled months later',
        status: 'cancelled',
      },
    ]);
    const { result } = renderHook(() => useSessionLog());
    await waitFor(() => expect(result.current.dbStatus).toBe('ok'));
    const cancelled = result.current.cancelledSessions;
    expect(cancelled.map((e) => e._id)).toEqual([2, 99]);
    expect(cancelled[0].date).toBe('8/6/26');
    expect(cancelled.at(-1).date).toBe('7/14/26');
  });
});
