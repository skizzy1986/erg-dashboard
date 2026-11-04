import {
  createCurves,
  curvesAt,
  evalBind,
  skinCurveSet,
} from '../curveSkin.js';

// One straight curve along +x: 3 points, nseg 2 (n = K·nseg + 1, K = 1),
// identity quaternions, two depth samples where the second is shifted +y.
const NS = 2;
const meta = [{ n: 3, nseg: 2, sig: [1, 0.5] }];
const cvPos = new Int16Array([
  0, 0, 0, 2000, 0, 0, 4000, 0, 0, 0, 2000, 0, 2000, 2000, 0, 4000, 2000, 0,
]);
const cvQuat = new Int16Array(NS * 3 * 4);
for (let i = 0; i < NS * 3; i++) cvQuat[i * 4 + 3] = 32767;

const posed = (t) => {
  const curves = createCurves(meta, NS);
  curvesAt(curves, cvPos, cvQuat, 0, 1, t);
  return curves;
};

describe('curvesAt', () => {
  it('scales, offsets y by 0.8, lerps sig and normalises quaternions', () => {
    const [c] = posed(0.5);
    expect(c.P[3]).toBeCloseTo(0.1, 12);
    expect(c.P[4]).toBeCloseTo(0.85, 12);
    expect(c.s).toBe(0.75);
    expect(c.Q[3]).toBe(1);
  });
  it('lays curves out back to back across samples', () => {
    const cs = createCurves([...meta, ...meta], NS);
    expect(cs[1].off).toBe(NS * 3);
  });
});

describe('evalBind', () => {
  it('maps s = 4000 per span and scales only y and z by sig', () => {
    const [c] = posed(1);
    const out = evalBind(c, 2000, 100, 100, 100, 1e-4, [0, 0, 0]);
    // u = 2000/4000·2 = 1 → point 1, (0.1, 0.9, 0).
    expect(out[0]).toBeCloseTo(0.1 + 0.01, 12);
    expect(out[1]).toBeCloseTo(0.9 + 0.005, 12);
    expect(out[2]).toBeCloseTo(0.005, 12);
  });
  it('clamps j to the last span at the curve end', () => {
    const [c] = posed(0);
    const end = evalBind(c, 4000, 0, 0, 0, 1e-4, [0, 0, 0]);
    expect(end[0]).toBeCloseTo(0.2, 12);
    const past = evalBind(c, 9000, 0, 0, 0, 1e-4, [0, 0, 0]);
    expect(past[0]).toBeCloseTo(0.45, 12);
  });
  it('rotates the offset by the curve quaternion', () => {
    const curves = createCurves(meta, NS);
    const q = new Int16Array(cvQuat.length);
    // 90° about z everywhere: local +x offset → world +y.
    for (let i = 0; i < NS * 3; i++) {
      q[i * 4 + 2] = 23170;
      q[i * 4 + 3] = 23170;
    }
    curvesAt(curves, cvPos, q, 0, 1, 0);
    const out = evalBind(curves[0], 0, 1000, 0, 0, 1e-4, [0, 0, 0]);
    expect(out[0]).toBeCloseTo(0, 6);
    expect(out[1]).toBeCloseTo(0.9, 6);
  });
});

describe('skinCurveSet', () => {
  const curves = posed(0);
  const cm = {
    c1: new Uint8Array([0, 0]),
    c2: new Uint8Array([0, 0]),
    w: new Uint8Array([255, 128]),
    s1: new Uint16Array([0, 0]),
    s2: new Uint16Array([4000, 4000]),
    l1: new Int16Array(6),
    l2: new Int16Array(6),
  };
  it('skips curve 2 at w = 255 and blends with w on curve 1 below it', () => {
    const out = skinCurveSet(new Float32Array(6), cm, curves, 1e-4, 2);
    expect(out[0]).toBeCloseTo(0, 6);
    const w = 128 / 255;
    expect(out[3]).toBeCloseTo(0 * w + 0.2 * (1 - w), 6);
  });
});
