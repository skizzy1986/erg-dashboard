import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  resolveEventWindow,
  parseLadderDateText,
} from '../eventLadderDates.js';
import { EVENT_LADDER } from '../../constants/schedule.js';

function ymd(d) {
  return [d.getFullYear(), d.getMonth(), d.getDate()];
}

describe('parseLadderDateText', () => {
  afterEach(() => {
    vi.useRealTimers();
    delete globalThis.process.env.TZ;
  });

  it('parses "Wed 1 Jul 26" as a single exact day', () => {
    const w = parseLadderDateText('Wed 1 Jul 26');
    expect(ymd(w.start)).toEqual([2026, 6, 1]);
    expect(ymd(w.end)).toEqual([2026, 6, 1]);
    expect(ymd(w.overdueAfter)).toEqual([2026, 6, 1]);
    expect(w.approximate).toBe(false);
    expect(w.source).toBe('parsed');
  });

  it('parses "1 Jul 26" without a weekday prefix', () => {
    const w = parseLadderDateText('1 Jul 26');
    expect(ymd(w.start)).toEqual([2026, 6, 1]);
    expect(ymd(w.end)).toEqual([2026, 6, 1]);
  });

  it('parses "~Mid Jul 26" as 11-20 Jul with a month-end overdueAfter', () => {
    const w = parseLadderDateText('~Mid Jul 26');
    expect(ymd(w.start)).toEqual([2026, 6, 11]);
    expect(ymd(w.end)).toEqual([2026, 6, 20]);
    expect(ymd(w.overdueAfter)).toEqual([2026, 6, 31]);
    expect(w.approximate).toBe(true);
  });

  it('parses "~Early Aug 26" as 1-10 Aug with a month-end overdueAfter', () => {
    const w = parseLadderDateText('~Early Aug 26');
    expect(ymd(w.start)).toEqual([2026, 7, 1]);
    expect(ymd(w.end)).toEqual([2026, 7, 10]);
    expect(ymd(w.overdueAfter)).toEqual([2026, 7, 31]);
  });

  it('parses "Late Jan 27" as 21-31 Jan', () => {
    const w = parseLadderDateText('Late Jan 27');
    expect(ymd(w.start)).toEqual([2027, 0, 21]);
    expect(ymd(w.end)).toEqual([2027, 0, 31]);
  });

  it('parses a cross-month en-dash range "12 Sep–9 Oct 26"', () => {
    const w = parseLadderDateText('12 Sep–9 Oct 26');
    expect(ymd(w.start)).toEqual([2026, 8, 12]);
    expect(ymd(w.end)).toEqual([2026, 9, 9]);
  });

  it('parses a month-to-month range "Nov–Dec 26"', () => {
    const w = parseLadderDateText('Nov–Dec 26');
    expect(ymd(w.start)).toEqual([2026, 10, 1]);
    expect(ymd(w.end)).toEqual([2026, 11, 31]);
    expect(w.approximate).toBe(true);
  });

  it('parses a bare "Aug 26" as the whole month', () => {
    const w = parseLadderDateText('Aug 26');
    expect(ymd(w.start)).toEqual([2026, 7, 1]);
    expect(ymd(w.end)).toEqual([2026, 7, 31]);
  });

  it('strips a leading emoji prefix: "🎯 Late Feb 27"', () => {
    const w = parseLadderDateText('🎯 Late Feb 27');
    expect(ymd(w.start)).toEqual([2027, 1, 21]);
    expect(ymd(w.end)).toEqual([2027, 1, 28]);
  });

  it('is leap-year safe: "Late Feb 28" ends on the 29th', () => {
    const w = parseLadderDateText('Late Feb 28');
    expect(ymd(w.end)).toEqual([2028, 1, 29]);
  });

  it('returns null on garbage rather than guessing', () => {
    for (const bad of [
      '',
      null,
      undefined,
      'TBC',
      'sometime',
      '99 Xyz 26',
      '99 Jul 26',
      'Nov–Xyz 26',
      'Late Xyz 27',
      'Xyz 26',
      '32 Jan-9 Oct 26',
      '12 Sep-99 Oct 26',
      '12 Xyz-9 Oct 26',
    ]) {
      expect(parseLadderDateText(bad)).toBeNull();
    }
  });

  it('never falls back to today for unparseable input (the toLogDate trap)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 20, 9, 0));
    expect(parseLadderDateText('TBC')).toBeNull();
    expect(parseLadderDateText('sometime')).toBeNull();
    // and a good parse is unaffected by the mocked clock
    const w = parseLadderDateText('Wed 1 Jul 26');
    for (const d of [w.start, w.end, w.overdueAfter]) {
      expect(ymd(d)).not.toEqual([2026, 7, 20]);
    }
  });

  it('keeps its boundary days under a negative-offset timezone', () => {
    globalThis.process.env.TZ = 'America/New_York';
    expect(ymd(parseLadderDateText('Wed 1 Jul 26').start)).toEqual([
      2026, 6, 1,
    ]);
    const mid = parseLadderDateText('~Mid Jul 26');
    expect(mid.start.getDate()).toBe(11);
    expect(mid.end.getDate()).toBe(20);
    expect(mid.overdueAfter.getDate()).toBe(31);
    const structured = resolveEventWindow({
      date: '~Early Aug 26',
      windowStart: '2026-08-01',
      windowEnd: '2026-08-10',
    });
    expect(structured.start.getDate()).toBe(1);
    expect(structured.end.getDate()).toBe(10);
  });
});

describe('resolveEventWindow', () => {
  it('prefers a structured window over the free-text date and never widens it', () => {
    const w = resolveEventWindow({
      date: '~Early Aug 26',
      windowStart: '2026-08-01',
      windowEnd: '2026-08-10',
    });
    expect(w.source).toBe('structured');
    expect(w.approximate).toBe(false);
    expect(ymd(w.start)).toEqual([2026, 7, 1]);
    expect(ymd(w.end)).toEqual([2026, 7, 10]);
    expect(w.overdueAfter).toEqual(w.end);
  });

  it('falls back to the free-text date when the structured fields are malformed', () => {
    const w = resolveEventWindow({
      date: 'Late Jan 27',
      windowStart: '2027-1-1',
      windowEnd: '2027-01-20',
    });
    expect(w.source).toBe('parsed');
    expect(ymd(w.start)).toEqual([2027, 0, 21]);
  });

  it('returns null for a null entry', () => {
    expect(resolveEventWindow(null)).toBeNull();
  });

  it('resolves every real EVENT_LADDER entry to a non-null window', () => {
    expect(EVENT_LADDER.length).toBe(9);
    for (const entry of EVENT_LADDER) {
      const w = resolveEventWindow(entry);
      expect(w, `${entry.name} (${entry.date})`).not.toBeNull();
      expect(w.start.getTime()).toBeLessThanOrEqual(w.end.getTime());
      expect(w.overdueAfter.getTime()).toBeGreaterThanOrEqual(w.end.getTime());
    }
  });
});
