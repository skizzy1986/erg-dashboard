import { describe, it, expect, afterEach, vi } from 'vitest';
import { toISODate, toLogDate } from '../dateFormat.js';

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
