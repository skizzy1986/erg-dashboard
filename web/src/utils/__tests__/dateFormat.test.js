import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  toISODate,
  toLogDate,
  logEntriesForDate,
  clockTime,
} from '../dateFormat.js';

describe('toISODate', () => {
  it('normalizes "7/9/26" to 2026-07-09', () => {
    expect(toISODate('7/9/26')).toBe('2026-07-09');
  });
  it('normalizes "6/12/26" to 2026-06-12', () => {
    expect(toISODate('6/12/26')).toBe('2026-06-12');
  });
  it('normalizes "7/1/26" to 2026-07-01', () => {
    expect(toISODate('7/1/26')).toBe('2026-07-01');
  });
  it('passes an already-ISO string through unchanged', () => {
    expect(toISODate('2026-06-13')).toBe('2026-06-13');
  });
  it('returns empty string for null', () => {
    expect(toISODate(null)).toBe('');
  });
  it('returns empty string for undefined', () => {
    expect(toISODate(undefined)).toBe('');
  });
  it('returns empty string for empty string', () => {
    expect(toISODate('')).toBe('');
  });
  it('returns empty string for unparseable input', () => {
    expect(toISODate('not-a-date')).toBe('');
  });

  it('produces ISO output that sorts correctly where raw text did not', () => {
    expect(toISODate('6/12/26') < toISODate('6/2/26')).toBe(false);
    expect(toISODate('6/2/26') < toISODate('6/12/26')).toBe(true);
  });
});

function localISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

describe('toLogDate', () => {
  afterEach(() => {
    vi.useRealTimers();
    delete globalThis.process.env.TZ;
  });

  it('formats a Date as unpadded M/D/YY', () => {
    expect(toLogDate(new Date(2026, 7, 18))).toBe('8/18/26');
  });

  it('does not zero-pad a two-digit month with a single-digit day', () => {
    expect(toLogDate(new Date(2026, 11, 1))).toBe('12/1/26');
  });

  it('converts an ISO date string to M/D/YY', () => {
    expect(toLogDate('2026-08-18')).toBe('8/18/26');
    expect(toLogDate('2026-12-01')).toBe('12/1/26');
  });

  it('passes M/D/YY through unchanged and is idempotent', () => {
    expect(toLogDate('8/18/26')).toBe('8/18/26');
    expect(toLogDate(toLogDate('8/18/26'))).toBe('8/18/26');
    expect(toLogDate(toLogDate(new Date(2026, 7, 18)))).toBe('8/18/26');
  });

  it('falls back to today for null, undefined and unparseable input', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 18, 9, 0));
    expect(toLogDate(null)).toBe('8/18/26');
    expect(toLogDate(undefined)).toBe('8/18/26');
    expect(toLogDate('')).toBe('8/18/26');
    expect(toLogDate('garbage')).toBe('8/18/26');
    expect(toLogDate(new Date('nope'))).toBe('8/18/26');
  });

  it('round-trips through toISODate back to the local ISO date', () => {
    for (const d of [
      new Date(2026, 0, 1),
      new Date(2026, 7, 18),
      new Date(2026, 11, 31),
    ]) {
      expect(toISODate(toLogDate(d))).toBe(localISO(d));
    }
  });

  it('uses the local calendar day, not the UTC one, late at night', () => {
    globalThis.process.env.TZ = 'America/New_York';
    // 2026-08-19T03:30Z is still 2026-08-18 23:30 in New York. A UTC-based
    // implementation would file this session against the wrong day.
    const lateNight = new Date(Date.UTC(2026, 7, 19, 3, 30));
    expect(lateNight.toISOString().slice(0, 10)).toBe('2026-08-19');
    expect(toLogDate(lateNight)).toBe('8/18/26');
  });
});

describe('logEntriesForDate', () => {
  it('builds an unpadded M/D/YY key and never matches a padded one', () => {
    const rows = [
      { date: '7/9/30', label: 'Unpadded' },
      { date: '07/09/30', label: 'Padded' },
    ];
    expect(logEntriesForDate(new Date(2030, 6, 9), rows)).toEqual([rows[0]]);
  });

  it('handles a single-digit month with a double-digit day and the reverse', () => {
    const rows = [
      { date: '3/14/30', label: 'March' },
      { date: '11/5/30', label: 'November' },
    ];
    expect(logEntriesForDate(new Date(2030, 2, 14), rows)).toEqual([rows[0]]);
    expect(logEntriesForDate(new Date(2030, 10, 5), rows)).toEqual([rows[1]]);
  });

  it('rolls December 31 over to January 1 of the next year', () => {
    const rows = [
      { date: '12/31/30', label: 'NYE' },
      { date: '1/1/31', label: 'NYD' },
    ];
    expect(logEntriesForDate(new Date(2030, 11, 31), rows)).toEqual([rows[0]]);
    expect(logEntriesForDate(new Date(2030, 11, 31 + 1), rows)).toEqual([
      rows[1],
    ]);
  });

  it('pads the two-digit year', () => {
    const rows = [{ date: '1/5/00', label: 'Y2K' }];
    expect(logEntriesForDate(new Date(2000, 0, 5), rows)).toEqual(rows);
  });

  it('returns [] when nothing matches', () => {
    expect(
      logEntriesForDate(new Date(2030, 0, 2), [{ date: '1/3/30' }])
    ).toEqual([]);
  });

  it('treats a null or undefined list as empty', () => {
    expect(logEntriesForDate(new Date(2030, 0, 2), null)).toEqual([]);
    expect(logEntriesForDate(new Date(2030, 0, 2), undefined)).toEqual([]);
  });

  it('returns [] for an invalid Date rather than matching today', () => {
    const today = new Date();
    const rows = [{ date: toLogDate(today), label: 'Today' }];
    expect(logEntriesForDate(new Date('nope'), rows)).toEqual([]);
    expect(logEntriesForDate(undefined, rows)).toEqual([]);
  });

  it('is status-blind: cancelled and completed rows on one day both return', () => {
    const rows = [
      { date: '4/2/30', label: 'A', status: 'cancelled' },
      { date: '4/2/30', label: 'B', status: 'completed' },
    ];
    expect(logEntriesForDate(new Date(2030, 3, 2), rows)).toEqual(rows);
  });
});

describe('clockTime', () => {
  afterEach(() => {
    delete globalThis.process.env.TZ;
  });

  it('renders the local 24-hour wall clock, zero-padded', () => {
    expect(clockTime(new Date(2026, 7, 18, 7, 5).getTime())).toBe('07:05');
    expect(clockTime(new Date(2026, 7, 18, 23, 59))).toBe('23:59');
  });

  it('uses the local zone, not UTC, either side of midnight', () => {
    globalThis.process.env.TZ = 'Australia/Perth';
    // 16:30Z is 00:30 the next day in Perth (UTC+8, no DST).
    expect(clockTime(Date.UTC(2026, 7, 20, 16, 30))).toBe('00:30');
  });
});
