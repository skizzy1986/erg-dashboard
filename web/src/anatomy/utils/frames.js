import { composeColumnMajor, slerpR128 } from './quat.js';

// Body frames at a depth (SKINNING.md §3). `fr` is the `frames` array,
// laid out [S][frame][px, py, pz, qx, qy, qz, qw]. Positions lerp, rotations
// slerp (r128's), and each frame lands in `out` as a column-major 4×4 at
// j·16 — so frame j is `out.subarray(j * 16, j * 16 + 16)`.
const _q = [0, 0, 0, 0];

export function frameAt(out, fr, nf, i0, i1, t) {
  for (let j = 0; j < nf; j++) {
    const a = (i0 * nf + j) * 7;
    const b = (i1 * nf + j) * 7;
    slerpR128(
      _q,
      fr[a + 3],
      fr[a + 4],
      fr[a + 5],
      fr[a + 6],
      fr[b + 3],
      fr[b + 4],
      fr[b + 5],
      fr[b + 6],
      t
    );
    composeColumnMajor(
      out,
      j * 16,
      fr[a] + (fr[b] - fr[a]) * t,
      fr[a + 1] + (fr[b + 1] - fr[a + 1]) * t,
      fr[a + 2] + (fr[b + 2] - fr[a + 2]) * t,
      _q[0],
      _q[1],
      _q[2],
      _q[3]
    );
  }
  return out;
}

/**
 * meta.static's fixed foot transforms, keyed as the bones name them
 * ('@calcn_r'). The manifest stores each as four ROWS (it was written for
 * Matrix4.set(), which takes row-major arguments); three's storage is
 * column-major, so this transposes on the way in.
 */
export function staticMatrices(statics) {
  const out = {};
  for (const [name, rows] of Object.entries(statics ?? {})) {
    const m = new Float32Array(16);
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) m[c * 4 + r] = rows[r][c];
    }
    out[`@${name}`] = m;
  }
  return out;
}
