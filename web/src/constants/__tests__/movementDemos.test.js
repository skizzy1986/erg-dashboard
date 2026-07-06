import { describe, it, expect } from 'vitest';
import { MOVEMENT_DEMOS } from '../movementDemos.js';

describe('MOVEMENT_DEMOS schema', () => {
  it('is a plain object keyed by slug', () => {
    expect(typeof MOVEMENT_DEMOS).toBe('object');
    expect(MOVEMENT_DEMOS).not.toBeNull();
  });

  it('every entry has a valid name/phases/cues/pose shape', () => {
    for (const [slug, demo] of Object.entries(MOVEMENT_DEMOS)) {
      expect(typeof demo.name, `${slug}.name`).toBe('string');
      expect(demo.name.length, `${slug}.name`).toBeGreaterThan(0);
      expect(Array.isArray(demo.phases), `${slug}.phases`).toBe(true);
      expect(demo.phases.length, `${slug}.phases`).toBeGreaterThan(0);
      demo.phases.forEach((phase, i) => {
        const where = `${slug}.phases[${i}]`;
        expect(typeof phase.label, `${where}.label`).toBe('string');
        expect(Array.isArray(phase.cues), `${where}.cues`).toBe(true);
        expect(phase.cues.length, `${where}.cues`).toBeGreaterThan(0);
        expect(phase.pose && typeof phase.pose, `${where}.pose`).toBe('object');
      });
    }
  });
});
