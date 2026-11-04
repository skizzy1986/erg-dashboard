import { fmt, summariseRep } from '../utils/repSummary.js';

describe('fmt', () => {
  it('uses a true minus and never prints -0', () => {
    expect(fmt(-1.5, 1)).toBe('−1.5');
    expect(fmt(-0.001, 2)).toBe('0.00');
    expect(fmt(-0.01, 1)).toBe('0.0');
    expect(fmt(-0.2)).toBe('0');
    expect(fmt(3.14159, 2)).toBe('3.14');
    expect(fmt('2')).toBe('2');
  });
});

describe('summariseRep', () => {
  // A minimal synthetic meta: two depth samples, a short timeline.
  const row = (o) => ({
    knee: 0,
    hip: 0,
    ankle: 0,
    lean: 0,
    shin: 0,
    thigh: 0,
    lumbar: 0,
    depth: 0,
    bar: 0,
    cop: 50,
    lord: 40,
    klat: 0,
    Mhip: 100,
    Mknee: 100,
    Mank: 10,
    Mlum: 200,
    ...o,
  });
  const len = [100, 90];
  const meta = {
    S: [0, 1],
    readout: [row({}), row({ depth: -4, bar: -3, Mhip: 120 })],
    rep: {
      s: [0, 0.5, 1, 0.5, 0],
      ph: [0, 1, 2, 3, 4],
      f: [1, 0.9, 1.3, 1.1, 0.8],
      ecc: 1.5,
      con: 1,
      trans: 0.3,
      mcv: 0.6,
      vpk: 1.1,
      vecc: 0.5,
      fpk: 1.3,
      fmin: 0.8,
    },
    bw: 100,
    muscles: [
      'Gluteus maximus',
      'Adductor magnus',
      'Vastus lateralis',
      'Biceps femoris (long head)',
      'Soleus',
      'Rectus femoris',
    ].map((name) => ({
      name,
      len,
      act: [
        [0, 255],
        [0, 255],
      ],
    })),
  };

  it('derives the drift, ratio and length figures', () => {
    const s = summariseRep(meta);
    expect(s.checks[0]).toBe('3 mm drift, vertical path');
    expect(s.metrics[9]).toBe('1.20 at depth');
    expect(s.kv.lens).toContain('gluteus maximus −10%');
    expect(s.kv.fecc).toBe('0.90–0.90× system weight');
    expect(s.kv.flock).toBe('down to 0.80× system weight');
    expect(s.metrics[16]).toBe(
      'Vastus lateralis 90% lowering vs 90% driving at 90% depth'
    );
  });

  it('tolerates a missing arm block and activation table', () => {
    const s = summariseRep({
      ...meta,
      arm: undefined,
      muscles: meta.muscles.map((m) => ({ ...m, act: undefined })),
    });
    expect(s.metrics[16]).toBe(
      'Vastus lateralis 0% lowering vs 0% driving at 90% depth'
    );
  });
});
