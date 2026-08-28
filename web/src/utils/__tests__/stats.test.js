import { describe, it, expect } from 'vitest';
import { mean, sampleStdDev } from '../stats.js';

describe('mean', () => {
  it('averages a series', () => {
    expect(mean([188, 193, 191, 197])).toBe(192.25);
  });

  it('handles a single value', () => {
    expect(mean([42])).toBe(42);
  });

  it('handles negatives and zero', () => {
    expect(mean([-2, 0, 2])).toBe(0);
  });

  it('throws on an empty series rather than returning NaN', () => {
    expect(() => mean([])).toThrow(/at least one/);
  });
});

describe('sampleStdDev', () => {
  // These are the values mathjs `std()` returned for the same inputs before it
  // was removed. They pin the n-1 divisor: swapping to a population n would
  // give 3.269… here and silently move the published HR130 spread.
  it('matches the mathjs std() it replaced', () => {
    expect(sampleStdDev([188, 193, 191, 197])).toBeCloseTo(
      3.774917217635375,
      12
    );
  });

  it('uses the n-1 (sample) divisor, not n', () => {
    // For [1, 3]: sample sd = sqrt(2) ≈ 1.4142; population sd would be 1.
    expect(sampleStdDev([1, 3])).toBeCloseTo(Math.SQRT2, 12);
  });

  it('is zero for a flat series', () => {
    expect(sampleStdDev([5, 5, 5])).toBe(0);
  });

  it('throws below two values, where a sample sd is undefined', () => {
    expect(() => sampleStdDev([1])).toThrow(/at least two/);
    expect(() => sampleStdDev([])).toThrow(/at least two/);
  });
});
