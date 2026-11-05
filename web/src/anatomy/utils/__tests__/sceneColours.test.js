import { DARK, LIGHT } from '../../../constants/themeValues.js';
import { SCENE_STYLE, sceneStyle } from '../../constants/sceneStyle.js';
import {
  heatColours,
  HEAT_POSITIONS,
  hexToRaw01,
  hslToRgb,
  jitteredMuscle,
  muscleColours,
  rampAt,
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

describe('the activation ramp', () => {
  const STOPS = [
    [0, [0, 0, 0]],
    [0.5, [1, 0, 0]],
    [1, [1, 1, 1]],
  ];

  it('is a sorted 0-1 ramp, so every weight lands between two stops', () => {
    // The squat-side half of this — that these positions are exactly the band
    // cuts the legend prints — is asserted in
    // squat/__tests__/activation.test.js. It cannot live here: anatomy/ does
    // not reach into squat/.
    expect(HEAT_POSITIONS[0]).toBe(0);
    expect(HEAT_POSITIONS.at(-1)).toBe(1);
    expect([...HEAT_POSITIONS].sort((a, b) => a - b)).toEqual(HEAT_POSITIONS);
    expect(new Set(HEAT_POSITIONS).size).toBe(HEAT_POSITIONS.length);
  });

  it('returns a stop exactly at its own position', () => {
    expect(rampAt(STOPS, 0)).toEqual([0, 0, 0]);
    expect(rampAt(STOPS, 0.5)).toEqual([1, 0, 0]);
    expect(rampAt(STOPS, 1)).toEqual([1, 1, 1]);
  });

  it('lerps RGB between the bracketing stops', () => {
    expect(rampAt(STOPS, 0.25)).toEqual([0.5, 0, 0]);
    rampAt(STOPS, 0.75).forEach((x, i) =>
      expect(x).toBeCloseTo([1, 0.5, 0.5][i], 12)
    );
  });

  it('clamps out-of-range and non-finite weights to the ends', () => {
    expect(rampAt(STOPS, -1)).toEqual([0, 0, 0]);
    expect(rampAt(STOPS, 2)).toEqual([1, 1, 1]);
    expect(rampAt(STOPS, NaN)).toEqual([0, 0, 0]);
  });

  it('survives degenerate stop lists', () => {
    expect(rampAt([], 0.5)).toEqual([0, 0, 0]);
    expect(rampAt(undefined, 0.5)).toEqual([0, 0, 0]);
    expect(rampAt([[0.3, [0.2, 0.4, 0.6]]], 0.9)).toEqual([0.2, 0.4, 0.6]);
    expect(
      rampAt(
        [
          [0.5, [1, 0, 0]],
          [0.5, [0, 1, 0]],
        ],
        0.5
      )
    ).toEqual([1, 0, 0]);
  });

  it('reads the four heat tokens as raw channels on both themes', () => {
    for (const t of ['light', 'dark']) {
      const heat = scenePalette(t).heat;
      expect(heat.map(([p]) => p)).toEqual(HEAT_POSITIONS);
      expect(heat).toHaveLength(4);
      for (const [, rgb] of heat) {
        expect(rgb).toHaveLength(3);
        for (const c of rgb) expect(c).toBeGreaterThanOrEqual(0);
      }
    }
    expect(scenePalette('light').heat[0][1]).toEqual(
      hexToRaw01(LIGHT.anatomyHeatLow)
    );
  });
});

describe('heatColours', () => {
  const pal = scenePalette('dark');
  const muscles = [{}, { tendon: true }, {}];

  it('gives a ramp colour per muscle and the tendon colour to tendons', () => {
    const cols = heatColours(
      muscles,
      new Float32Array([0, 0.5, 1]),
      pal.heat,
      pal.tendon
    );
    expect(cols).toBeInstanceOf(Float32Array);
    expect(cols).toHaveLength(9);
    expect([...cols.slice(0, 3)]).toEqual(rampAt(pal.heat, 0).map(Math.fround));
    // Tendons carry no estimate, so the weight at index 1 is ignored.
    expect([...cols.slice(3, 6)]).toEqual(pal.tendon.map(Math.fround));
    expect([...cols.slice(6, 9)]).toEqual(rampAt(pal.heat, 1).map(Math.fround));
  });

  it('treats a missing weight as zero rather than NaN', () => {
    const cols = heatColours(
      muscles,
      new Float32Array(0),
      pal.heat,
      pal.tendon
    );
    for (const c of cols) expect(Number.isFinite(c)).toBe(true);
    expect([...cols.slice(0, 3)]).toEqual(rampAt(pal.heat, 0).map(Math.fround));
    expect(heatColours(muscles, undefined, pal.heat, pal.tendon)).toHaveLength(
      9
    );
  });

  it('separates Low from High visibly', () => {
    expect(rampAt(pal.heat, 0)).not.toEqual(rampAt(pal.heat, 1));
  });
});

// The scene's setActivation(null) must restore byte-identical anatomy colours.
// The scene module itself needs WebGL (covered by e2e), so what is asserted
// here is the write it performs: the same inputs produce the same bytes, and
// the heat write in between leaves nothing behind.
describe('switching the heatmap off restores the exact anatomy colours', () => {
  const pal = scenePalette('light');
  const st = SCENE_STYLE.light;
  const muscles = [{}, { tendon: true }, {}, {}];
  const mid = new Uint8Array([0, 1, 2, 3, 0, 2]);
  const tw = new Uint8Array([0, 255, 120, 30, 200, 0]);
  const write = (mc, blend) =>
    writeVertexColours(
      new Float32Array(mid.length * 3),
      mid,
      tw,
      mc,
      pal.tendon,
      blend
    );

  it('is byte-identical before and after a heat pass', () => {
    const anatomy = () =>
      write(muscleColours(muscles, pal, st.jitter), st.tendonBlend);
    const before = anatomy();
    const heat = write(
      heatColours(
        muscles,
        new Float32Array([0.2, 0.4, 0.8, 1]),
        pal.heat,
        pal.tendon
      ),
      st.tendonBlendHeat
    );
    const after = anatomy();
    expect([...after]).toEqual([...before]);
    expect([...heat]).not.toEqual([...before]);
  });

  it('uses the softer tendon blend under the heatmap', () => {
    expect(st.tendonBlendHeat).toBeLessThan(st.tendonBlend);
    expect(st.tendonBlendHeat).toBe(0.75);
  });
});
