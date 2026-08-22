import { describe, it, expect } from 'vitest';
import {
  compareBenchmarkSeverity,
  resolveLadderStatuses,
  selectUpcoming,
} from '../benchmarkStatus.js';
import { COMPLETED_STATUSES } from '../../constants/sessionStatus.js';
import { EVENT_LADDER } from '../../constants/schedule.js';

const TODAY = '2026-08-20';

const CP1 = EVENT_LADDER[0]; // 'Wed 1 Jul 26'   · CP Test #1 (4-min)  · cp-test-1
const CP2 = EVENT_LADDER[1]; // '~Mid Jul 26'    · CP Test #2          · cp-test-2
const TT5K = EVENT_LADDER[2]; // '~Early Aug 26' · 5k Time Trial       · 5k-tt
const TEST2K = EVENT_LADDER[5]; // '~Mid Jan 27' · 2k Test             · 2k-test

// Real rows, real labels, verified field-by-field against the live DB — the
// completed sessions that actually sit inside the ~Mid Jul window. None of them
// is a CP test, and none of them carries a link, so none of them clears
// anything. Before #188 the resolver guessed from these labels; now it cannot.
const MID_JUL_DONE = [
  {
    id: 72,
    date: '7/11/26',
    label: 'UT1 55min steady @ 150-160W',
    status: 'completed',
    benchmark_key: null,
  },
  {
    id: 74,
    date: '7/13/26',
    label: 'UT1 50min steady @ 148-158W',
    status: 'completed',
    benchmark_key: null,
  },
  {
    id: 79,
    date: '7/16/26',
    label: 'UT2 40min recovery @ 130-142W',
    status: 'completed',
    benchmark_key: null,
  },
  {
    id: 86,
    date: '7/20/26',
    label: 'Lower 1 (RDL-led)',
    status: 'completed',
    benchmark_key: null,
  },
];

// CP Test #1, genuinely done eight days early — and explicitly linked. The date
// sits OUTSIDE the one-day 'Wed 1 Jul 26' window on purpose: a link ignores the
// window entirely (spec C).
const SESSION_45 = {
  id: 45,
  date: '6/23/26',
  label: 'CP Test - 4min MAX (GATED)',
  status: 'completed',
  benchmark_key: 'cp-test-1',
};

// The only session that names the CP retest — and it was cancelled. Under the
// link rule its label is irrelevant anyway; it stays as the fixture the live
// ladder assertion below is built from.
const CANCELLED_RETEST = {
  id: 61,
  date: '7/5/26',
  label: 'CP RETEST — 1min + 4min max (rested, fed)',
  status: 'cancelled',
  benchmark_key: null,
};

// The completed rows inside the ~Early Aug window. None is a 5k, and none
// carries a link, so none of them clears the 5k Time Trial.
const EARLY_AUG_DONE = [
  {
    id: 97,
    date: '8/2/26',
    label: 'UT1 45min Ramp SR — peaks 250W',
    status: 'completed',
    benchmark_key: null,
  },
  {
    id: 98,
    date: '8/4/26',
    label: '40min progressive build — final 10min @ 220W',
    status: 'completed',
    benchmark_key: null,
  },
  {
    id: 90,
    date: '8/7/26',
    label: 'UT1 Steady 50min @ 164W (2:08.8/500) + 10min WU',
    status: 'completed',
    benchmark_key: null,
  },
];

function resolve(ladder, sessions, today = TODAY) {
  return resolveLadderStatuses(ladder, sessions, {
    today,
    sessionsReady: true,
  });
}

describe('resolveLadderStatuses — the link decides done (AC1, AC3)', () => {
  it('AC1 clears a benchmark from a linked session whose label says nothing about it', () => {
    const row = {
      id: 79,
      date: '7/16/26',
      label: 'UT2 40min recovery @ 130-142W',
      status: 'completed',
      benchmark_key: 'cp-test-1',
    };
    const [s] = resolve([CP1], [row]);
    expect(s.status).toBe('quiet');
    expect(s.done).toBe(true);
    expect(s.matchedSessionId).toBe(79);
  });

  // The single most important test in this file. Before #188 this exact row
  // cleared CP Test #1 by keyword; Scott's Gate 1 decision was that only a link
  // may clear a benchmark, so the loudest possible label must now change
  // nothing. If this test ever goes green-by-accident the feature is undone.
  it('AC3 leaves a benchmark overdue when a session names it but carries no link', () => {
    const namesItButUnlinked = {
      id: 45,
      date: '7/1/26', // squarely inside CP Test #1's window
      label: 'CP Test - 4min MAX (GATED)',
      status: 'completed',
      benchmark_key: null,
    };
    const [s] = resolve([CP1], [namesItButUnlinked]);
    expect(s.status).toBe('overdue');
    expect(s.done).toBe(false);
    expect(s.matchedSessionId).toBeNull();
  });

  it('AC3b clears a benchmark whose linked session label names a different benchmark', () => {
    const row = {
      id: 61,
      date: '7/5/26',
      label: 'CP RETEST — 1min + 4min max',
      status: 'completed',
      benchmark_key: '5k-tt',
    };
    const [cp1, tt5k] = resolve([CP1, TT5K], [row]);
    expect(tt5k.status).toBe('quiet');
    expect(tt5k.done).toBe(true);
    expect(tt5k.matchedSessionId).toBe(61);
    expect(cp1.status).toBe('overdue');
    expect(cp1.done).toBe(false);
    expect(cp1.matchedSessionId).toBeNull();
  });

  // Spec C: a link ignores the window in BOTH directions. The badge clears
  // because the link exists, never because the date looked plausible.
  it.each([['2027-03-15'], ['2026-01-01']])(
    'clears a linked benchmark logged well outside its window (%s)',
    (date) => {
      const [s] = resolve([CP1], [{ ...SESSION_45, date }]);
      expect(s.status).toBe('quiet');
      expect(s.done).toBe(true);
      expect(s.matchedSessionId).toBe(45);
    }
  );

  // Every remaining ~Mid Jul row is completed and none is linked, so CP Test #2
  // stays overdue no matter how full the window is.
  it('leaves a benchmark overdue when its whole window is full of unlinked completed rows', () => {
    const [s] = resolve([CP2], MID_JUL_DONE);
    expect(s.status).toBe('overdue');
    expect(s.done).toBe(false);
  });
});

describe('resolveLadderStatuses — due and overdue (AC2)', () => {
  it('AC2a marks an unlinked elapsed benchmark overdue', () => {
    const [s] = resolve([CP2], []);
    expect(s.status).toBe('overdue');
    expect(s.daysOverdue).toBe(31);
    expect(s.done).toBe(false);
    expect(s.matchedSessionId).toBeNull();
  });

  it('AC2b marks an unlinked benchmark starting in 5 days upcoming', () => {
    const entry = { date: '25 Aug 26', name: '2k Test', kind: 'benchmark' };
    const [s] = resolve([entry], []);
    expect(s.status).toBe('upcoming');
    expect(s.daysUntilStart).toBe(5);
    expect(s.daysOverdue).toBeNull();
  });

  it('keeps a started-but-not-ended window upcoming', () => {
    const entry = { date: 'Mid Aug 26', name: '2k Test', kind: 'benchmark' };
    const [s] = resolve([entry], []);
    expect(s.status).toBe('upcoming');
    expect(s.daysUntilStart).toBeLessThanOrEqual(0);
  });

  it('stays quiet while a benchmark is still more than a week away', () => {
    const [s] = resolve([TEST2K], []);
    expect(s.status).toBe('quiet');
    expect(s.daysUntilStart).toBeNull();
  });

  it('AC2c carries the fuzzy flag on a fuzzy window', () => {
    const [s] = resolve([CP2], []);
    expect(s.window).toEqual({ start: '2026-07-11', end: '2026-07-20' });
    expect(s.fuzzy).toBe(true);
    expect(s.entry).toBe(CP2);
    expect(s.index).toBe(0);
  });

  // The one field the #188 contract removes. Asserting its absence is what
  // stops a well-meaning revert quietly reinstating label inference.
  // #188 removed keywords from the DONE decision, not from the module: the
  // reschedule pass (#192) still derives them to spot a PLANNED session that
  // names a benchmark. What must stay true is the narrower claim — keywords
  // never clear anything — which the no-fallback test below enshrines.
  it('derives keywords only for benchmark entries, never for competitions', () => {
    const states = resolve(EVENT_LADDER, [SESSION_45]);
    const benchmarks = states.filter((s) => s.entry.kind === 'benchmark');
    const others = states.filter((s) => s.entry.kind !== 'benchmark');
    expect(benchmarks.every((s) => s.keywords.length > 0)).toBe(true);
    expect(others.every((s) => s.keywords.length === 0)).toBe(true);
  });
});

describe('resolveLadderStatuses — the link index (AC4)', () => {
  const sameKey = (id) => ({
    id,
    date: '6/29/26',
    label: 'CP test 4min max',
    status: 'completed',
    benchmark_key: 'cp-test-1',
  });

  // The partial unique index makes this impossible at the database, but a stale
  // cache or a client ahead of the migration can still hand the resolver two.
  // Lowest id, not earliest date — the resolver never parses sessions.date.
  it('AC4a takes the lowest id when two rows carry the same benchmark_key', () => {
    const rows = [sameKey(86), sameKey(84)];
    expect(resolve([CP1], rows)[0].matchedSessionId).toBe(84);
    expect(resolve([CP1], [...rows].reverse())[0].matchedSessionId).toBe(84);
  });

  it('AC4b a session with one key satisfies only that benchmark', () => {
    const row = {
      id: 200,
      date: '6/29/26',
      label: 'CP test 4min max',
      status: 'completed',
      benchmark_key: 'cp-test-1',
    };
    const [first, second] = resolve([CP1, CP2], [row]);
    expect(first.status).toBe('quiet');
    expect(first.matchedSessionId).toBe(200);
    expect(second.status).toBe('overdue');
    expect(second.matchedSessionId).toBeNull();
  });

  it('ignores a session row with a null benchmark_key', () => {
    const [s] = resolve(
      [CP2],
      [
        { id: 9, date: '7/15/26', label: 'CP retest', status: 'completed' },
        {
          id: 10,
          date: '7/16/26',
          label: 'CP retest',
          status: 'completed',
          benchmark_key: null,
        },
        {
          id: 11,
          date: '7/17/26',
          label: 'CP retest',
          status: 'completed',
          benchmark_key: '',
        },
        null,
      ]
    );
    expect(s.status).toBe('overdue');
    expect(s.done).toBe(false);
    expect(s.matchedSessionId).toBeNull();
  });

  // Risk 3: Coach writes a slug that is not on the ladder. Benign by
  // construction — it matches no entry, the benchmark stays due, nothing throws.
  it('treats an unrecognised benchmark_key as inert', () => {
    const [s] = resolve(
      [CP2],
      [
        {
          id: 12,
          date: '7/15/26',
          label: 'CP retest 4min max',
          status: 'completed',
          benchmark_key: 'cp-test-99',
        },
      ]
    );
    expect(s.status).toBe('overdue');
    expect(s.done).toBe(false);
  });

  it('resolves identically whichever order the payload arrives in', () => {
    const rows = [
      SESSION_45,
      ...MID_JUL_DONE,
      {
        id: 61,
        date: '7/5/26',
        label: 'CP RETEST — 1min + 4min max',
        status: 'completed',
        benchmark_key: 'cp-test-2',
      },
    ];
    const forward = resolve(EVENT_LADDER, rows);
    const backward = resolve(EVENT_LADDER, [...rows].reverse());
    expect(forward.map((s) => s.matchedSessionId)).toEqual(
      backward.map((s) => s.matchedSessionId)
    );
    expect(forward.map((s) => s.status)).toEqual(backward.map((s) => s.status));
  });
});

describe('resolveLadderStatuses — what counts as a completion (AC5)', () => {
  const linked = (status) => [
    {
      id: 1,
      date: '7/15/26',
      label: 'CP retest 4min max',
      status,
      benchmark_key: 'cp-test-2',
    },
  ];

  it('AC5a reverts to overdue when the linked session is cancelled', () => {
    const [s] = resolve([CP2], linked('cancelled'));
    expect(s.status).toBe('overdue');
    expect(s.done).toBe(false);
    expect(s.matchedSessionId).toBeNull();
  });

  it('ignores a planned session even when it carries the benchmark_key', () => {
    expect(resolve([CP2], linked('planned'))[0].status).toBe('overdue');
  });

  it('AC5b reverts when the linked session disappears from the payload', () => {
    const before = resolve([CP2], linked('completed'));
    expect(before[0].status).toBe('quiet');
    expect(before[0].done).toBe(true);

    const after = resolve([CP2], []);
    expect(after[0].status).toBe('overdue');
    expect(after[0].done).toBe(false);
    expect(after[0].matchedSessionId).toBeNull();
  });

  it('reports overdue when there are no sessions at all', () => {
    expect(resolve([CP2], [])[0].status).toBe('overdue');
    expect(resolve([CP2], null)[0].status).toBe('overdue');
    expect(resolve([CP2], undefined)[0].status).toBe('overdue');
  });

  it.each(COMPLETED_STATUSES)(
    'counts a %s session carrying the key as done',
    (status) => {
      const [s] = resolve([CP2], linked(status));
      expect(s.status).toBe('quiet');
      expect(s.done).toBe(true);
      expect(s.matchedSessionId).toBe(1);
    }
  );
});

describe('resolveLadderStatuses — non-benchmark and unparseable entries (AC6, P2, L3)', () => {
  it('AC6 leaves every competition, TARGET and optional entry quiet', () => {
    const others = EVENT_LADDER.filter((e) => e.kind !== 'benchmark');
    expect(others).toHaveLength(4);
    const states = resolve(others, [], '2027-12-31');
    expect(states.map((s) => s.status)).toEqual([
      'quiet',
      'quiet',
      'quiet',
      'quiet',
    ]);
    expect(states.every((s) => s.window === null)).toBe(true);
  });

  it('AC6b ignores a benchmark_key naming a non-benchmark entry', () => {
    const comp = EVENT_LADDER.find((e) => e.kind === 'competition');
    const strayLink = [
      {
        id: 300,
        date: '9/20/26',
        label: 'Erg Power Series heat 1',
        status: 'completed',
        benchmark_key: comp.name,
      },
    ];
    const [s] = resolve([comp], strayLink, '2027-12-31');
    expect(s.status).toBe('quiet');
    expect(s.done).toBe(false);
    expect(s.matchedSessionId).toBeNull();
  });

  it('P2 leaves a benchmark with an unreadable date quiet rather than throwing', () => {
    const entry = { date: 'someday', name: 'CP Test #3', kind: 'benchmark' };
    const [s] = resolve([entry], [SESSION_45]);
    expect(s.status).toBe('quiet');
    expect(s.window).toBeNull();
    expect(s.done).toBe(false);
  });

  it('leaves a benchmark entry carrying no key alone', () => {
    const entry = {
      date: '~Mid Jul 26',
      name: 'CP Test #3',
      kind: 'benchmark',
    };
    const [s] = resolve([entry], [SESSION_45]);
    expect(s.status).toBe('overdue');
    expect(s.done).toBe(false);
  });

  it('L3 returns an empty array for an empty ladder', () => {
    expect(resolve([], [])).toEqual([]);
    expect(resolve(null, [])).toEqual([]);
  });

  it('leaves a null ladder entry quiet rather than throwing', () => {
    const [s] = resolve([null], [SESSION_45]);
    expect(s.status).toBe('quiet');
    expect(s.done).toBe(false);
  });
});

// Risk 4: a builder who slugifies `name` instead of reading the literal `key`
// orphans every link the moment an entry is renamed. These are the five
// hand-written literals the migration's column COMMENT points at.
describe('EVENT_LADDER benchmark keys', () => {
  it('carries the five literal slugs on the benchmark entries only', () => {
    const benchmarks = EVENT_LADDER.filter((e) => e.kind === 'benchmark');
    expect(benchmarks.map((e) => e.key)).toEqual([
      'cp-test-1',
      'cp-test-2',
      '5k-tt',
      '2k-test',
      'tune-ups',
    ]);
    const others = EVENT_LADDER.filter((e) => e.kind !== 'benchmark');
    expect(others.every((e) => !('key' in e))).toBe(true);
  });
});

describe('resolveLadderStatuses — ordering and windows', () => {
  it('AC7 keeps same-month benchmarks in different years independent', () => {
    const lastYear = {
      date: '~Mid Jan 26',
      name: '2k Test',
      kind: 'benchmark',
    };
    const states = resolve([lastYear, TEST2K], []);
    expect(states[0].status).toBe('overdue');
    expect(states[1].status).toBe('quiet');
    expect(states[0].window.start).toBe('2026-01-11');
    expect(states[1].window.start).toBe('2027-01-11');
  });

  it('returns states in ladder order even when claim order differs', () => {
    const states = resolve([CP2, CP1], []);
    expect(states.map((s) => s.entry)).toEqual([CP2, CP1]);
    expect(states.map((s) => s.index)).toEqual([0, 1]);
  });
});

describe('resolveLadderStatuses — loading (L1) and selectUpcoming', () => {
  it('L1 reports unknown for every entry until the sessions land', () => {
    const states = resolveLadderStatuses(EVENT_LADDER, undefined, {
      today: TODAY,
      sessionsReady: false,
    });
    expect(states).toHaveLength(EVENT_LADDER.length);
    expect(states.every((s) => s.status === 'unknown')).toBe(true);
    expect(states.some((s) => s.status === 'overdue')).toBe(false);
    expect(states.every((s) => s.done === false)).toBe(true);
    expect(states.every((s) => s.window === null)).toBe(true);
  });

  it('reports unknown when today is missing', () => {
    const states = resolveLadderStatuses([CP2], [], { sessionsReady: true });
    expect(states[0].status).toBe('unknown');
  });

  it('reports unknown when the options bag is absent or null', () => {
    expect(resolveLadderStatuses([CP2], [])[0].status).toBe('unknown');
    expect(resolveLadderStatuses([CP2], [], null)[0].status).toBe('unknown');
  });

  it('selectUpcoming returns only the upcoming states', () => {
    const entry = { date: '25 Aug 26', name: '2k Test', kind: 'benchmark' };
    const states = resolve([CP2, entry], []);
    expect(selectUpcoming(states).map((s) => s.entry)).toEqual([entry]);
    expect(selectUpcoming(null)).toEqual([]);
  });
});

// A benchmark that never happened stays overdue for ever — CP Test #1 would
// read OVERDUE · 197d by the time its replacement window opens, and a permanent
// warning is wallpaper. Putting a `planned` row on the calendar is the reschedule
// gesture; these prove the badge reads it WITHOUT ever treating it as evidence.
describe('resolveLadderStatuses — rescheduled via a planned session', () => {
  const planned = (id, date, label) => ({ id, date, label, status: 'planned' });
  const CP_RETEST = 'CP RETEST — 1min + 4min max';

  it('AC1 never lets a planned session count as done, however good the label', () => {
    const [s] = resolve([CP2], [planned(300, '9/12/26', CP_RETEST)]);
    expect(s.done).toBe(false);
    expect(s.matchedSessionId).toBeNull();
    expect(s.status).toBe('scheduled');
  });

  it('AC2 resolves an overdue benchmark with a future planned session to scheduled', () => {
    const [s] = resolve([CP2], [planned(300, '9/12/26', CP_RETEST)]);
    expect(s.status).toBe('scheduled');
    expect(s.rescheduledTo).toBe('2026-09-12');
    expect(s.plannedSessionId).toBe(300);
    // The elapsed count survives the second pass: rescheduled is not forgiven.
    expect(s.daysOverdue).toBe(31);
  });

  it('AC2 counts a session dated exactly today as a live commitment', () => {
    const [s] = resolve([CP2], [planned(301, '8/20/26', CP_RETEST)]);
    expect(s.status).toBe('scheduled');
    expect(s.rescheduledTo).toBe('2026-08-20');
  });

  it('AC3 leaves a benchmark overdue when the planned session is in the past', () => {
    const [s] = resolve([CP2], [planned(302, '8/19/26', CP_RETEST)]);
    expect(s.status).toBe('overdue');
    expect(s.rescheduledTo).toBeNull();
    expect(s.plannedSessionId).toBeNull();
  });

  // The two `planned` rows that actually sit in the table today. Both are past
  // AND label-inert, so they fail the date gate and the label gate — the live
  // verdict is byte-for-byte what it was before this pass existed.
  it('AC3 leaves the live ladder unchanged against the real planned rows', () => {
    const REAL_PLANNED = [
      planned(43, '6/23/26', 'Upper Strength A'),
      planned(56, '7/1/26', 'Upper B'),
    ];
    const states = resolve(EVENT_LADDER, [
      SESSION_45,
      ...MID_JUL_DONE,
      CANCELLED_RETEST,
      ...EARLY_AUG_DONE,
      ...REAL_PLANNED,
    ]);
    const loud = states.filter((s) => s.status !== 'quiet');
    expect(loud.map((s) => [s.entry.name, s.status])).toEqual([
      ['CP Test #2 (2nd duration)', 'overdue'],
      ['5k Time Trial', 'overdue'],
    ]);
  });

  // Same rows, moved into the future: the label gate alone still rejects them,
  // which proves the live result above is not carried by the date gate only.
  it('AC3 leaves a benchmark overdue when a future planned label does not match', () => {
    const [s] = resolve([CP2], [planned(43, '9/1/26', 'Upper Strength A')]);
    expect(s.status).toBe('overdue');
  });

  it('does not let a planned ride reschedule a distance benchmark', () => {
    const K1000 = EVENT_LADDER.find((e) => e.name.startsWith('1000m'));
    const [s] = resolveLadderStatuses(
      [K1000],
      [planned(500, '3/1/27', 'Zwift Alpe du Zwift — 1:12:30, 22.4km, 1,000m')],
      { today: '2027-02-05', sessionsReady: true }
    );
    expect(s.status).toBe('overdue');
    expect(s.plannedSessionId).toBeNull();
  });

  it('leaves an upcoming benchmark upcoming, planned session or not', () => {
    const entry = { date: '25 Aug 26', name: '2k Test', kind: 'benchmark' };
    const [s] = resolve([entry], [planned(303, '9/1/26', '2k test')]);
    expect(s.status).toBe('upcoming');
    expect(s.rescheduledTo).toBeNull();
  });

  it('leaves a done benchmark quiet, planned session or not', () => {
    const [s] = resolve(
      [CP2],
      [
        {
          id: 1,
          date: '7/15/26',
          label: 'CP retest 4min max',
          status: 'completed',
          benchmark_key: 'cp-test-2',
        },
        planned(304, '9/12/26', CP_RETEST),
      ]
    );
    expect(s.status).toBe('quiet');
    expect(s.done).toBe(true);
    expect(s.rescheduledTo).toBeNull();
  });

  // One retest on the calendar is one benchmark rescheduled. Sharing it would
  // silence two badges off a single commitment — the original slip, reinvented.
  it('does not let one planned session clear two overdue benchmarks', () => {
    const [first, second] = resolve(
      [CP1, CP2],
      [planned(305, '9/1/26', 'CP retest 4min')]
    );
    expect(first.status).toBe('scheduled');
    expect(first.plannedSessionId).toBe(305);
    expect(second.status).toBe('overdue');
    expect(second.plannedSessionId).toBeNull();
  });

  it('picks the earliest future planned session', () => {
    const [s] = resolve(
      [CP2],
      [planned(310, '10/1/26', CP_RETEST), planned(311, '9/1/26', CP_RETEST)]
    );
    expect(s.plannedSessionId).toBe(311);
    expect(s.rescheduledTo).toBe('2026-09-01');
  });

  it('breaks a same-date planned tie on the lower session id', () => {
    const rows = [
      planned(320, '9/1/26', CP_RETEST),
      planned(315, '9/1/26', CP_RETEST),
    ];
    expect(resolve([CP2], rows)[0].plannedSessionId).toBe(315);
    expect(resolve([CP2], [...rows].reverse())[0].plannedSessionId).toBe(315);
  });

  it('ignores a planned session with an unreadable date', () => {
    const [s] = resolve([CP2], [planned(330, 'someday', CP_RETEST)]);
    expect(s.status).toBe('overdue');
  });

  it('never reschedules a benchmark whose name yields no keywords', () => {
    const entry = {
      date: '~Mid Jul 26',
      name: 'Critical Power retest',
      kind: 'benchmark',
    };
    const [s] = resolve(
      [entry],
      [planned(340, '9/1/26', 'Critical Power retest')]
    );
    expect(s.keywords).toEqual([]);
    expect(s.status).toBe('overdue');
  });
});

describe('compareBenchmarkSeverity (AC5)', () => {
  const st = (status, index) => ({ status, index });

  it('ranks overdue above upcoming above scheduled above the silent states', () => {
    const rows = [
      st('unknown', 4),
      st('scheduled', 2),
      st('quiet', 3),
      st('overdue', 0),
      st('upcoming', 1),
    ];
    expect(
      [...rows].sort(compareBenchmarkSeverity).map((r) => r.status)
    ).toEqual(['overdue', 'upcoming', 'scheduled', 'quiet', 'unknown']);
  });

  it('breaks a same-status tie on ladder index', () => {
    const rows = [st('overdue', 7), st('overdue', 2), st('overdue', 5)];
    expect(
      [...rows].sort(compareBenchmarkSeverity).map((r) => r.index)
    ).toEqual([2, 5, 7]);
  });
});
