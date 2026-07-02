import { describe, it, expect } from 'vitest';
import { toISODate } from '../dateFormat.js';

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
