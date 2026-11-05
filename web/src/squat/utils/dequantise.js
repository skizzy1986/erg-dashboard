// int16-quantised positions back to metres: value * s + c, per axis centre c.
// The source page's deq(); PR2's geometry build is the caller.
export function dequantise(q, c, s) {
  const out = new Float32Array(q.length);
  for (let i = 0; i < q.length; i += 3) {
    out[i] = q[i] * s + c[0];
    out[i + 1] = q[i + 1] * s + c[1];
    out[i + 2] = q[i + 2] * s + c[2];
  }
  return out;
}
