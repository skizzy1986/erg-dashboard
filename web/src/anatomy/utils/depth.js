// Depth S ∈ [0, 1] (0 standing, 1 the bottom) and where it falls among the
// model's NS stored samples. NS always comes from the data (meta.S.length),
// never a literal: a re-run of the pipeline at a different resolution must not
// silently mis-index every table.

const clamp01 = (s) => (s < 0 ? 0 : s > 1 ? 1 : s);

/**
 * The source page's sampling rule (SKINNING.md §0): S = 1 lands on
 * (ns − 2, ns − 1, t = 1), not on (ns − 1, ns, 0), so i1 is always in range.
 */
export function depthIndex(s, ns) {
  const f = clamp01(s) * (ns - 1);
  const i0 = Math.min(ns - 2, Math.floor(f));
  return { i0, i1: i0 + 1, t: f - i0 };
}
