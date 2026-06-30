import { describe, it, expect } from 'vitest';
import { MICROCYCLE } from '../../constants/schedule.js';
import {
  getRosterMode,
  resolveDay,
  SESSION_OVERRIDES,
  ROSTER_ANCHOR,
  logEntriesForDate,
  dayStatus,
  getToday,
  getUpcomingSessions,
  daySessions,
} from '../schedule.js';

// Anchor: Tue 23 Jun 2026 = FIFO week starts (week 0 = fifo, then alternates).
const d = (y, m, day, h = 0) => new Date(y, m - 1, day, h);

describe('getRosterMode', () => {
  it('returns home before the anchor', () => {
    expect(getRosterMode(d(2026, 6, 22))).toBe('home'); // Mon before fly-out
    expect(getRosterMode(d(2026, 1, 1))).toBe('home'); // far before
  });

  it('returns fifo for the anchor week (week 0)', () => {
    expect(getRosterMode(ROSTER_ANCHOR)).toBe('fifo'); // Tue 23 Jun
    expect(getRosterMode(d(2026, 6, 23))).toBe('fifo');
    expect(getRosterMode(d(2026, 6, 29))).toBe('fifo'); // last day of week 0
  });

  it('alternates to home for week 1 and back to fifo for week 2', () => {
    expect(getRosterMode(d(2026, 6, 30))).toBe('home'); // week 1
    expect(getRosterMode(d(2026, 7, 6))).toBe('home'); // still week 1
    expect(getRosterMode(d(2026, 7, 7))).toBe('fifo'); // week 2
  });

  it('ignores time-of-day (date components only)', () => {
    expect(getRosterMode(d(2026, 6, 23, 23))).toBe('fifo');
    expect(getRosterMode(d(2026, 6, 22, 1))).toBe('home');
  });
});

describe('resolveDay', () => {
  it('returns the one-off override when the date is keyed', () => {
    const cp = resolveDay(d(2026, 7, 1));
    expect(cp).toBe(SESSION_OVERRIDES['2026-07-01']);
    expect(cp.override).toBe(true);
    expect(cp.am).toContain('CP TEST');
  });

  it('zero-pads the override lookup key (single-digit month/day)', () => {
    // 2026-07-01 must match even though getMonth()+1 = 7 and date = 1
    expect(resolveDay(d(2026, 7, 1)).day).toBe('Wed');
  });

  it('falls back to the roster microcycle for non-override dates', () => {
    // Mon 22 Jun = home week → home Monday template
    const day = resolveDay(d(2026, 6, 22));
    const expected = MICROCYCLE.home.days.find((x) => x.day === 'Mon');
    expect(day).toBe(expected);
  });

  it('uses the fifo microcycle during a fifo week', () => {
    // Wed 24 Jun = fifo week
    const day = resolveDay(d(2026, 6, 24));
    const expected = MICROCYCLE.fifo.days.find((x) => x.day === 'Wed');
    expect(day).toBe(expected);
  });
});

describe('logEntriesForDate', () => {
  const sessions = [
    { date: '6/19/26', label: 'Erg' },
    { date: '6/19/26', label: 'Lift' },
    { date: '6/20/26', label: 'Rest' },
  ];

  it('builds an unpadded M/D/YY key and matches sessions', () => {
    expect(logEntriesForDate(d(2026, 6, 19), sessions)).toHaveLength(2);
    expect(logEntriesForDate(d(2026, 6, 20), sessions)).toHaveLength(1);
  });

  it('returns an empty array when nothing matches', () => {
    expect(logEntriesForDate(d(2026, 6, 21), sessions)).toEqual([]);
  });

  it('tolerates a null/undefined session list', () => {
    expect(logEntriesForDate(d(2026, 6, 19), null)).toEqual([]);
    expect(logEntriesForDate(d(2026, 6, 19), undefined)).toEqual([]);
  });
});

describe('dayStatus', () => {
  const todayMidnight = d(2026, 6, 22);
  const sessions = [{ date: '6/21/26', label: 'Erg' }];

  it('is done when the day has logged entries', () => {
    const s = dayStatus(d(2026, 6, 21), todayMidnight, sessions);
    expect(s.state).toBe('done');
    expect(s.logged).toHaveLength(1);
  });

  it('is today when the date equals todayMidnight', () => {
    expect(dayStatus(d(2026, 6, 22), todayMidnight, []).state).toBe('today');
  });

  it('is missed for a past day with nothing logged', () => {
    expect(dayStatus(d(2026, 6, 20), todayMidnight, []).state).toBe('missed');
  });

  it('is upcoming for a future day', () => {
    expect(dayStatus(d(2026, 6, 23), todayMidnight, []).state).toBe('upcoming');
  });
});

describe('getToday', () => {
  it('threads the requested cycle label + color through', () => {
    const home = getToday('home');
    expect(home.cycleLabel).toBe(MICROCYCLE.home.label);
    expect(home.cycleColor).toBe(MICROCYCLE.home.color);
    const fifo = getToday('fifo');
    expect(fifo.cycleLabel).toBe(MICROCYCLE.fifo.label);
  });

  it('falls back to the home cycle for an unknown mode', () => {
    expect(getToday('nonsense').cycleLabel).toBe(MICROCYCLE.home.label);
  });

  it('returns a live, date-aware shape', () => {
    const t = getToday('home');
    expect(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']).toContain(
      t.todayKey
    );
    expect(typeof t.dateStr).toBe('string');
    expect(t).toHaveProperty('today');
    expect(t).toHaveProperty('next');
  });
});

describe('getUpcomingSessions', () => {
  it('returns at most 3 future sessions sorted ascending', () => {
    const now = d(2026, 6, 22, 0); // Mon midnight, home week
    const out = getUpcomingSessions(now, []);
    expect(out.length).toBeGreaterThan(0);
    expect(out.length).toBeLessThanOrEqual(3);
    for (const s of out) {
      expect(s.when.getTime()).toBeGreaterThan(now.getTime());
      expect(s).toHaveProperty('label');
      expect(s).toHaveProperty('slot');
      expect(s).toHaveProperty('dow');
    }
    const times = out.map((s) => s.when.getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  it('skips days that already have logged work', () => {
    const now = d(2026, 6, 22, 0);
    const withLog = getUpcomingSessions(now, [{ date: '6/22/26', label: 'x' }]);
    const mondaySlots = withLog.filter((s) => s.dow === 'Mon');
    expect(mondaySlots).toHaveLength(0);
  });

  it('excludes slots earlier today but keeps later ones', () => {
    // 07:00 is past the 06:00 erg slot but before the 16:00 strength slot
    const now = d(2026, 6, 24, 7); // Wed fifo week
    const out = getUpcomingSessions(now, []);
    for (const s of out) {
      expect(s.when.getTime()).toBeGreaterThan(now.getTime());
    }
  });

  it('honours one-off overrides (CP test surfaces)', () => {
    const now = d(2026, 7, 1, 0); // override day
    const out = getUpcomingSessions(now, []);
    expect(out.some((s) => /CP TEST/.test(s.label))).toBe(true);
  });
});

describe('daySessions', () => {
  it('returns [] for a null/rest day', () => {
    expect(daySessions(null)).toEqual([]);
    expect(daySessions({ am: '—', pm: '—' })).toEqual([]);
  });

  it('emits one box per real session with slot labels', () => {
    const out = daySessions({ am: 'Erg', pm: 'Lower Day 1' });
    expect(out).toHaveLength(2);
    expect(out[0].slot).toBe('AM');
    expect(out[1].slot).toBe('PM');
  });

  it('treats pm "Rest" and am "—" as non-sessions', () => {
    expect(daySessions({ am: 'Erg', pm: 'Rest' })).toHaveLength(1);
    expect(daySessions({ am: '—', pm: 'Lower' })).toHaveLength(1);
  });

  it('prefers per-slot note/fuel/meal, falling back to day-level', () => {
    const perSlot = daySessions({
      am: 'Erg',
      amNote: 'amN',
      amFuel: 'amF',
      amMeal: { pre: 'p' },
    });
    expect(perSlot[0]).toMatchObject({ note: 'amN', fuel: 'amF' });
    expect(perSlot[0].meal).toEqual({ pre: 'p' });

    const dayLevel = daySessions({ am: 'Erg', note: 'dN', fuel: 'dF' });
    expect(dayLevel[0]).toMatchObject({ note: 'dN', fuel: 'dF' });
  });
});
