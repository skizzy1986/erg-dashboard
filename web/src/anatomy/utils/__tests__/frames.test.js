import { frameAt, staticMatrices } from '../frames.js';

describe('frameAt', () => {
  it('lerps position, slerps rotation, per frame', () => {
    const s2 = Math.SQRT1_2;
    // Two samples, one frame: identity at origin → 90° about z at (2, 0, 0).
    const fr = new Float32Array([0, 0, 0, 0, 0, 0, 1, 2, 0, 0, 0, 0, s2, s2]);
    const out = frameAt(new Float32Array(16), fr, 1, 0, 1, 0.5);
    expect(out[12]).toBeCloseTo(1, 6);
    const c = Math.cos(Math.PI / 4);
    expect(out[0]).toBeCloseTo(c, 6);
    expect(out[1]).toBeCloseTo(c, 6);
  });
});

describe('staticMatrices', () => {
  it('transposes the manifest rows into column-major and prefixes @', () => {
    const rows = [
      [1, 2, 3, 4],
      [5, 6, 7, 8],
      [9, 10, 11, 12],
      [0, 0, 0, 1],
    ];
    const m = staticMatrices({ foot: rows })['@foot'];
    expect([...m.slice(0, 4)]).toEqual([1, 5, 9, 0]);
    expect([...m.slice(12)]).toEqual([4, 8, 12, 1]);
  });

  it('tolerates no static entries', () => {
    expect(staticMatrices(undefined)).toEqual({});
  });
});
