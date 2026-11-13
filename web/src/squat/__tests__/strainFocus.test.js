import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { directionAt, repInfo } from '../../anatomy/utils/rep.js';
import { PHASES } from '../constants/phases.js';
import { REGION_OF } from '../constants/muscleRegions.js';
import { TOP_N } from '../constants/activationBands.js';
import {
  focusKey,
  focusMask,
  regionMuscles,
  topActivated,
} from '../utils/strainFocus.js';

const manifest = JSON.parse(
  readFileSync(
    join(process.cwd(), 'src/squat/assets/squat-manifest.json'),
    'utf8'
  )
);
const MUSCLES = manifest.meta.muscles;

// A flat estimate of `v` (0-255) on both sides of the turn. REGION_OF is
// keyed on manifest index, so a toy's position picks its region:
// 0 → Hip extensors (0), 1-3 and 6-7 → abductors (5), 4-5 and 8 → hip
// flexors (4), 9 → Knee extensors (1).
const flat = (v) => ({
  name: `m${v}`,
  act: [Array(3).fill(v), Array(3).fill(v)],
});
const toy = (values) =>
  values.map((v, i) =>
    v === null ? { name: `none${i}`, act: null } : { ...flat(v), name: `m${i}` }
  );

describe('topActivated (criterion 8)', () => {
  it('ranks regions, not muscles, each named by its leading muscle', () => {
    // Region 5 holds the two hardest muscles; it still counts once.
    const m = toy([100, 250, 240, 10, 50, 60, 0, 0, 0, 200]);
    const top = topActivated(m, 0.5, 'lowering');
    expect(top.map((r) => r.region)).toEqual([5, 1, 0]);
    expect(top.map((r) => r.i)).toEqual([1, 9, 0]);
    expect(top[0]).toMatchObject({ region: 5, i: 1, name: 'm1' });
    expect(top[0].value).toBeCloseTo(250 / 255, 6);
  });

  it(`returns N = ${TOP_N} by default, and honours n`, () => {
    expect(TOP_N).toBe(3);
    const m = toy([100, 250, 240, 10, 50, 60, 0, 0, 0, 200]);
    expect(topActivated(m, 0.5, 'drive')).toHaveLength(3);
    expect(topActivated(m, 0.5, 'drive', 1)).toHaveLength(1);
    expect(topActivated(m, 0.5, 'drive', 10)).toHaveLength(4);
    expect(topActivated(m, 0.5, 'drive', 0)).toEqual([]);
    expect(topActivated([], 0.5, 'drive')).toEqual([]);
    expect(topActivated(undefined, 0.5, 'drive')).toEqual([]);
  });

  it('breaks a tie inside a region to the lower manifest index', () => {
    const m = toy([0, 0, 0, 0, 0, 90, 0, 0, 90, 0]);
    // 5 and 8 are both hip flexors at 90: 5 leads, whatever order they tie in.
    expect(topActivated(m, 0.5, 'lowering', 1)[0]).toMatchObject({
      region: 4,
      i: 5,
    });
  });

  it('breaks a tie between regions to region order', () => {
    // Knee extensors (1), hip flexors (4), abductors (5) and hip extensors
    // (0) all at 120: the regions come back in REGION_NAMES order.
    const m = toy([120, 120, 0, 0, 120, 0, 0, 0, 0, 120]);
    expect(topActivated(m, 0.5, 'lowering', 4).map((r) => r.region)).toEqual([
      0, 1, 4, 5,
    ]);
  });

  it('never leads with a muscle that has no estimate, or a tendon', () => {
    const m = toy([null, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    m[9] = { ...flat(255), name: 'tendon', tendon: true };
    m[1] = { ...flat(30), name: 'm1' };
    const top = topActivated(m, 0.5, 'lowering', 11);
    // Hip extensors (only a null muscle) and the knee (only a tendon) are out.
    expect(top.map((r) => r.region)).not.toContain(0);
    expect(top.map((r) => r.region)).not.toContain(1);
    expect(top[0]).toMatchObject({ region: 5, i: 1 });
  });

  it('carries the band as data the readout prints as text', () => {
    const m = toy([0, 250, 0, 0, 120, 0, 0, 0, 0, 30]);
    const bands = topActivated(m, 0.5, 'lowering').map((r) => r.band.name);
    expect(bands).toEqual(['High', 'Moderate', 'Low']);
  });

  it('on the real rep: three different regions, each with a real leader', () => {
    const top = topActivated(MUSCLES, 1, 'drive');
    expect(top).toHaveLength(3);
    expect(new Set(top.map((r) => r.region)).size).toBe(3);
    for (const r of top) {
      expect(REGION_OF[r.i]).toBe(r.region);
      expect(MUSCLES[r.i].name).toBe(r.name);
      expect(MUSCLES[r.i].tendon).toBeFalsy();
    }
    // Deterministic: the same frame gives the same answer, every time.
    expect(focusKey(topActivated(MUSCLES, 1, 'drive'))).toBe(focusKey(top));
  });
});

describe('the bottom straddles the turn (criterion 14)', () => {
  const info = repInfo(manifest.meta.rep, PHASES.length);
  const frames = Array.from({ length: 15 }, (_, k) => 101 + k);

  it('frames 101–115 are Bottom, and cross the turn', () => {
    expect(frames.every((f) => PHASES[info.ph[f]].name === 'Bottom')).toBe(
      true
    );
    const dirs = new Set(frames.map((f) => directionAt(info, f)));
    expect([...dirs].sort()).toEqual(['drive', 'lowering']);
  });

  it('reads each frame on its own side of the turn, with no flicker', () => {
    const keys = frames.map((f) =>
      focusKey(topActivated(MUSCLES, info.s[f], directionAt(info, f)))
    );
    // Each frame reads its own direction, not the phase's: on this rep the
    // lowering and drive sides at the same depth rank differently.
    const drive = frames.find((f) => directionAt(info, f) === 'drive');
    const last = frames.findLast((f) => directionAt(info, f) === 'lowering');
    expect(focusKey(topActivated(MUSCLES, info.s[drive], 'lowering'))).not.toBe(
      keys[frames.indexOf(drive)]
    );
    expect(keys[frames.indexOf(last)]).toBe(
      focusKey(topActivated(MUSCLES, info.s[last], 'lowering'))
    );
    // No oscillation: once the readout changes it never changes back, so
    // every run of equal keys is a key not seen before.
    const runs = keys.filter((k, j) => j === 0 || k !== keys[j - 1]);
    expect(new Set(runs).size).toBe(runs.length);
  });
});

describe('focusKey', () => {
  it('is equal for an equal readout, different when a band or leader moves', () => {
    const a = [{ region: 1, i: 10, band: { id: 'high' } }];
    expect(focusKey(a)).toBe(focusKey([{ ...a[0] }]));
    expect(focusKey(a)).not.toBe(focusKey([{ ...a[0], band: { id: 'mod' } }]));
    expect(focusKey(a)).not.toBe(focusKey([{ ...a[0], i: 11 }]));
    expect(focusKey([])).toBe('');
  });
});

describe('regionMuscles', () => {
  it('lists every muscle of the named regions, never a tendon', () => {
    const m = toy([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    m[2] = { ...m[2], tendon: true };
    expect(regionMuscles(m, [{ region: 5 }])).toEqual([1, 3, 6, 7]);
    expect(regionMuscles(m, [{ region: 1 }, { region: 0 }])).toEqual([0, 9]);
    expect(regionMuscles(m, [])).toEqual([]);
    expect(regionMuscles(undefined, [{ region: 5 }])).toEqual([]);
  });
});

describe('focusMask (criteria 10, 11)', () => {
  it('is null when there is nothing to emphasise', () => {
    expect(focusMask(5, [], null)).toBeNull();
    expect(focusMask(5, null, undefined)).toBeNull();
  });

  it('marks the top regions, and adds the selection to them', () => {
    expect([...focusMask(5, [0, 2], null)]).toEqual([1, 0, 1, 0, 0]);
    expect([...focusMask(5, [0, 2], 4)]).toEqual([1, 0, 1, 0, 1]);
    expect([...focusMask(5, [0, 2], 2)]).toEqual([1, 0, 1, 0, 0]);
  });

  it('with the heatmap off, marks the selection alone', () => {
    expect([...focusMask(4, [], 1)]).toEqual([0, 1, 0, 0]);
    expect([...focusMask(4, [], 0)]).toEqual([1, 0, 0, 0]);
  });

  it('ignores indices outside the model', () => {
    expect([...focusMask(3, [-1, 7, 1], 9)]).toEqual([0, 1, 0]);
    expect(focusMask(3, [], -1)).toBeNull();
  });
});
