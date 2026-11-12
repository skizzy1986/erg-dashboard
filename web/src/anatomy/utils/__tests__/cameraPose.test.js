import {
  cleanPose,
  degreeLimits,
  fromDegrees,
  toDegrees,
  wrapAngle,
} from '../cameraPose.js';

const LIMITS = {
  minPolar: 0.15,
  maxPolar: 1.62,
  minDistance: 0.6,
  maxDistance: 6,
};
const D = Math.PI / 180;

describe('wrapAngle', () => {
  it.each([
    [0, 0],
    [Math.PI, Math.PI],
    [-Math.PI, Math.PI],
    [3 * Math.PI, Math.PI],
    [1.5 * Math.PI, -0.5 * Math.PI],
    [-1.5 * Math.PI, 0.5 * Math.PI],
  ])('%f → %f, in (−π, π]', (a, b) => {
    expect(wrapAngle(a)).toBeCloseTo(b, 12);
  });
});

describe('cleanPose', () => {
  it('clamps polar and radius and wraps azimuth', () => {
    expect(
      cleanPose({ radius: 99, polar: 3, azimuth: 3 * Math.PI }, LIMITS)
    ).toEqual({ radius: 6, polar: 1.62, azimuth: Math.PI });
    expect(cleanPose({ radius: 0, polar: 0, azimuth: 0 }, LIMITS)).toEqual({
      radius: 0.6,
      polar: 0.15,
      azimuth: 0,
    });
  });

  it.each([
    [null],
    [undefined],
    [{ radius: NaN, polar: 1, azimuth: 0 }],
    [{ radius: 1, polar: Infinity, azimuth: 0 }],
    [{ radius: 1, polar: 1, azimuth: -Infinity }],
    [{ radius: 1, polar: 1 }],
    [{ radius: '1', polar: 1, azimuth: 0 }],
  ])('is null for %j, without throwing', (pose) => {
    expect(cleanPose(pose, LIMITS)).toBeNull();
  });
});

describe('degree form', () => {
  it('rounds the polar limits inwards', () => {
    expect(degreeLimits(LIMITS)).toEqual({
      minPol: 9,
      maxPol: 92,
      minDist: 0.6,
      maxDist: 6,
    });
  });

  it.each([
    [
      { azimuth: 540 * D, polar: 45 * D, radius: 2 },
      { az: 180, pol: 45, dist: 2 },
    ],
    [
      { azimuth: -180 * D, polar: 45 * D, radius: 2 },
      { az: 180, pol: 45, dist: 2 },
    ],
    [
      { azimuth: -0.4 * D, polar: 45 * D, radius: 2 },
      { az: 0, pol: 45, dist: 2 },
    ],
    [
      { azimuth: 0, polar: 0, radius: 2 },
      { az: 0, pol: 9, dist: 2 },
    ],
    [
      { azimuth: 0, polar: 200 * D, radius: 2 },
      { az: 0, pol: 92, dist: 2 },
    ],
    [
      { azimuth: 0, polar: 1, radius: 999 },
      { az: 0, pol: 57, dist: 6 },
    ],
    [
      { azimuth: 0, polar: 1, radius: 0.1 },
      { az: 0, pol: 57, dist: 0.6 },
    ],
    [
      { azimuth: 0, polar: 1, radius: 3.456 },
      { az: 0, pol: 57, dist: 3.46 },
    ],
  ])('toDegrees(%j) → %j', (pose, deg) => {
    const out = toDegrees(pose, LIMITS);
    expect(out).toEqual(deg);
    expect(Object.is(out.az, -0)).toBe(false);
  });

  it('fromDegrees is the inverse, cleaned, and null on junk', () => {
    const pose = fromDegrees({ az: -90, pol: 80, dist: 2 }, LIMITS);
    expect(pose.azimuth).toBeCloseTo(-Math.PI / 2, 12);
    expect(pose.polar).toBeCloseTo(80 * D, 12);
    expect(toDegrees(pose, LIMITS)).toEqual({ az: -90, pol: 80, dist: 2 });
    expect(fromDegrees({ az: 0, pol: 0, dist: 99 }, LIMITS)).toEqual({
      radius: 6,
      polar: 0.15,
      azimuth: 0,
    });
    expect(fromDegrees({ az: NaN, pol: 1, dist: 1 }, LIMITS)).toBeNull();
  });

  it('a degree triple is a fixed point of the round trip', () => {
    for (let az = -179; az <= 180; az += 17) {
      for (const pol of [9, 30, 61, 92]) {
        for (const dist of [0.6, 1.23, 3.6, 6]) {
          const d = { az, pol, dist };
          expect(toDegrees(fromDegrees(d, LIMITS), LIMITS)).toEqual(d);
        }
      }
    }
  });
});
