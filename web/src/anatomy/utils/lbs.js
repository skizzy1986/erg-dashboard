// The trunk's linear blend (SKINNING.md §2). Each vertex blends two FULLY
// transformed positions: w on frame k = lb_i0, 1 − w on frame k + 1. The
// weight is on k, not k + 1 — getting that backwards still produces a
// plausible-looking trunk, just the wrong one.
//
// `frames` is a column-major NF×16 block (frames.js); `frameSlots` maps the
// set's local frame order (meta.lbs.frames) to slots in that block.
export function blendTrunk(out, rest, i0s, ws, frames, frameSlots, count) {
  const lastK = frameSlots.length - 1;
  for (let i = 0; i < count; i++) {
    const k = i0s[i];
    const w = ws[i] / 255;
    const e0 = frameSlots[k] * 16;
    const e1 = frameSlots[Math.min(k + 1, lastK)] * 16;
    const i3 = i * 3;
    const x = rest[i3];
    const y = rest[i3 + 1];
    const z = rest[i3 + 2];
    for (let r = 0; r < 3; r++) {
      out[i3 + r] =
        w *
          (frames[e0 + r] * x +
            frames[e0 + 4 + r] * y +
            frames[e0 + 8 + r] * z +
            frames[e0 + 12 + r]) +
        (1 - w) *
          (frames[e1 + r] * x +
            frames[e1 + 4 + r] * y +
            frames[e1 + 8 + r] * z +
            frames[e1 + 12 + r]);
    }
  }
  return out;
}
