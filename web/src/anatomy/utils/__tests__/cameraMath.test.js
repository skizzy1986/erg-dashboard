import {
  clampDistance,
  framingDistance,
  fromOffset,
  orbit,
  PRESET_AZIMUTH,
  PRESET_DIRECTION,
  shortestTurn,
  toOffset,
  tweenSpherical,
  zoom,
} from '../cameraMath.js';

describe('spherical ↔ offset', () => {
  it('round-trips in three’s convention', () => {
    const s = { radius: 3, polar: 1.1, azimuth: 0.4 };
    const back = fromOffset(toOffset(s));
    expect(back.radius).toBeCloseTo(3, 12);
    expect(back.polar).toBeCloseTo(1.1, 12);
    expect(back.azimuth).toBeCloseTo(0.4, 12);
    expect(fromOffset([0, 0, 0])).toEqual({ radius: 0, polar: 0, azimuth: 0 });
  });

  it('places each preset camera on its named side', () => {
    for (const [name, dir] of Object.entries(PRESET_DIRECTION)) {
      const o = toOffset({
        radius: 1,
        polar: Math.PI / 2,
        azimuth: PRESET_AZIMUTH[name],
      });
      o.forEach((x, i) => expect(x).toBeCloseTo(dir[i], 12));
    }
    expect(PRESET_DIRECTION.left).toEqual([0, 0, -1]);
    expect(PRESET_DIRECTION.front).toEqual([1, 0, 0]);
  });
});

describe('orbit and zoom', () => {
  it('clamps the polar angle', () => {
    const s = orbit({ radius: 2, polar: 1, azimuth: 0 }, 0.5, 5, 0.1, 1.5);
    expect(s).toEqual({ radius: 2, polar: 1.5, azimuth: 0.5 });
    expect(orbit(s, 0, -9, 0.1, 1.5).polar).toBe(0.1);
  });
  it('clamps zoom to 0.6–6 m', () => {
    expect(zoom({ radius: 1 }, 0.1).radius).toBe(0.6);
    expect(zoom({ radius: 5 }, 2).radius).toBe(6);
    expect(zoom({ radius: 2 }, 0.5).radius).toBe(1);
    expect(clampDistance(3, 1, 2)).toBe(2);
  });
});

describe('framing and tweening', () => {
  it('backs off further for a narrow aspect', () => {
    const wide = framingDistance(1, 35, 2);
    const tall = framingDistance(1, 35, 0.5);
    expect(tall).toBeGreaterThan(wide);
    expect(wide).toBeCloseTo(1 / Math.sin((35 * Math.PI) / 360), 9);
  });
  it('turns the short way round', () => {
    expect(shortestTurn(3, -3)).toBeCloseTo(2 * Math.PI - 6, 12);
    expect(shortestTurn(0, Math.PI)).toBeCloseTo(Math.PI, 12);
    expect(shortestTurn(Math.PI, 0)).toBeCloseTo(Math.PI, 12);
  });
  it('eases from start to end', () => {
    const a = { radius: 1, polar: 1, azimuth: 0 };
    const b = { radius: 3, polar: 2, azimuth: 1 };
    expect(tweenSpherical(a, b, 0)).toEqual(a);
    expect(tweenSpherical(a, b, 1)).toEqual(b);
    expect(tweenSpherical(a, b, 0.5).radius).toBeCloseTo(2, 12);
    expect(tweenSpherical(a, b, 0.25).radius).toBeLessThan(1.5);
  });
});
