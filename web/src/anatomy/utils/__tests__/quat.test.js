import { composeColumnMajor, slerpR128, transformPoint } from '../quat.js';

const s2 = Math.SQRT1_2;

describe('slerpR128', () => {
  it('returns the ends exactly at t = 0 and t = 1', () => {
    expect(slerpR128([], 0, 0, 0, 1, 0, 0, s2, s2, 0)).toEqual([0, 0, 0, 1]);
    expect(slerpR128([], 0, 0, 0, 1, 0, 0, s2, s2, 1)).toEqual([0, 0, s2, s2]);
  });

  it('halves a 90° turn about z', () => {
    const q = slerpR128([], 0, 0, 0, 1, 0, 0, s2, s2, 0.5);
    const half = Math.PI / 8;
    expect(q[2]).toBeCloseTo(Math.sin(half), 12);
    expect(q[3]).toBeCloseTo(Math.cos(half), 12);
  });

  it('takes the short way when the dot product is negative', () => {
    const q = slerpR128([], 0, 0, 0, 1, 0, 0, -s2, -s2, 0.5);
    expect(q[3]).toBeGreaterThan(0);
    expect(q[2]).toBeCloseTo(Math.sin(Math.PI / 8), 12);
  });

  it('returns a when a and b are the same rotation', () => {
    expect(slerpR128([], 0, 0, 0, 1, 0, 0, 0, 1, 0.3)).toEqual([0, 0, 0, 1]);
  });

  it('stays true slerp very close together, where r187 would nlerp', () => {
    const a = 0.001;
    const q = slerpR128([], 0, 0, 0, 1, 0, 0, Math.sin(a), Math.cos(a), 0.25);
    expect(q[2]).toBeCloseTo(Math.sin(a * 0.25), 15);
  });

  it('falls back to a normalised lerp for a near-zero angle', () => {
    // The largest double below 1: cos(θ/2) < 1, so it is not the "same
    // rotation" early return, yet 1 − cos² is exactly Number.EPSILON.
    const w = 1 - 2 ** -53;
    const q = slerpR128([], 0, 0, 0, 1, 0, 0, 1e-8, w, 0.5);
    expect(Math.hypot(...q)).toBeCloseTo(1, 12);
    expect(q[2]).toBeCloseTo(0.5e-8, 15);
    expect(q[2]).toBeGreaterThan(0);
  });
});

describe('composeColumnMajor + transformPoint', () => {
  it('rotates then translates, column-major', () => {
    const m = composeColumnMajor(
      new Float64Array(16),
      0,
      1,
      2,
      3,
      0,
      0,
      s2,
      s2
    );
    expect(m[12]).toBe(1);
    expect(m[15]).toBe(1);
    // 90° about z: x → y.
    const p = transformPoint(m, 0, 1, 0, 0, [0, 0, 0]);
    expect(p[0]).toBeCloseTo(1, 12);
    expect(p[1]).toBeCloseTo(3, 12);
    expect(p[2]).toBeCloseTo(3, 12);
  });

  it('writes at an offset', () => {
    const m = composeColumnMajor(new Float64Array(32), 16, 0, 0, 0, 0, 0, 0, 1);
    expect(m[16]).toBe(1);
    expect(m[0]).toBe(0);
  });
});
