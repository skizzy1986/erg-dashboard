import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  cameraFor,
  DIRECTOR_SHOTS,
  directorView,
  keyFrames,
  portraitPullback,
  shotFor,
  showoffView,
  TARGET_BOTTOM,
  TARGET_STAND,
  targetHeight,
} from '../directorShot.js';
import { shortestTurn } from '../../../anatomy/utils/cameraMath.js';

const rep = JSON.parse(
  readFileSync(
    join(process.cwd(), 'src/squat/assets/squat-manifest.json'),
    'utf8'
  )
).meta.rep;
const starts = [];
rep.ph.forEach((c, f) => {
  if (starts[c] === undefined) starts[c] = f;
});
const info = { starts, last: rep.ph.length - 1 };

const close = (a, b) => {
  expect(a.radius).toBeCloseTo(b.radius, 6);
  expect(a.polar).toBeCloseTo(b.polar, 6);
  expect(Math.abs(shortestTurn(a.azimuth, b.azimuth))).toBeLessThan(1e-6);
};

describe('director shot', () => {
  it('holds each phase key shot at the middle of its phase', () => {
    const keys = keyFrames(info);
    expect(keys).toHaveLength(5);
    keys.forEach((f, k) => close(directorView(info, f), DIRECTOR_SHOTS[k]));
  });

  it('is a pure function of the frame', () => {
    expect(directorView(info, 77)).toEqual(directorView(info, 77));
  });

  // A hard cut would be a large step in one 20 ms frame.
  it('never cuts between adjacent frames, including across the loop', () => {
    let prev = directorView(info, 0);
    for (let f = 1; f <= info.last; f++) {
      const v = directorView(info, f);
      expect(Math.abs(shortestTurn(prev.azimuth, v.azimuth))).toBeLessThan(0.2);
      expect(Math.abs(v.polar - prev.polar)).toBeLessThan(0.05);
      prev = v;
    }
    close(directorView(info, info.last), directorView(info, 0));
  });

  it('puts a front-on, low shot at the bottom so knee track is visible', () => {
    const bottom = shotFor(2);
    expect(Math.abs(shortestTurn(bottom.azimuth, Math.PI / 2))).toBeLessThan(
      0.2
    );
    expect(bottom.polar).toBeGreaterThan(1.5);
  });

  it('pulls back on a portrait stage only', () => {
    expect(portraitPullback(16 / 9)).toBe(1);
    expect(portraitPullback(0)).toBe(1);
    expect(portraitPullback(0.5)).toBeGreaterThan(1.3);
  });

  it('follows the hips down', () => {
    expect(targetHeight(0)).toBe(TARGET_STAND);
    expect(targetHeight(1)).toBe(TARGET_BOTTOM);
    expect(targetHeight(2)).toBe(TARGET_BOTTOM);
  });
});

describe('show-off and mode routing', () => {
  it('orbits once per rep and meets itself at the loop', () => {
    close(showoffView(info, 0, 0), {
      ...showoffView(info, info.last, 0),
    });
    expect(showoffView(info, 0, 1).radius).toBeLessThan(
      showoffView(info, 0, 0).radius
    );
  });

  it('returns null for the fixed camera and before the rep loads', () => {
    expect(cameraFor('manual', info, 10, 0)).toBeNull();
    expect(cameraFor('director', null, 10, 0)).toBeNull();
    expect(cameraFor('director', info, 10, 0)).toEqual(directorView(info, 10));
    expect(cameraFor('showoff', info, 10, 0.2)).toEqual(
      showoffView(info, 10, 0.2)
    );
    expect(shotFor(9)).toBeNull();
  });
});
