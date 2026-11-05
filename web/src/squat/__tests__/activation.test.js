import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ACT_BANDS, HEAT_STOPS } from '../constants/activationBands.js';
import { HEAT_POSITIONS } from '../../anatomy/utils/sceneColours.js';
import {
  activationAt,
  activationOf,
  bandOf,
  peakBandOf,
} from '../utils/activation.js';

const manifest = JSON.parse(
  readFileSync(
    join(process.cwd(), 'src/squat/assets/squat-manifest.json'),
    'utf8'
  )
);
const MUSCLES = manifest.meta.muscles;
const GLUTE = MUSCLES[0];
const ITB = MUSCLES[7];

// Two stored samples per direction, so the arithmetic is checkable by hand.
const toy = [
  {
    name: 'a',
    act: [
      [0, 255],
      [51, 204],
    ],
  },
  { name: 'b', act: null, tendon: true },
];

describe('activationAt', () => {
  it("reads the direction's own series and scales 0-255 to 0-1", () => {
    expect([...activationAt(toy, 0, 'lowering')]).toEqual([0, 0]);
    expect(activationAt(toy, 1, 'lowering')[0]).toBeCloseTo(1, 6);
    expect(activationAt(toy, 0, 'drive')[0]).toBeCloseTo(51 / 255, 6);
    expect(activationAt(toy, 1, 'drive')[0]).toBeCloseTo(204 / 255, 6);
  });

  it('interpolates between stored samples', () => {
    expect(activationAt(toy, 0.5, 'lowering')[0]).toBeCloseTo(0.5, 6);
  });

  it('clamps depth outside 0-1 instead of running off the array', () => {
    expect(activationAt(toy, -3, 'lowering')[0]).toBe(0);
    expect(activationAt(toy, 9, 'lowering')[0]).toBeCloseTo(1, 6);
  });

  it('leaves a tendon, and an unknown direction, at a defined value', () => {
    expect(activationAt(toy, 0.5, 'lowering')[1]).toBe(0);
    // Anything that is not 'drive' is the lowering series, like the reducer.
    expect(activationAt(toy, 1, 'sideways')[0]).toBeCloseTo(1, 6);
  });

  it('returns one weight per muscle over the real 118', () => {
    const w = activationAt(MUSCLES, 0.9, 'drive');
    expect(w).toBeInstanceOf(Float32Array);
    expect(w).toHaveLength(118);
    expect(w[7]).toBe(0);
    expect(w[25]).toBe(0);
    for (const v of w) expect(v).toBeGreaterThanOrEqual(0);
    for (const v of w) expect(v).toBeLessThanOrEqual(1);
  });
});

describe('activationOf', () => {
  it('agrees with the bulk pass for one muscle', () => {
    const bulk = activationAt(MUSCLES, 0.75, 'drive');
    expect(activationOf(GLUTE, 0.75, 'drive')).toBeCloseTo(bulk[0], 6);
  });

  it('is null where there is no estimate at all', () => {
    expect(activationOf(ITB, 0.5, 'drive')).toBeNull();
    expect(activationOf(undefined, 0.5, 'drive')).toBeNull();
    expect(activationOf({ act: [[7], [7]] }, 0.5, 'drive')).toBeNull();
  });
});

describe('bandOf', () => {
  it("cuts at 0.30 and 0.60, the model's own ramp stops", () => {
    expect(bandOf(0).name).toBe('Low');
    expect(bandOf(0.299).name).toBe('Low');
    expect(bandOf(0.3).name).toBe('Moderate');
    expect(bandOf(0.599).name).toBe('Moderate');
    expect(bandOf(0.6).name).toBe('High');
    expect(bandOf(1).name).toBe('High');
  });

  it('clamps out-of-range numbers rather than returning undefined', () => {
    expect(bandOf(-1).name).toBe('Low');
    expect(bandOf(42).name).toBe('High');
  });

  it('is null for anything that is not a finite number', () => {
    for (const v of [null, undefined, NaN, Infinity, '0.5']) {
      expect(bandOf(v)).toBeNull();
    }
  });

  it('only ever returns one of the three published bands', () => {
    for (let v = 0; v <= 1.0001; v += 0.01) {
      expect(ACT_BANDS).toContain(bandOf(v));
    }
  });
});

describe('peakBandOf', () => {
  it('reports the hardest point in the rep and which side of the turn', () => {
    // toy's drive series tops out at 204 (0.8), its lowering at 255 (1).
    expect(peakBandOf(toy[0])).toEqual({
      id: 'high',
      name: 'High',
      where: 'lowering',
    });
    expect(
      peakBandOf({
        act: [
          [10, 10],
          [250, 250],
        ],
      })
    ).toMatchObject({ name: 'High', where: 'drive' });
  });

  it('is null for a tendon and for junk', () => {
    expect(peakBandOf(ITB)).toBeNull();
    expect(peakBandOf(null)).toBeNull();
    expect(peakBandOf({ act: [[], []] })).toBeNull();
  });

  it('shows a glute at the bottom as the point of the peak line', () => {
    // At 10% depth the glute reads Low, but it peaks High in the drive — the
    // reason the peak line is on the card at all.
    expect(bandOf(activationOf(GLUTE, 0.1, 'lowering')).name).toBe('Low');
    expect(peakBandOf(GLUTE)).toMatchObject({ name: 'High', where: 'drive' });
  });

  it('populates all three bands across the real data', () => {
    const counts = {};
    for (const m of MUSCLES) {
      const p = peakBandOf(m);
      counts[p ? p.id : 'none'] = (counts[p ? p.id : 'none'] ?? 0) + 1;
    }
    expect(counts).toEqual({ low: 83, mod: 21, high: 12, none: 2 });
  });
});

// One token, two readers: the legend prints band names against HEAT_STOPS and
// the scene paints the ramp against HEAT_POSITIONS. Let them drift and the
// model says High where the legend says Moderate. Asserted on the squat side
// because anatomy/ must not import from squat/.
describe('the ramp and the bands are the same cuts', () => {
  it('puts a ramp stop at 0, at every band cut, and at 1', () => {
    expect(HEAT_STOPS).toEqual([0, ...ACT_BANDS.map((b) => b.max)]);
    expect(HEAT_POSITIONS).toEqual(HEAT_STOPS);
  });

  it('gives each band exactly one swatch segment', () => {
    expect(HEAT_STOPS).toHaveLength(ACT_BANDS.length + 1);
  });
});
