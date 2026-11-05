import { blendTrunk } from '../lbs.js';

const translate = (x) => {
  const m = new Float32Array(16);
  m[0] = m[5] = m[10] = m[15] = 1;
  m[12] = x;
  return m;
};

describe('blendTrunk', () => {
  const frames = new Float32Array(48);
  frames.set(translate(0), 0);
  frames.set(translate(1), 16);
  frames.set(translate(10), 32);
  const rest = new Float32Array([0, 1, 2, 0, 1, 2]);

  it('puts the weight on frame i0, not i0 + 1', () => {
    const out = blendTrunk(
      new Float32Array(6),
      rest,
      new Uint8Array([0, 0]),
      new Uint8Array([255, 0]),
      frames,
      [0, 1, 2],
      2
    );
    expect([...out.slice(0, 3)]).toEqual([0, 1, 2]);
    expect([...out.slice(3)]).toEqual([1, 1, 2]);
  });

  it('maps local frame order through the slots and clamps k + 1', () => {
    const out = blendTrunk(
      new Float32Array(3),
      rest,
      new Uint8Array([1]),
      new Uint8Array([0]),
      frames,
      [2, 1],
      1
    );
    expect(out[0]).toBe(1);
  });
});
