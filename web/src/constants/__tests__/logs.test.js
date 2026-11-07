import { describe, it, expect } from 'vitest';
import { LIPID_REF, HORMONE_REF } from '../logs.js';

const hasText = (v) => typeof v === 'string' && v.trim().length > 0;

describe('logs reference tables', () => {
  it('every LIPID_REF row carries a source', () => {
    expect(LIPID_REF.length).toBeGreaterThanOrEqual(1);
    for (const row of LIPID_REF) {
      expect(hasText(row.source)).toBe(true);
    }
  });

  it('every HORMONE_REF row carries a source', () => {
    expect(HORMONE_REF.length).toBeGreaterThanOrEqual(1);
    for (const row of HORMONE_REF) {
      expect(hasText(row.source)).toBe(true);
    }
  });

  it('LIPID_REF rows keep marker/unit/target strings', () => {
    for (const row of LIPID_REF) {
      expect(hasText(row.marker)).toBe(true);
      expect(hasText(row.unit)).toBe(true);
      expect(hasText(row.target)).toBe(true);
    }
  });
});
