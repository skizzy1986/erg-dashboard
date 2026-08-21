import { describe, it, expect, afterEach, vi } from 'vitest';
import { EVENT_LADDER } from '../../constants/schedule.js';
import {
  BENCHMARK_GRACE_DAYS,
  addCalendarDays,
  benchmarkKeywords,
  diffCalendarDays,
  parseEventWindow,
  todayISO,
  tokenize,
} from '../eventWindow.js';

describe('parseEventWindow', () => {
  // P1 — every live EVENT_LADDER date string, including the en-dash range, the
  // '~' fuzzy marker, the 🎯 emoji and the 'Wed' weekday prefix.
  const LIVE = [
    ['Wed 1 Jul 26', '2026-07-01', '2026-07-01', false],
    ['~Mid Jul 26', '2026-07-11', '2026-07-20', true],
    ['~Early Aug 26', '2026-08-01', '2026-08-10', true],
    ['12 Sep–9 Oct 26', '2026-09-12', '2026-10-09', false],
    ['Nov–Dec 26', '2026-11-01', '2026-12-31', true],
    ['~Mid Jan 27', '2027-01-11', '2027-01-20', true],
    ['Late Jan 27', '2027-01-21', '2027-01-31', true],
    ['🎯 Late Feb 27', '2027-02-21', '2027-02-28', true],
    ['Early Mar 27', '2027-03-01', '2027-03-10', true],
  ];

  it.each(LIVE)('parses %s', (input, start, end, fuzzy) => {
    expect(parseEventWindow(input)).toEqual({ start, end, fuzzy });
  });

  it('covers every date string in the live ladder', () => {
    for (const entry of EVENT_LADDER) {
      expect(parseEventWindow(entry.date)).not.toBeNull();
    }
    expect(LIVE.map((l) => l[0])).toEqual(EVENT_LADDER.map((e) => e.date));
  });

  // AC2c — fuzzy source vs exact source.
  it('marks a qualifier window fuzzy and an explicit day exact', () => {
    expect(parseEventWindow('~Mid Jul 26').fuzzy).toBe(true);
    expect(parseEventWindow('Wed 1 Jul 26').fuzzy).toBe(false);
  });

  it('rolls the start year back when the range crosses New Year', () => {
    expect(parseEventWindow('Nov–Jan 27')).toEqual({
      start: '2026-11-01',
      end: '2027-01-31',
      fuzzy: true,
    });
  });

  it('honours a year carried by the first part of a range', () => {
    expect(parseEventWindow('1 Dec 26–5 Jan 27')).toEqual({
      start: '2026-12-01',
      end: '2027-01-05',
      fuzzy: false,
    });
  });

  it('accepts long and 4-letter month spellings', () => {
    expect(parseEventWindow('Sept 26').start).toBe('2026-09-01');
    expect(parseEventWindow('September 26').end).toBe('2026-09-30');
  });

  it('uses the real last day of a leap February', () => {
    expect(parseEventWindow('Late Feb 28').end).toBe('2028-02-29');
  });

  // P2 — unparseable input never throws and never guesses.
  it.each([
    ['', 'empty'],
    [null, 'null'],
    [undefined, 'undefined'],
    ['someday', 'prose'],
    ['31 Feb 27', 'impossible day'],
    ['not a date', 'no month'],
    ['   ', 'whitespace'],
    [42, 'non-string'],
    ['Jul-Aug-Sep 26', 'three parts'],
    ['Mid Jul', 'no year'],
    ['99 Jul 26', 'day out of range'],
    ['1 Sep 26–1 Jul 26', 'end before start'],
  ])('returns null for %s (%s)', (input) => {
    expect(parseEventWindow(input)).toBeNull();
  });
});

describe('benchmarkKeywords', () => {
  // P3 — the exact keyword sets for the five real benchmarks.
  it.each([
    ['CP Test #1 (4-min)', ['cp', '4min']],
    ['CP Test #2 (2nd duration)', ['cp']],
    ['5k Time Trial', ['5k', '5000m']],
    ['2k Test', ['2k', '2000m']],
    ['1000m + 1-min tune-ups', ['1000m', '1k', '1min']],
  ])('derives %s', (name, expected) => {
    expect(benchmarkKeywords(name)).toEqual(expected);
  });

  // Scott's real labels spell 5k both ways ('5,000m', 'PM — 5,000m' in the live
  // table; '5k TT' in newer rows). Both spellings have to reach the same
  // keyword set or the badge can never clear.
  it('expands k-notation and metre-notation into each other', () => {
    expect(benchmarkKeywords('10k Test')).toEqual(['10k', '10000m']);
    expect(benchmarkKeywords('10000m Test')).toEqual(['10000m', '10k']);
  });

  it('leaves a distance it cannot round-trip alone', () => {
    expect(benchmarkKeywords('500m Test')).toEqual(['500m']);
    expect(benchmarkKeywords('6k5 Test')).toEqual(['6k5']);
  });

  it('returns an empty list when nothing identifies the benchmark', () => {
    expect(benchmarkKeywords('Erg Power Series')).toEqual([]);
    expect(benchmarkKeywords('')).toEqual([]);
    expect(benchmarkKeywords(null)).toEqual([]);
  });

  it('dedupes repeated keywords', () => {
    expect(benchmarkKeywords('CP test, CP retest (4-min / 4min)')).toEqual([
      'cp',
      '4min',
    ]);
  });
});

describe('tokenize', () => {
  it('folds a digit-letter hyphen but keeps separate numbers apart', () => {
    expect(tokenize('UT2 40min recovery @ 130-142W')).toEqual([
      'ut2',
      '40min',
      'recovery',
      '130',
      '142w',
    ]);
    expect(tokenize('CP Test #1 (4-min)')).toEqual(['cp', 'test', '1', '4min']);
  });

  // A comma between digits is a thousands separator, not a separator between
  // two tokens — Scott's real 5k rows are labelled '5,000m'.
  it('keeps a digit-grouping comma inside one token', () => {
    expect(tokenize('5,000m')).toEqual(['5000m']);
    expect(tokenize('PM — 5,000m')).toEqual(['pm', '5000m']);
    expect(tokenize('1,234,567m')).toEqual(['1234567m']);
  });

  it('still splits on a comma that is not between digits', () => {
    expect(tokenize('Row, then bike')).toEqual(['row', 'then', 'bike']);
    expect(tokenize('5, 000m')).toEqual(['5', '000m']);
    expect(tokenize('Zwift Loopin Lava — 35:45, 18.5km, 212m')).toEqual([
      'zwift',
      'loopin',
      'lava',
      '35',
      '45',
      '18',
      '5km',
      '212m',
    ]);
  });

  // The letter-then-digit hyphen must NOT fold: folding it turns 'Row-2k' into
  // 'row2k' and destroys the token the 2k Test benchmark matches on.
  it('keeps a digit token that follows a hyphenated word', () => {
    expect(tokenize('Row-2k test')).toEqual(['row', '2k', 'test']);
    expect(tokenize('PM-5000m')).toEqual(['pm', '5000m']);
  });

  it('returns an empty list for empty input', () => {
    expect(tokenize('')).toEqual([]);
    expect(tokenize(null)).toEqual([]);
  });
});

describe('calendar arithmetic', () => {
  it('counts whole days between ISO dates', () => {
    expect(diffCalendarDays('2026-07-20', '2026-08-20')).toBe(31);
    expect(diffCalendarDays('2026-08-20', '2026-08-20')).toBe(0);
    expect(diffCalendarDays('2026-08-20', '2026-08-11')).toBe(-9);
  });

  it('adds and subtracts days across month boundaries', () => {
    expect(addCalendarDays('2026-07-11', -BENCHMARK_GRACE_DAYS)).toBe(
      '2026-06-27'
    );
    expect(addCalendarDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(addCalendarDays('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('returns null for malformed input', () => {
    expect(diffCalendarDays('7/20/26', '2026-08-20')).toBeNull();
    expect(diffCalendarDays('2026-08-20', null)).toBeNull();
    expect(addCalendarDays('nope', 1)).toBeNull();
    expect(addCalendarDays('2026-08-20', NaN)).toBeNull();
  });
});

// TZ — the timezone boundary. todayISO() must report the LOCAL calendar day.
describe('timezone safety', () => {
  afterEach(() => {
    vi.useRealTimers();
    delete globalThis.process.env.TZ;
  });

  it('todayISO reports the local day, not the UTC one, past local midnight', () => {
    globalThis.process.env.TZ = 'Australia/Perth';
    vi.useFakeTimers();
    // 2026-08-20T16:30Z is already 2026-08-21 00:30 in Perth (UTC+8).
    vi.setSystemTime(new Date('2026-08-20T16:30:00Z'));
    expect(new Date().toISOString().slice(0, 10)).toBe('2026-08-20');
    expect(todayISO()).toBe('2026-08-21');
  });

  it('diffCalendarDays is identical either side of the date line', () => {
    globalThis.process.env.TZ = 'Pacific/Kiritimati';
    const east = diffCalendarDays('2026-07-20', '2026-08-20');
    globalThis.process.env.TZ = 'Pacific/Niue';
    const west = diffCalendarDays('2026-07-20', '2026-08-20');
    expect(east).toBe(31);
    expect(west).toBe(31);
  });

  it('parseEventWindow is unaffected by the host timezone', () => {
    globalThis.process.env.TZ = 'Pacific/Kiritimati';
    expect(parseEventWindow('~Mid Jul 26').start).toBe('2026-07-11');
    globalThis.process.env.TZ = 'Pacific/Niue';
    expect(parseEventWindow('~Mid Jul 26').start).toBe('2026-07-11');
  });
});
