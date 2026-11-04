import { DARK, LIGHT } from '../../../constants/themeValues.js';
import { SCENE_STYLE, sceneStyle } from '../../constants/sceneStyle.js';
import {
  hexToRaw01,
  hslToRgb,
  jitteredMuscle,
  muscleColours,
  rgbToHsl,
  scenePalette,
  writeVertexColours,
} from '../sceneColours.js';

const J = SCENE_STYLE.dark.jitter;

describe('colour conversions', () => {
  it('reads hex as raw channels, no linearisation', () => {
    expect(hexToRaw01('#ff8000')).toEqual([1, 128 / 255, 0]);
  });
  it('round-trips HSL', () => {
    for (const c of [
      [0.2, 0.4, 0.6],
      [0.9, 0.1, 0.1],
      [0.1, 0.8, 0.3],
      [0.5, 0.5, 0.5],
      [0.7, 0.6, 0.9],
    ]) {
      const back = hslToRgb(...rgbToHsl(c));
      back.forEach((x, i) => expect(x).toBeCloseTo(c[i], 12));
    }
  });
  it('wraps hue and clamps saturation and lightness, like setHSL', () => {
    hslToRgb(1.25, 2, 0.5).forEach((x, i) =>
      expect(x).toBeCloseTo(hslToRgb(0.25, 1, 0.5)[i], 12)
    );
    expect(hslToRgb(0.3, 0, -1)).toEqual([0, 0, 0]);
  });
});

describe('muscle jitter', () => {
  it('is deterministic and centred on the token', () => {
    const base = hexToRaw01(DARK.anatomyMuscle);
    expect(jitteredMuscle(base, 5, J)).toEqual(jitteredMuscle(base, 5, J));
    expect(jitteredMuscle(base, 0, J)).not.toEqual(jitteredMuscle(base, 1, J));
  });

  it('dark muscle 0 matches the source page within 1/255', () => {
    // The page: setHSL(0.995 + ((i·37)%11 − 5)·0.0035, 0.58 + ((i·13)%5)·0.025,
    // 0.36 + ((i·7)%5)·0.018) at i = 0.
    const page = hslToRgb(0.995 - 5 * 0.0035, 0.58, 0.36);
    const ours = jitteredMuscle(hexToRaw01(DARK.anatomyMuscle), 0, J);
    ours.forEach((x, i) => expect(Math.abs(x - page[i])).toBeLessThan(1 / 255));
  });

  it('paints tendons in the tendon colour', () => {
    const pal = scenePalette('dark');
    const cols = muscleColours([{ tendon: true }, {}], pal, J);
    expect([...cols.slice(0, 3)]).toEqual(pal.tendon.map(Math.fround));
    expect(cols[3]).not.toBe(Math.fround(pal.tendon[0]));
  });
});

describe('writeVertexColours', () => {
  it('blends towards tendon by tw/255 × blend', () => {
    const mc = new Float32Array([0, 0, 0]);
    const out = writeVertexColours(
      new Float32Array(6),
      new Uint8Array([0, 0]),
      new Uint8Array([0, 255]),
      mc,
      [1, 1, 1],
      0.9
    );
    expect([...out.slice(0, 3)]).toEqual([0, 0, 0]);
    expect(out[3]).toBeCloseTo(0.9, 6);
    const heat = writeVertexColours(
      new Float32Array(3),
      new Uint8Array([0]),
      new Uint8Array([255]),
      mc,
      [1, 1, 1],
      SCENE_STYLE.dark.tendonBlendHeat
    );
    expect(heat[0]).toBeCloseTo(0.75, 6);
  });
});

describe('scenePalette and sceneStyle', () => {
  it('reads the anatomy tokens for each theme', () => {
    expect(scenePalette('dark').muscle).toEqual(hexToRaw01(DARK.anatomyMuscle));
    expect(scenePalette('light').bar).toEqual(hexToRaw01(LIGHT.anatomyBar));
    expect(scenePalette('light').shadow).not.toEqual(
      scenePalette('dark').shadow
    );
  });
  it('falls back to light for an unknown theme', () => {
    expect(sceneStyle('dark')).toBe(SCENE_STYLE.dark);
    expect(sceneStyle('nope')).toBe(SCENE_STYLE.light);
  });
});
