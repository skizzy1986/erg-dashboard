import {
  cameraFor,
  DRIFT,
  framedOn,
  directorView,
  portraitPullback,
  TARGET_BOTTOM,
  TARGET_STAND,
  targetHeight,
} from '../directorShot.js';
import { shortestTurn } from '../../../anatomy/utils/cameraMath.js';

// The reference rep: 185 frames at 20 ms.
const info = { last: 184 };
const DT = 0.02;

describe('director drift (Ken Burns)', () => {
  it('is a pure function of the playhead', () => {
    expect(directorView(info, 77, 1)).toEqual(directorView(info, 77, 1));
  });

  it('carries on across the loop instead of rewinding', () => {
    const end = directorView(info, info.last, 0);
    const next = directorView(info, 0, 1);
    expect(Math.abs(shortestTurn(end.azimuth, next.azimuth))).toBeLessThan(
      0.01
    );
    expect(Math.abs(end.radius - next.radius)).toBeLessThan(0.01);
  });

  it('closes its cycle after DRIFT.reps reps', () => {
    const a = directorView(info, 0, 0);
    const b = directorView(info, 0, DRIFT.reps);
    expect(b.azimuth).toBeCloseTo(a.azimuth, 9);
    expect(b.polar).toBeCloseTo(a.polar, 9);
    expect(b.radius).toBeCloseTo(a.radius, 9);
  });

  it('stays slow: under 15°/s of orbit anywhere in the cycle', () => {
    let prev = directorView(info, 0, 0);
    let peak = 0;
    for (let n = 1; n < (info.last + 1) * DRIFT.reps; n++) {
      const v = directorView(info, n % (info.last + 1), Math.floor(n / 185));
      peak = Math.max(peak, Math.abs(shortestTurn(prev.azimuth, v.azimuth)));
      prev = v;
    }
    expect(peak / DT).toBeLessThan((15 * Math.PI) / 180);
  });

  it('wanders only a little from the resting three-quarter view', () => {
    for (let f = 0; f <= info.last; f += 23) {
      const v = directorView(info, f, 1);
      expect(Math.abs(v.azimuth - DRIFT.azimuth)).toBeLessThanOrEqual(
        DRIFT.azimuthSwing + 1e-9
      );
    }
  });

  it('follows the hips part of the way down', () => {
    expect(targetHeight(0)).toBe(TARGET_STAND);
    expect(targetHeight(1)).toBe(TARGET_BOTTOM);
    expect(targetHeight(2)).toBe(TARGET_BOTTOM);
  });

  it('pulls back on a portrait stage only', () => {
    expect(portraitPullback(16 / 9)).toBe(1);
    expect(portraitPullback(0)).toBe(1);
    expect(portraitPullback(0.5)).toBeGreaterThan(1.3);
  });

  it('returns null for the fixed camera and before the rep loads', () => {
    expect(cameraFor('manual', info, 10)).toBeNull();
    expect(cameraFor('director', null, 10)).toBeNull();
    expect(cameraFor('director', info, 10, 2)).toEqual(
      directorView(info, 10, 2)
    );
  });
});

describe('framedOn (push-in on a muscle)', () => {
  const rest = { azimuth: DRIFT.azimuth, polar: 1.34, radius: DRIFT.radius };

  it('leaves the whole-body view alone with no focus', () => {
    expect(framedOn(rest, null)).toEqual({ view: rest, at: null });
  });

  it('aims at the muscle, faces its side of the body and closes in', () => {
    const back = framedOn(rest, { centre: [-0.12, 0.9, 0.05], radius: 0.1 });
    expect(back.at).toEqual([-0.12, 0.9, 0.05]);
    expect(
      Math.abs(shortestTurn(back.view.azimuth, Math.atan2(-0.12, 0.05)))
    ).toBeLessThan(1e-9);
    expect(back.view.radius).toBeCloseTo(0.9, 6);
  });

  it('keeps the default side for a midline muscle and caps the distance', () => {
    const mid = framedOn(rest, { centre: [0.01, 1.2, 0], radius: 1 });
    expect(mid.view.azimuth).toBeCloseTo(DRIFT.azimuth, 9);
    expect(mid.view.radius).toBeCloseTo(2.2, 6);
  });
});
