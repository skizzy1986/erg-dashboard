import { describe, it, expect } from 'vitest';
import { MOBILITY_ROUTINES } from '../mobility.js';

const PERSONAL =
  /rehab|physio|\bleft (side|hamstring|glute)\b|on the left|\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b/i;

const textFields = (obj) =>
  Object.entries(obj).filter(([, v]) => typeof v === 'string');

describe('MOBILITY_ROUTINES copy', () => {
  it('has routines with blocks to check', () => {
    expect(MOBILITY_ROUTINES.length).toBeGreaterThan(0);
    for (const r of MOBILITY_ROUTINES)
      expect(r.blocks.length).toBeGreaterThan(0);
  });

  it('names no injury, injured side or roster slot in any routine field', () => {
    for (const r of MOBILITY_ROUTINES) {
      for (const [key, value] of textFields(r)) {
        expect(value, `${r.id}.${key}`).not.toMatch(PERSONAL);
      }
    }
  });

  it('names no injury, injured side or roster slot in any block field', () => {
    for (const r of MOBILITY_ROUTINES) {
      r.blocks.forEach((b, i) => {
        for (const [key, value] of textFields(b)) {
          expect(value, `${r.id}.blocks[${i}].${key}`).not.toMatch(PERSONAL);
        }
      });
    }
  });

  it('carries no rehab flag on any block', () => {
    for (const r of MOBILITY_ROUTINES) {
      for (const b of r.blocks) expect(b).not.toHaveProperty('rehab');
    }
  });

  it('keeps instructional laterality inside a movement', () => {
    const visuals = MOBILITY_ROUTINES.flatMap((r) =>
      r.blocks.map((b) => b.visual)
    );
    expect(visuals.some((v) => /right foot forward/.test(v))).toBe(true);
  });
});
