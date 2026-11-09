import { depthIndex } from '../depth.js';

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
