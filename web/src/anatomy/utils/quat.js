// Quaternion helpers for the body frames, on plain arrays (xyzw).
//
// The body frames are interpolated with three r128's Quaternion.slerp, ported
// here line for line. r187's slerp is not a drop-in: it switches to nlerp once
// the dot product reaches 0.9995, which r128 never did, and neighbouring depth
// samples are often that close — so posing would drift from the reference by
// more than the fixture tolerance. Curves use nlerp everywhere (curveSkin.js).

/** r128 Quaternion.slerp(qa → qb, t), written into `out`. */
export function slerpR128(out, ax, ay, az, aw, bx, by, bz, bw, t) {
  if (t === 0) {
    out[0] = ax;
    out[1] = ay;
    out[2] = az;
    out[3] = aw;
    return out;
  }
  if (t === 1) {
    out[0] = bx;
    out[1] = by;
    out[2] = bz;
    out[3] = bw;
    return out;
  }
  let cosHalfTheta = aw * bw + ax * bx + ay * by + az * bz;
  let x = bx;
  let y = by;
  let z = bz;
  let w = bw;
  if (cosHalfTheta < 0) {
    x = -bx;
    y = -by;
    z = -bz;
    w = -bw;
    cosHalfTheta = -cosHalfTheta;
  }
  if (cosHalfTheta >= 1.0) {
    out[0] = ax;
    out[1] = ay;
    out[2] = az;
    out[3] = aw;
    return out;
  }
  const sqrSinHalfTheta = 1.0 - cosHalfTheta * cosHalfTheta;
  if (sqrSinHalfTheta <= Number.EPSILON) {
    const s = 1 - t;
    const rw = s * aw + t * w;
    const rx = s * ax + t * x;
    const ry = s * ay + t * y;
    const rz = s * az + t * z;
    const l = Math.hypot(rx, ry, rz, rw);
    out[0] = rx / l;
    out[1] = ry / l;
    out[2] = rz / l;
    out[3] = rw / l;
    return out;
  }
  const sinHalfTheta = Math.sqrt(sqrSinHalfTheta);
  const halfTheta = Math.atan2(sinHalfTheta, cosHalfTheta);
  const ratioA = Math.sin((1 - t) * halfTheta) / sinHalfTheta;
  const ratioB = Math.sin(t * halfTheta) / sinHalfTheta;
  out[0] = ax * ratioA + x * ratioB;
  out[1] = ay * ratioA + y * ratioB;
  out[2] = az * ratioA + z * ratioB;
  out[3] = aw * ratioA + w * ratioB;
  return out;
}

/**
 * Matrix4.compose(p, q, (1, 1, 1)) into `out` at `offset`, column-major — the
 * layout three's Matrix4.elements uses, so the result can be copied straight
 * into an Object3D.matrix.
 */
export function composeColumnMajor(out, offset, px, py, pz, qx, qy, qz, qw) {
  const x2 = qx + qx;
  const y2 = qy + qy;
  const z2 = qz + qz;
  const xx = qx * x2;
  const xy = qx * y2;
  const xz = qx * z2;
  const yy = qy * y2;
  const yz = qy * z2;
  const zz = qz * z2;
  const wx = qw * x2;
  const wy = qw * y2;
  const wz = qw * z2;
  const o = offset;
  out[o] = 1 - (yy + zz);
  out[o + 1] = xy + wz;
  out[o + 2] = xz - wy;
  out[o + 3] = 0;
  out[o + 4] = xy - wz;
  out[o + 5] = 1 - (xx + zz);
  out[o + 6] = yz + wx;
  out[o + 7] = 0;
  out[o + 8] = xz + wy;
  out[o + 9] = yz - wx;
  out[o + 10] = 1 - (xx + yy);
  out[o + 11] = 0;
  out[o + 12] = px;
  out[o + 13] = py;
  out[o + 14] = pz;
  out[o + 15] = 1;
  return out;
}

/** Applies a column-major 4×4 (at `offset`) to the point (x, y, z). */
export function transformPoint(m, offset, x, y, z, out, outOffset = 0) {
  const o = offset;
  out[outOffset] = m[o] * x + m[o + 4] * y + m[o + 8] * z + m[o + 12];
  out[outOffset + 1] = m[o + 1] * x + m[o + 5] * y + m[o + 9] * z + m[o + 13];
  out[outOffset + 2] = m[o + 2] * x + m[o + 6] * y + m[o + 10] * z + m[o + 14];
  return out;
}
