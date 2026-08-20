import { describe, it, expect } from 'vitest';
import { resolveLadderStatuses, selectUpcoming } from '../benchmarkStatus.js';
import { COMPLETED_STATUSES } from '../../constants/sessionStatus.js';
import { EVENT_LADDER } from '../../constants/schedule.js';

const TODAY = '2026-08-20';

const CP1 = EVENT_LADDER[0]; // 'Wed 1 Jul 26'   · CP Test #1 (4-min)
const CP2 = EVENT_LADDER[1]; // '~Mid Jul 26'    · CP Test #2 (2nd duration)
const TT5K = EVENT_LADDER[2]; // '~Early Aug 26' · 5k Time Trial
const TEST2K = EVENT_LADDER[5]; // '~Mid Jan 27' · 2k Test

// Real rows, real labels — the five completed sessions that actually sit inside
// the ~Mid Jul window. None of them is a CP test, which is exactly why
// window-only matching (any session in the window ⇒ done) is disqualified.
const MID_JUL_DONE = [
  {
    id: 72,
    date: '7/11/26',
    label: 'UT1 55min steady @ 150-160W',
    status: 'completed',
  },
  {
    id: 74,
    date: '7/13/26',
    label: 'UT1 50min steady @ 148-158W',
    status: 'completed',
  },
  {
    id: 91,
    date: '7/15/26',
    label: 'UT1 Steady 50min @ 158W + 10min WU',
    status: 'logged',
  },
  {
    id: 79,
    date: '7/17/26',
    label: 'UT2 40min recovery @ 130-142W',
    status: 'completed',
  },
  { id: 86, date: '7/20/26', label: 'Lower 1 (RDL-led)', status: 'actual' },
];

// The only session that names the CP retest — and it was cancelled.
const CANCELLED_RETEST = {
  id: 61,
  date: '7/5/26',
  label: 'CP RETEST — 1min + 4min max (rested, fed)',
  status: 'cancelled',
};

// CP Test #1, genuinely done eight days early.
const SESSION_45 = {
  id: 45,
  date: '6/23/26',
  label: 'CP Test - 4min MAX (GATED)',
  status: 'completed',
};

const EARLY_AUG_DONE = [
  {
    id: 97,
    date: '8/1/26',
    label: 'UT1 45min Ramp SR — peaks 250W',
    status: 'completed',
  },
  {
    id: 98,
    date: '8/5/26',
    label: '40min progressive build — final 10min @ 220W',
    status: 'logged',
  },
  {
    id: 90,
    date: '8/10/26',
    label: 'UT1 Steady 50min @ 164W (2:08.8/500) + 10min WU',
    status: 'completed',
  },
];

function resolve(ladder, sessions, today = TODAY) {
  return resolveLadderStatuses(ladder, sessions, {
    today,
    sessionsReady: true,
  });
}

describe('resolveLadderStatuses — due and overdue (AC1, AC2)', () => {
  it('AC1 marks an elapsed benchmark with no matching session overdue', () => {
    const [s] = resolve([CP2], []);
    expect(s.status).toBe('overdue');
    expect(s.daysOverdue).toBe(31);
    expect(s.done).toBe(false);
    expect(s.matchedSessionId).toBeNull();
  });

  it('AC2a marks a benchmark starting in 5 days upcoming', () => {
    const entry = { date: '25 Aug 26', name: '2k Test', kind: 'benchmark' };
    const [s] = resolve([entry], []);
    expect(s.status).toBe('upcoming');
    expect(s.daysUntilStart).toBe(5);
    expect(s.daysOverdue).toBeNull();
  });

  it('AC2b keeps a started-but-not-ended window upcoming', () => {
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

  it('carries the window, fuzzy flag, keywords, entry and index through', () => {
    const [s] = resolve([CP2], []);
    expect(s.window).toEqual({ start: '2026-07-11', end: '2026-07-20' });
    expect(s.fuzzy).toBe(true);
    expect(s.keywords).toEqual(['cp']);
    expect(s.entry).toBe(CP2);
    expect(s.index).toBe(0);
  });
});

describe('resolveLadderStatuses — the real ladder today (AC3)', () => {
  it('AC3a reports CP Test #2 overdue: the window is full of routine rows and the only CP session was cancelled', () => {
    const [s] = resolve([CP2], [...MID_JUL_DONE, CANCELLED_RETEST]);
    expect(s.status).toBe('overdue');
    expect(s.done).toBe(false);
  });

  it('AC3b reports the 5k Time Trial overdue although every session in its window is completed', () => {
    const [s] = resolve([TT5K], EARLY_AUG_DONE);
    expect(s.status).toBe('overdue');
    expect(s.done).toBe(false);
  });

  it('AC3c clears CP Test #1 from a session logged eight days before the window', () => {
    const [s] = resolve([CP1], [SESSION_45]);
    expect(s.status).toBe('quiet');
    expect(s.done).toBe(true);
    expect(s.matchedSessionId).toBe(45);
  });

  it('yields exactly two badges across the live ladder today', () => {
    const states = resolve(EVENT_LADDER, [
      SESSION_45,
      ...MID_JUL_DONE,
      CANCELLED_RETEST,
      ...EARLY_AUG_DONE,
    ]);
    const loud = states.filter((s) => s.status !== 'quiet');
    expect(loud.map((s) => [s.entry.name, s.status])).toEqual([
      ['CP Test #2 (2nd duration)', 'overdue'],
      ['5k Time Trial', 'overdue'],
    ]);
  });
});

describe('resolveLadderStatuses — what counts as done (AC4)', () => {
  const labelled = (status) => [
    { id: 1, date: '7/15/26', label: 'CP retest 4min max', status },
  ];

  it('AC4a does not count a cancelled session', () => {
    expect(resolve([CP2], labelled('cancelled'))[0].status).toBe('overdue');
  });

  it('AC4b does not count a planned session', () => {
    expect(resolve([CP2], labelled('planned'))[0].status).toBe('overdue');
  });

  it('AC4c reports overdue when there are no sessions at all', () => {
    expect(resolve([CP2], [])[0].status).toBe('overdue');
    expect(resolve([CP2], null)[0].status).toBe('overdue');
    expect(resolve([CP2], undefined)[0].status).toBe('overdue');
  });

  it.each(COMPLETED_STATUSES)('AC4d counts a %s session as done', (status) => {
    const [s] = resolve([CP2], labelled(status));
    expect(s.status).toBe('quiet');
    expect(s.done).toBe(true);
    expect(s.matchedSessionId).toBe(1);
  });
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

  it('P2 leaves a benchmark with an unreadable date quiet rather than throwing', () => {
    const entry = { date: 'someday', name: 'CP Test #3', kind: 'benchmark' };
    const [s] = resolve([entry], [SESSION_45]);
    expect(s.status).toBe('quiet');
    expect(s.window).toBeNull();
    expect(s.done).toBe(false);
  });

  it('never auto-clears a benchmark whose name yields no keywords', () => {
    const entry = {
      date: '~Mid Jul 26',
      name: 'Critical Power retest',
      kind: 'benchmark',
    };
    const [s] = resolve(
      [entry],
      [
        {
          id: 5,
          date: '7/15/26',
          label: 'Critical Power retest',
          status: 'completed',
        },
      ]
    );
    expect(s.keywords).toEqual([]);
    expect(s.status).toBe('overdue');
  });

  it('L3 returns an empty array for an empty ladder', () => {
    expect(resolve([], [])).toEqual([]);
    expect(resolve(null, [])).toEqual([]);
  });
});

describe('resolveLadderStatuses — matching precision (P4, P5, AC7)', () => {
  it('P4 does not let a 40min recovery row satisfy a 4min CP test', () => {
    const [s] = resolve(
      [CP1],
      [
        {
          id: 79,
          date: '7/1/26',
          label: 'UT2 40min recovery @ 130-142W',
          status: 'completed',
        },
      ]
    );
    expect(s.status).toBe('overdue');
    expect(s.done).toBe(false);
  });

  it('P5 lets only the earlier benchmark claim a shared CP session', () => {
    const shared = {
      id: 200,
      date: '6/29/26',
      label: 'CP test 4min max',
      status: 'completed',
    };
    const [first, second] = resolve([CP1, CP2], [shared]);
    expect(first.status).toBe('quiet');
    expect(first.matchedSessionId).toBe(200);
    expect(second.status).toBe('overdue');
    expect(second.matchedSessionId).toBeNull();
  });

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

  it('honours a graceDays override', () => {
    const tight = resolveLadderStatuses([CP1], [SESSION_45], {
      today: TODAY,
      sessionsReady: true,
      graceDays: 3,
    });
    expect(tight[0].status).toBe('overdue');
  });

  it('ignores sessions with an unreadable date', () => {
    const [s] = resolve(
      [CP2],
      [{ id: 9, date: 'sometime', label: 'CP retest', status: 'completed' }]
    );
    expect(s.status).toBe('overdue');
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

  it('selectUpcoming returns only the upcoming states', () => {
    const entry = { date: '25 Aug 26', name: '2k Test', kind: 'benchmark' };
    const states = resolve([CP2, entry], []);
    expect(selectUpcoming(states).map((s) => s.entry)).toEqual([entry]);
    expect(selectUpcoming(null)).toEqual([]);
  });
});
