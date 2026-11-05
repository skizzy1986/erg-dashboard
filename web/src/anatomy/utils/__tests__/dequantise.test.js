import { dequantise } from '../dequantise.js';

describe('dequantise', () => {
  it('dequantises int16 positions per axis', () => {
    const out = dequantise(
      new Int16Array([1, 2, 3, -1, 0, 1]),
      [10, 20, 30],
      0.5
    );
    expect(out).toBeInstanceOf(Float32Array);
    expect([...out]).toEqual([10.5, 21, 31.5, 9.5, 20, 30.5]);
  });

  it('returns an empty array for empty input', () => {
    expect(dequantise(new Int16Array(0), [0, 0, 0], 1).length).toBe(0);
  });
});
