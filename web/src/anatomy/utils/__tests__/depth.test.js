import {
  depthIndex,
  derivePhase,
  PHASE_CHIPS,
  sampleToS,
  stepAlongRep,
  sToSample,
} from '../depth.js';

describe('depthIndex', () => {
  it('applies the page rule, with S = 1 on the last pair at t = 1', () => {
    expect(depthIndex(0, 41)).toEqual({ i0: 0, i1: 1, t: 0 });
    expect(depthIndex(0.5, 41)).toEqual({ i0: 20, i1: 21, t: 0 });
    expect(depthIndex(1, 41)).toEqual({ i0: 39, i1: 40, t: 1 });
    const d = depthIndex(0.3125, 41);
    expect([d.i0, d.i1]).toEqual([12, 13]);
    expect(d.t).toBeCloseTo(0.5, 12);
  });

  it('works for any sample count and clamps out-of-range depth', () => {
    expect(depthIndex(1, 5)).toEqual({ i0: 3, i1: 4, t: 1 });
    expect(depthIndex(-0.2, 5)).toEqual({ i0: 0, i1: 1, t: 0 });
    expect(depthIndex(7, 5)).toEqual({ i0: 3, i1: 4, t: 1 });
  });
});

describe('sample ↔ S', () => {
  it('round-trips and rounds to the nearest sample', () => {
    expect(sampleToS(20, 41)).toBe(0.5);
    expect(sToSample(0.5, 41)).toBe(20);
    expect(sToSample(0.51, 41)).toBe(20);
    expect(sToSample(2, 41)).toBe(40);
  });
});

describe('derivePhase', () => {
  it.each([
    [0, 'lowering', 'Standing'],
    [0.05, 'lowering', 'Standing'],
    [0.05, 'drive', 'Lockout'],
    [0.3, 'lowering', 'Descent'],
    [0.3, 'drive', 'Drive'],
    [0.975, 'lowering', 'Bottom'],
    [1, 'drive', 'Bottom'],
  ])('S %s %s → %s', (s, dir, phase) => {
    expect(derivePhase(s, dir)).toBe(phase);
  });

  it('each chip lands on its own phase', () => {
    for (const c of PHASE_CHIPS) {
      expect(derivePhase(c.s, c.direction ?? 'lowering')).toBe(c.name);
    }
    expect(PHASE_CHIPS.find((c) => c.name === 'Bottom').direction).toBeNull();
  });
});

describe('stepAlongRep', () => {
  const ns = 41;
  it('walks down while lowering', () => {
    expect(stepAlongRep({ sample: 3, direction: 'lowering' }, 1, ns)).toEqual({
      sample: 4,
      direction: 'lowering',
    });
  });
  it('turns at the bottom: lowering → drive, then shallower', () => {
    const turn = stepAlongRep({ sample: 40, direction: 'lowering' }, 1, ns);
    expect(turn).toEqual({ sample: 40, direction: 'drive' });
    expect(stepAlongRep(turn, 1, ns)).toEqual({
      sample: 39,
      direction: 'drive',
    });
    expect(stepAlongRep(turn, -1, ns)).toEqual({
      sample: 40,
      direction: 'lowering',
    });
  });
  it('jumps by five across the turn', () => {
    expect(stepAlongRep({ sample: 38, direction: 'lowering' }, 5, ns)).toEqual({
      sample: 38,
      direction: 'drive',
    });
  });
  it('stops at lockout going forward and at standing going back', () => {
    expect(stepAlongRep({ sample: 0, direction: 'drive' }, 1, ns)).toEqual({
      sample: 0,
      direction: 'drive',
    });
    expect(stepAlongRep({ sample: 0, direction: 'lowering' }, -1, ns)).toEqual({
      sample: 0,
      direction: 'lowering',
    });
    expect(stepAlongRep({ sample: 1, direction: 'drive' }, 3, ns)).toEqual({
      sample: 0,
      direction: 'drive',
    });
  });
});
