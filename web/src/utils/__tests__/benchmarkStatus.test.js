import { describe, it, expect } from 'vitest';
import {
  deriveBenchmarkStatuses,
  matchBenchmarkSession,
  BENCHMARK_MATCH_TOLERANCE_BEFORE_DAYS,
  BENCHMARK_MATCH_TOLERANCE_AFTER_DAYS,
  UPCOMING_WINDOW_DAYS,
} from '../benchmarkStatus.js';
import { resolveEventWindow } from '../eventLadderDates.js';
import { EVENT_LADDER } from '../../constants/schedule.js';

// FIXTURE A — the AC9 truth table. Real production rows.
const SESSIONS = [
  {
    id: 45,
    date: '6/23/26',
    label: 'CP Test - 4min MAX (GATED)',
    status: 'completed',
  },
  {
    id: 61,
    date: '7/5/26',
    label: 'CP RETEST — 1min + 4min max (rested, fed)',
    status: 'cancelled',
  },
  {
    id: 79,
    date: '7/16/26',
    label: 'UT2 40min recovery @ 130-142W',
    status: 'completed',
  },
  {
    id: 97,
    date: '8/2/26',
    label: 'UT1 45min Ramp SR — peaks 250W',
    status: 'completed',
  },
  {
    id: 90,
    date: '8/7/26',
    label: 'UT1 Steady 50min @ 164W (2:08.8/500) + 10min WU',
    status: 'completed',
  },
];

const TODAY = new Date(2026, 7, 20);

function run(sessions = SESSIONS, options = {}) {
  return deriveBenchmarkStatuses(EVENT_LADDER, sessions, {
    today: TODAY,
    ...options,
  });
}

function byName(rows, name) {
  return rows.find((r) => r.entry.name === name);
}

function entryNamed(name) {
  return EVENT_LADDER.find((e) => e.name === name);
}

function fixtureEntry(windowStart, windowEnd, extra = {}) {
  return {
    date: 'unparseable-on-purpose',
    name: 'Fixture Benchmark',
    kind: 'benchmark',
    windowStart,
    windowEnd,
    matchTerms: ['fixture'],
    ...extra,
  };
}

describe('deriveBenchmarkStatuses — AC9 truth table on 2026-08-20', () => {
  it('signals exactly 3 overdue, 0 upcoming and 6 silent entries', () => {
    const rows = run();
    expect(rows.length).toBe(EVENT_LADDER.length);
    expect(rows.filter((r) => r.status === 'overdue').length).toBe(3);
    expect(rows.filter((r) => r.status === 'upcoming').length).toBe(0);
    expect(
      rows.filter((r) => r.status !== 'overdue' && r.status !== 'upcoming')
        .length
    ).toBe(6);
  });

  it('marks CP Test #1, CP Test #2 and the 5k Time Trial overdue', () => {
    const rows = run();
    for (const name of [
      'CP Test #1 (4-min)',
      'CP Test #2 (2nd duration)',
      '5k Time Trial',
    ]) {
      expect(byName(rows, name).status, name).toBe('overdue');
      expect(byName(rows, name).daysOverdue).toBeGreaterThan(0);
    }
  });

  it('never resolves a window for non-benchmark entries (rule 1 short-circuits)', () => {
    const rows = run();
    const nonBenchmarks = rows.filter((r) => r.entry.kind !== 'benchmark');
    expect(nonBenchmarks.length).toBe(4);
    for (const r of nonBenchmarks) {
      expect(r.status, r.entry.name).toBe('none');
      expect(r.window, r.entry.name).toBeNull();
      expect(r.matchedSession).toBeNull();
    }
  });

  it('stays silent for benchmarks more than 7 days out', () => {
    const rows = run();
    expect(byName(rows, '2k Test').status).toBe('none');
    expect(byName(rows, '1000m + 1-min tune-ups').status).toBe('none');
    // resolved, just not signalling
    expect(byName(rows, '2k Test').window).not.toBeNull();
  });

  it('reports the 5k as 10 days overdue (from overdueAfter 2026-08-10)', () => {
    expect(byName(run(), '5k Time Trial').daysOverdue).toBe(10);
  });
});

describe('the completed-status gate (AC4)', () => {
  it('does not let cancelled session 61 clear CP Test #1', () => {
    const cp1 = byName(run(), 'CP Test #1 (4-min)');
    expect(cp1.status).toBe('overdue');
    expect(cp1.matchedSession).toBeNull();

    // Session 61 is inside the window's +7 tolerance and its label hits
    // 'cp retest' — only the status gate rejects it.
    const window = resolveEventWindow(entryNamed('CP Test #1 (4-min)'));
    const session61 = SESSIONS.find((s) => s.id === 61);
    expect(session61.label.toLowerCase()).toContain('cp retest');
    expect(
      matchBenchmarkSession(entryNamed('CP Test #1 (4-min)'), window, [
        { ...session61, status: 'completed' },
      ])
    ).toEqual({ ...session61, status: 'completed' });
    expect(
      matchBenchmarkSession(entryNamed('CP Test #1 (4-min)'), window, [
        session61,
      ])
    ).toBeNull();
  });

  it('does not let a planned session with a perfect label clear a benchmark', () => {
    const rows = run([
      ...SESSIONS,
      {
        id: 500,
        date: '8/5/26',
        label: '5000m Time Trial',
        status: 'planned',
      },
    ]);
    expect(byName(rows, '5k Time Trial').status).toBe('overdue');
    expect(byName(rows, '5k Time Trial').matchedSession).toBeNull();
  });
});

describe('asymmetric proximity tolerance (RF-1)', () => {
  it('is 3 days before and 7 days after', () => {
    expect(BENCHMARK_MATCH_TOLERANCE_BEFORE_DAYS).toBe(3);
    expect(BENCHMARK_MATCH_TOLERANCE_AFTER_DAYS).toBe(7);
    expect(UPCOMING_WINDOW_DAYS).toBe(7);
  });

  it('excludes session 45 (8 days early) but would match it at a 14-day before tolerance', () => {
    const entry = entryNamed('CP Test #1 (4-min)');
    const window = resolveEventWindow(entry);
    const session45 = SESSIONS.filter((s) => s.id === 45);

    expect(matchBenchmarkSession(entry, window, session45)).toBeNull();

    // Same session, same terms, same status — only the reach changes. Moving
    // the window start back 11 days is exactly a 14-day before-tolerance.
    const widened = {
      ...window,
      start: new Date(2026, 5, 20),
    };
    expect(matchBenchmarkSession(entry, widened, session45)).toEqual(
      session45[0]
    );
  });
});

describe('upcoming window (AC3)', () => {
  it('reports a benchmark 4 days out as upcoming', () => {
    const rows = deriveBenchmarkStatuses(
      [fixtureEntry('2026-08-01', '2026-08-10')],
      [],
      { today: new Date(2026, 6, 28) }
    );
    expect(rows[0].status).toBe('upcoming');
    expect(rows[0].daysUntil).toBe(4);
    expect(rows[0].daysOverdue).toBeNull();
  });

  it('includes today+7, excludes today+8 and includes today itself', () => {
    const at = (windowStart, windowEnd) =>
      deriveBenchmarkStatuses([fixtureEntry(windowStart, windowEnd)], [], {
        today: TODAY,
      })[0];

    expect(at('2026-08-27', '2026-08-27').status).toBe('upcoming');
    expect(at('2026-08-28', '2026-08-28').status).toBe('none');
    const sameDay = at('2026-08-20', '2026-08-20');
    expect(sameDay.status).toBe('upcoming');
    expect(sameDay.daysUntil).toBe(0);
  });
});

describe('clearing and loading', () => {
  it('clears the 5k once a matching logged session exists (AC7)', () => {
    const rows = run([
      ...SESSIONS,
      { id: 99, date: '8/5/26', label: '5000m Time Trial', status: 'logged' },
    ]);
    const fiveK = byName(rows, '5k Time Trial');
    expect(fiveK.status).toBe('done');
    expect(fiveK.matchedSession.id).toBe(99);
    expect(rows.filter((r) => r.status === 'overdue').length).toBe(2);
  });

  it('reports every benchmark as pending while sessions are in flight (AC8)', () => {
    const rows = run(undefined, { sessionsReady: false });
    const benchmarks = rows.filter((r) => r.entry.kind === 'benchmark');
    expect(benchmarks.length).toBe(5);
    for (const r of benchmarks) expect(r.status).toBe('pending');
    expect(rows.filter((r) => r.status === 'done').length).toBe(0);
    expect(rows.filter((r) => r.status === 'overdue').length).toBe(0);
    expect(rows.filter((r) => r.status === 'upcoming').length).toBe(0);
  });

  it('defaults to still-due when there are no sessions at all (AC6)', () => {
    for (const sessions of [null, undefined, []]) {
      const rows = run(sessions);
      expect(rows.filter((r) => r.status === 'overdue').length).toBe(3);
      expect(rows.filter((r) => r.status === 'done').length).toBe(0);
    }
  });

  it('uses new Date() when no today is supplied', () => {
    const rows = deriveBenchmarkStatuses(EVENT_LADDER, []);
    expect(rows.length).toBe(EVENT_LADDER.length);
    expect(byName(rows, 'CP Test #1 (4-min)').status).toBe('overdue');
  });
});

describe('matchBenchmarkSession details', () => {
  const entry = fixtureEntry('2026-08-10', '2026-08-10');
  const window = resolveEventWindow(entry);

  it('picks the nearest session, tie-breaking on the lower id, order-independently', () => {
    const near = {
      id: 2,
      date: '8/11/26',
      label: 'fixture A',
      status: 'logged',
    };
    const far = {
      id: 1,
      date: '8/14/26',
      label: 'fixture B',
      status: 'logged',
    };
    expect(matchBenchmarkSession(entry, window, [far, near]).id).toBe(2);
    expect(matchBenchmarkSession(entry, window, [near, far]).id).toBe(2);

    const tieHigh = {
      id: 8,
      date: '8/12/26',
      label: 'fixture C',
      status: 'logged',
    };
    const tieLow = {
      id: 3,
      date: '8/8/26',
      label: 'fixture D',
      status: 'logged',
    };
    expect(matchBenchmarkSession(entry, window, [tieHigh, tieLow]).id).toBe(3);
    expect(matchBenchmarkSession(entry, window, [tieLow, tieHigh]).id).toBe(3);
  });

  it('breaks a full tie on the label, lexically', () => {
    const a = {
      id: 4,
      date: '8/11/26',
      label: 'fixture alpha',
      status: 'logged',
    };
    const b = {
      id: 4,
      date: '8/9/26',
      label: 'fixture beta',
      status: 'logged',
    };
    expect(matchBenchmarkSession(entry, window, [b, a]).label).toBe(
      'fixture alpha'
    );
  });

  it('skips sessions with an unparseable date instead of throwing', () => {
    const rows = [
      { id: 1, date: 'not-a-date', label: 'fixture X', status: 'logged' },
      null,
    ];
    expect(() => matchBenchmarkSession(entry, window, rows)).not.toThrow();
    expect(matchBenchmarkSession(entry, window, rows)).toBeNull();
  });

  it('never matches an entry that has no matchTerms', () => {
    const bare = fixtureEntry('2026-08-10', '2026-08-10', {
      matchTerms: undefined,
    });
    const perfect = {
      id: 1,
      date: '8/10/26',
      label: 'Fixture Benchmark',
      status: 'logged',
    };
    expect(
      matchBenchmarkSession(bare, resolveEventWindow(bare), [perfect])
    ).toBeNull();
    const empty = fixtureEntry('2026-08-10', '2026-08-10', { matchTerms: [] });
    expect(
      matchBenchmarkSession(empty, resolveEventWindow(empty), [perfect])
    ).toBeNull();
  });

  it('returns null without an entry or a window', () => {
    expect(matchBenchmarkSession(null, window, [])).toBeNull();
    expect(matchBenchmarkSession(entry, null, [])).toBeNull();
  });

  it('stays silent for a benchmark whose date cannot be resolved', () => {
    const rows = deriveBenchmarkStatuses(
      [{ date: 'TBC', name: 'Mystery', kind: 'benchmark', matchTerms: ['x'] }],
      SESSIONS,
      { today: TODAY }
    );
    expect(rows[0].status).toBe('none');
    expect(rows[0].window).toBeNull();
  });

  it('tolerates a non-array entries argument', () => {
    expect(deriveBenchmarkStatuses(null, [], { today: TODAY })).toEqual([]);
  });
});
