import { smoothDamp } from '../../../anatomy/utils/cameraMath.js';

describe('smoothDamp', () => {
  it('reaches the goal in about its smooth time without overshoot', () => {
    const st = { v: 0 };
    let x = 0;
    let max = 0;
    for (let i = 0; i < 120; i++) {
      x = smoothDamp(x, 1, st, 0.5, 1 / 60);
      max = Math.max(max, x);
    }
    expect(x).toBeGreaterThan(0.99);
    expect(max).toBeLessThanOrEqual(1 + 1e-9);
  });

  it('is gentle at the start: no jump on the first frame', () => {
    const st = { v: 0 };
    expect(smoothDamp(0, 1, st, 0.5, 1 / 60)).toBeLessThan(0.01);
  });

  it('tracks a moving goal with a bounded lag', () => {
    const st = { v: 0 };
    let x = 0;
    let goal = 0;
    for (let i = 0; i < 600; i++) {
      goal += 0.1 / 60;
      x = smoothDamp(x, goal, st, 0.5, 1 / 60);
    }
    expect(goal - x).toBeLessThan(0.06);
  });
});
