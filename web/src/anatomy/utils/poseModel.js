import { viewArray } from '../../squat/utils/manifest.js';
import { dequantise } from '../../squat/utils/dequantise.js';
import { depthIndex } from './depth.js';
import { frameAt, staticMatrices } from './frames.js';
import { createCurves, curvesAt, skinCurveSet } from './curveSkin.js';
import { blendTrunk } from './lbs.js';

const shapeError = (what) =>
  new Error(`Anatomy data shape mismatch: ${what} does not match meta.S.`);

/**
 * The posing model, independent of any renderer: give it a depth, and it
 * writes the body frames and every deforming vertex into buffers it owns.
 *
 * Everything is allocated here, once. poseAt() allocates nothing, so a slider
 * drag does not feed the garbage collector. The scene copies `frames` into
 * object matrices and points its dynamic geometry at `cmPos` / `lbPos`. A
 * future rigged mesh (a clothed body) would read the same `frames`.
 */
export function createPoser(manifest, buffer) {
  const meta = manifest.meta;
  const ns = meta.S.length;
  const frameNames = meta.frames;
  const nf = frameNames.length;
  const A = (name) => viewArray(manifest, buffer, name);

  const fr = A('frames');
  if (fr.length !== ns * nf * 7) throw shapeError('frames');
  const cvPos = A('cv_pos');
  const cvQuat = A('cv_quat');
  const points = meta.curves.reduce((n, c) => n + c.n, 0) * ns;
  if (cvPos.length !== points * 3 || cvQuat.length !== points * 4) {
    throw shapeError('the curve arrays');
  }
  if (meta.curves.some((c) => c.sig.length !== ns)) {
    throw shapeError('a curve sig table');
  }

  const curves = createCurves(meta.curves, ns);
  const cm = {
    c1: A('cm_c1'),
    c2: A('cm_c2'),
    w: A('cm_w'),
    s1: A('cm_s1'),
    s2: A('cm_s2'),
    l1: A('cm_l1'),
    l2: A('cm_l2'),
  };
  const cmCount = meta.cm_nv;
  const lbm = meta.lbs;
  const lbRest = dequantise(A('lb_pos'), lbm.c, lbm.s);
  const lbI0 = A('lb_i0');
  const lbW = A('lb_w');
  const lbSlots = lbm.frames.map((n) => {
    const j = frameNames.indexOf(n);
    if (j < 0) throw new Error(`Trunk frame ${n} is not in meta.frames.`);
    return j;
  });

  const frames = new Float32Array(nf * 16);
  const staticMats = staticMatrices(meta.static);
  const cmPos = new Float32Array(cmCount * 3);
  const lbPos = new Float32Array(lbm.nv * 3);
  const slotOf = Object.fromEntries(frameNames.map((n, j) => [n, j]));

  function poseAt(s) {
    const d = depthIndex(s, ns);
    frameAt(frames, fr, nf, d.i0, d.i1, d.t);
    curvesAt(curves, cvPos, cvQuat, d.i0, d.i1, d.t);
    skinCurveSet(cmPos, cm, curves, meta.LQ, cmCount);
    blendTrunk(lbPos, lbRest, lbI0, lbW, frames, lbSlots, lbm.nv);
    return d;
  }

  /** The current matrix for a frame name, or a '@static' one. A live view. */
  function matrixFor(name) {
    if (name[0] === '@') {
      const m = staticMats[name];
      if (!m) throw new Error(`No static transform ${name}.`);
      return m;
    }
    const j = slotOf[name];
    if (j === undefined) throw new Error(`No frame ${name}.`);
    return frames.subarray(j * 16, j * 16 + 16);
  }

  return {
    ns,
    frameNames,
    frames,
    staticMats,
    cmPos,
    lbPos,
    cmCount,
    lbCount: lbm.nv,
    poseAt,
    matrixFor,
    curves,
  };
}
