import { describe, it, expect } from 'vitest';
import {
  deriveBenchmarkStatuses,
  matchBenchmarkSession,
  labelMatchesTerms,
  normaliseLabel,
  BENCHMARK_MATCH_TOLERANCE_BEFORE_DAYS,
  BENCHMARK_MATCH_TOLERANCE_AFTER_DAYS,
  UPCOMING_WINDOW_DAYS,
} from '../benchmarkStatus.js';
import SOURCE from '../benchmarkStatus.js?raw';
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

// ---------------------------------------------------------------------------
// B1 + S1 delta. Real matchTerms straight off EVENT_LADDER — a test that
// invents its own terms would not notice a term regressing in the constant.
// ---------------------------------------------------------------------------

const TERMS = {
  cp: entryNamed('CP Test #1 (4-min)').matchTerms,
  fiveK: entryNamed('5k Time Trial').matchTerms,
  twoK: entryNamed('2k Test').matchTerms,
  thousand: entryNamed('1000m + 1-min tune-ups').matchTerms,
};

const BENCHMARK_ENTRIES = EVENT_LADDER.filter((e) => e.kind === 'benchmark');
const ALL_TERMS = BENCHMARK_ENTRIES.flatMap((e) => e.matchTerms);

// Vite's `?raw` import gives the module's own source text — no fs, no
// path juggling, and it tracks the file if it ever moves.

describe('labelMatchesTerms — boundary (B1)', () => {
  it('T5.1 does not read 18.5km as a 5k (live session 92)', () => {
    // The decimal-point trap: `\b` would accept this, because the `.` before
    // the `5` is itself a word boundary.
    const label = 'Zwift Loopin Lava — 35:45, 18.5km, 212m';
    expect(labelMatchesTerms(label, TERMS.fiveK)).toBe(false);
    expect(labelMatchesTerms(label, ALL_TERMS)).toBe(false);
  });

  it('T5.2 does not read 22km as a 2k', () => {
    const label = 'Zwift Alpe — 1:12:00, 22km, 1035m';
    expect(labelMatchesTerms(label, TERMS.twoK)).toBe(false);
    expect(labelMatchesTerms(label, ALL_TERMS)).toBe(false);
  });

  it('T5.3 does not read 12km as a 2k', () => {
    const label = 'Bike Z2 45min — 12km';
    expect(labelMatchesTerms(label, TERMS.twoK)).toBe(false);
    expect(labelMatchesTerms(label, ALL_TERMS)).toBe(false);
  });

  it('T5.4 does not read 21000m as a 1000m', () => {
    const label = 'Zwift Tempus — 41:00, 21000m';
    expect(labelMatchesTerms(label, TERMS.thousand)).toBe(false);
    expect(labelMatchesTerms(label, ALL_TERMS)).toBe(false);
  });

  it('T5.5 does not read a 1-min warm-up as the tune-ups benchmark', () => {
    const label = 'Warm-up 1-min bursts x5';
    expect(labelMatchesTerms(label, TERMS.thousand)).toBe(false);
    expect(labelMatchesTerms(label, ALL_TERMS)).toBe(false);
  });

  it('T5.6 does not read 3x1-min bursts as the tune-ups benchmark', () => {
    const label = '3x1-min bursts';
    expect(labelMatchesTerms(label, TERMS.thousand)).toBe(false);
    expect(labelMatchesTerms(label, ALL_TERMS)).toBe(false);
  });

  it('T5.7 rejects the decimal-bearing live labels 88 and 90', () => {
    for (const label of [
      'Off-program 10187m/45:00 @ ~150W (2:12.5/500)',
      'UT1 Steady 50min @ 164W (2:08.8/500) + 10min WU',
    ]) {
      expect(labelMatchesTerms(label, TERMS.fiveK), label).toBe(false);
      expect(labelMatchesTerms(label, TERMS.twoK), label).toBe(false);
      expect(labelMatchesTerms(label, ALL_TERMS), label).toBe(false);
    }
  });

  it('T5.8 rejects km distances and leading-digit forms', () => {
    expect(labelMatchesTerms('Zwift ride 5km climb', TERMS.fiveK)).toBe(false);
    expect(labelMatchesTerms('15000m long row', TERMS.fiveK)).toBe(false);
    expect(labelMatchesTerms('21000m', TERMS.thousand)).toBe(false);
    for (const label of ['Zwift ride 5km climb', '15000m long row', '21000m']) {
      expect(labelMatchesTerms(label, ALL_TERMS), label).toBe(false);
    }
  });

  it('T5.9 still matches the plural tune-ups on the singular term', () => {
    expect(labelMatchesTerms('1000m + 1-min tune-ups', ['tune-up'])).toBe(true);
    expect(labelMatchesTerms('1,000m tune-ups', ['tune-up'])).toBe(true);
    expect(labelMatchesTerms('1000m tune-up rehearsal', ['tune-up'])).toBe(
      true
    );
    for (const label of [
      '1000m + 1-min tune-ups',
      '1,000m tune-ups',
      '1000m tune-up rehearsal',
    ]) {
      expect(labelMatchesTerms(label, TERMS.thousand), label).toBe(true);
    }
  });

  it('T5.10 still matches the live CP test labels (45 and 61)', () => {
    for (const label of [
      'CP Test - 4min MAX (GATED)',
      'CP RETEST — 1min + 4min max (rested, fed)',
    ]) {
      expect(labelMatchesTerms(label, TERMS.cp), label).toBe(true);
    }
  });

  it('T5.11 still matches the plausible time-trial and 2k labels', () => {
    for (const label of ['5k TT', '5K Time Trial (rested)', '5000m Time Trial'])
      expect(labelMatchesTerms(label, TERMS.fiveK), label).toBe(true);
    for (const label of ['2k Test', '2,000m Test'])
      expect(labelMatchesTerms(label, TERMS.twoK), label).toBe(true);
  });

  it('T5.12 uses no regex lookbehind anywhere (iOS Safari < 16.4)', () => {
    expect(SOURCE).toContain('labelMatchesTerms');
    expect(SOURCE).not.toContain('(?<');
  });

  it('holds end-to-end: no MUST-NOT-MATCH label clears a benchmark', () => {
    const traps = [
      'Zwift Loopin Lava — 35:45, 18.5km, 212m',
      'Zwift Alpe — 1:12:00, 22km, 1035m',
      'Bike Z2 45min — 12km',
      'Zwift Tempus — 41:00, 21000m',
      'Warm-up 1-min bursts x5',
      '3x1-min bursts',
      'Baseline 10,000m',
      'Long Row — 10,000m',
      'AM — Long Row 10,000m',
      '60min Row — 12,957m',
      'Zwift ride 5km climb',
      '15000m long row',
      '21000m',
    ];
    // Dated inside every benchmark's match reach and marked completed, so
    // only the label test can reject them.
    const rows = run([
      ...SESSIONS,
      ...traps.map((label, i) => ({
        id: 600 + i,
        date: '8/5/26',
        label,
        status: 'completed',
      })),
    ]);
    expect(rows.filter((r) => r.status === 'done').length).toBe(0);
    expect(rows.filter((r) => r.status === 'overdue').length).toBe(3);
  });
});

describe('normaliseLabel — thousands separators (S1)', () => {
  it('T5.13 matches the comma form of 5,000m (live 19, 20, 25)', () => {
    expect(normaliseLabel('5,000m')).toBe('5000m');
    for (const label of ['5,000m', 'PM — 5,000m'])
      expect(labelMatchesTerms(label, TERMS.fiveK), label).toBe(true);
  });

  it('T5.14 matches the comma form of 2,000m', () => {
    expect(labelMatchesTerms('2,000m Test', TERMS.twoK)).toBe(true);
  });

  it('T5.15 adds no new hit for the 10,000m long rows (live 27, 21, 24, 29)', () => {
    for (const label of [
      'Baseline 10,000m',
      'Long Row — 10,000m',
      'AM — Long Row 10,000m',
    ]) {
      expect(labelMatchesTerms(label, TERMS.fiveK), label).toBe(false);
      expect(labelMatchesTerms(label, TERMS.thousand), label).toBe(false);
      expect(labelMatchesTerms(label, ALL_TERMS), label).toBe(false);
    }
  });

  it('T5.16 adds no new hit for 12,957m (live 37)', () => {
    expect(labelMatchesTerms('60min Row — 12,957m', ALL_TERMS)).toBe(false);
  });

  it('T5.17 strips every separator in one pass and still rejects 1,000,000m', () => {
    expect(normaliseLabel('1,000,000m')).toBe('1000000m');
    expect(labelMatchesTerms('1,000,000m', TERMS.thousand)).toBe(false);
  });

  it('lower-cases and tolerates a null label', () => {
    expect(normaliseLabel('5K Time Trial')).toBe('5k time trial');
    expect(normaliseLabel(null)).toBe('');
    expect(normaliseLabel(undefined)).toBe('');
    expect(labelMatchesTerms(null, TERMS.fiveK)).toBe(false);
  });

  it('ignores falsy terms and a non-array terms argument', () => {
    expect(labelMatchesTerms('5k TT', ['', null, undefined])).toBe(false);
    expect(labelMatchesTerms('5k TT', null)).toBe(false);
  });

  it('escapes regex metacharacters in a term instead of interpreting them', () => {
    expect(labelMatchesTerms('a+b test', ['a+b'])).toBe(true);
    expect(labelMatchesTerms('aab test', ['a+b'])).toBe(false);
  });
});

describe('EVENT_LADDER matchTerms', () => {
  it("T5.18 no benchmark carries '1-min', and the tune-ups entry is exactly ['1000m','tune-up']", () => {
    expect(BENCHMARK_ENTRIES.length).toBe(5);
    for (const e of BENCHMARK_ENTRIES) {
      expect(e.matchTerms, e.name).not.toContain('1-min');
    }
    expect(entryNamed('1000m + 1-min tune-ups').matchTerms).toEqual([
      '1000m',
      'tune-up',
    ]);
  });
});
