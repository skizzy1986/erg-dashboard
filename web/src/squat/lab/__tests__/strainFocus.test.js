import { topMuscles } from '../strainFocus.js';
import { fadeExcept } from '../../../anatomy/utils/sceneColours.js';

const muscles = [
  { name: 'A', act: [[], []] },
  { name: 'B', act: [[], []] },
  { name: 'T', tendon: true },
  { name: 'C', act: [[], []] },
  { name: 'D' },
];

describe('topMuscles', () => {
  it('ranks by weight, breaks ties by order, skips tendons and no-data', () => {
    const w = Float32Array.from([0.5, 0.9, 1, 0.5, 1]);
    expect(topMuscles(muscles, w, 3)).toEqual([1, 0, 3]);
    expect(topMuscles(muscles, w, 1)).toEqual([1]);
  });

  it('drops zero weights and handles missing input', () => {
    expect(topMuscles(muscles, Float32Array.from([0, 0, 0, 0.1, 0]))).toEqual([
      3,
    ]);
    expect(topMuscles(null, null)).toEqual([]);
  });
});

describe('fadeExcept', () => {
  it('greys every muscle not kept and leaves kept ones alone', () => {
    const cols = Float32Array.from([1, 0, 0, 0, 1, 0]);
    fadeExcept(cols, new Set([1]), 1);
    expect(Array.from(cols.slice(0, 3)).map((x) => +x.toFixed(2))).toEqual([
      0.3, 0.3, 0.3,
    ]);
    expect(Array.from(cols.slice(3))).toEqual([0, 1, 0]);
    expect(fadeExcept(cols, null)).toBe(cols);
  });
});
