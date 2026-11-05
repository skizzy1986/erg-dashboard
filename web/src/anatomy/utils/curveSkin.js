// Curve-skinned muscles (SKINNING.md §1). Each vertex rides one or two
// muscle-path curves; the curves are interpolated per depth and the vertices
// re-evaluated from them — posed positions are never interpolated.
//
// Quaternions are nlerped everywhere here (across depth and along the curve),
// never slerped: that is what the page does, and where neighbouring frames
// differ a lot slerp lands on different points.

const CURVE_POS_SCALE = 5e-5;
const CURVE_Y_OFFSET = 0.8;
// cm_s1/cm_s2 are a span parameter, 4000 per spline span — not arclength.
const SPAN = 4000;

/** Preallocated per-curve state; `off` indexes cv_pos/cv_quat by point. */
export function createCurves(curveMeta, ns) {
  let off = 0;
  return curveMeta.map((c) => {
    const o = {
      n: c.n,
      nseg: c.nseg,
      sig: c.sig,
      off,
      P: new Float64Array(c.n * 3),
      Q: new Float64Array(c.n * 4),
      s: 1,
    };
    off += ns * c.n;
    return o;
  });
}

export function curvesAt(curves, cvPos, cvQuat, i0, i1, t) {
  for (const c of curves) {
    const a = c.off + i0 * c.n;
    const b = c.off + i1 * c.n;
    const P = c.P;
    const Q = c.Q;
    for (let j = 0; j < c.n; j++) {
      const pa = (a + j) * 3;
      const pb = (b + j) * 3;
      P[j * 3] = (cvPos[pa] + (cvPos[pb] - cvPos[pa]) * t) * CURVE_POS_SCALE;
      P[j * 3 + 1] =
        (cvPos[pa + 1] + (cvPos[pb + 1] - cvPos[pa + 1]) * t) *
          CURVE_POS_SCALE +
        CURVE_Y_OFFSET;
      P[j * 3 + 2] =
        (cvPos[pa + 2] + (cvPos[pb + 2] - cvPos[pa + 2]) * t) * CURVE_POS_SCALE;
      // Raw int16 lerp then normalise: the /32767 cancels, so it is skipped.
      const qa = (a + j) * 4;
      const qb = (b + j) * 4;
      const x = cvQuat[qa] + (cvQuat[qb] - cvQuat[qa]) * t;
      const y = cvQuat[qa + 1] + (cvQuat[qb + 1] - cvQuat[qa + 1]) * t;
      const z = cvQuat[qa + 2] + (cvQuat[qb + 2] - cvQuat[qa + 2]) * t;
      const w = cvQuat[qa + 3] + (cvQuat[qb + 3] - cvQuat[qa + 3]) * t;
      const L = 1 / Math.hypot(x, y, z, w);
      Q[j * 4] = x * L;
      Q[j * 4 + 1] = y * L;
      Q[j * 4 + 2] = z * L;
      Q[j * 4 + 3] = w * L;
    }
    c.s = c.sig[i0] + (c.sig[i1] - c.sig[i0]) * t;
  }
  return curves;
}

/**
 * One binding: the point at parameter `s` on curve `cv`, plus the local
 * offset (lx, ly, lz)·lq rotated into the curve's frame. Local x is the
 * tangent; only the cross-section (y, z) is scaled by the curve's sig.
 */
export function evalBind(cv, s, lx, ly, lz, lq, out, o = 0) {
  const u = (s / SPAN) * cv.nseg;
  let j = Math.floor(u);
  if (j > cv.n - 2) j = cv.n - 2;
  if (j < 0) j = 0;
  const f = u - j;
  const P = cv.P;
  const Q = cv.Q;
  const a = j * 3;
  const b = a + 3;
  const qa = j * 4;
  const qb = qa + 4;
  const px = P[a] + (P[b] - P[a]) * f;
  const py = P[a + 1] + (P[b + 1] - P[a + 1]) * f;
  const pz = P[a + 2] + (P[b + 2] - P[a + 2]) * f;
  let qx = Q[qa] + (Q[qb] - Q[qa]) * f;
  let qy = Q[qa + 1] + (Q[qb + 1] - Q[qa + 1]) * f;
  let qz = Q[qa + 2] + (Q[qb + 2] - Q[qa + 2]) * f;
  let qw = Q[qa + 3] + (Q[qb + 3] - Q[qa + 3]) * f;
  const L = 1 / Math.hypot(qx, qy, qz, qw);
  qx *= L;
  qy *= L;
  qz *= L;
  qw *= L;
  const vx = lx * lq;
  const vy = ly * lq * cv.s;
  const vz = lz * lq * cv.s;
  const tx = 2 * (qy * vz - qz * vy);
  const ty = 2 * (qz * vx - qx * vz);
  const tz = 2 * (qx * vy - qy * vx);
  out[o] = px + vx + qw * tx + (qy * tz - qz * ty);
  out[o + 1] = py + vy + qw * ty + (qz * tx - qx * tz);
  out[o + 2] = pz + vz + qw * tz + (qx * ty - qy * tx);
  return out;
}

const _o1 = [0, 0, 0];
const _o2 = [0, 0, 0];

/**
 * Every curve-skinned vertex into `out` (world space). `cm_w/255` is the
 * weight on curve 1; at w ≥ 0.999 curve 2 is skipped entirely, even where it
 * names a different curve.
 */
export function skinCurveSet(out, cm, curves, lq, count) {
  const { c1, c2, w, s1, s2, l1, l2 } = cm;
  for (let i = 0; i < count; i++) {
    const wt = w[i] / 255;
    const i3 = i * 3;
    evalBind(curves[c1[i]], s1[i], l1[i3], l1[i3 + 1], l1[i3 + 2], lq, _o1);
    if (wt < 0.999) {
      evalBind(curves[c2[i]], s2[i], l2[i3], l2[i3 + 1], l2[i3 + 2], lq, _o2);
      out[i3] = _o1[0] * wt + _o2[0] * (1 - wt);
      out[i3 + 1] = _o1[1] * wt + _o2[1] * (1 - wt);
      out[i3 + 2] = _o1[2] * wt + _o2[2] * (1 - wt);
    } else {
      out[i3] = _o1[0];
      out[i3 + 1] = _o1[1];
      out[i3 + 2] = _o1[2];
    }
  }
  return out;
}
