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

export const sampleToS = (sample, ns) => sample / (ns - 1);
export const sToSample = (s, ns) => Math.round(clamp01(s) * (ns - 1));

export const DIRECTIONS = ['lowering', 'drive'];

// Thresholds from the source page's phase readout: the top 5% of travel reads
// as standing (on the way down) or lockout (on the way up), the last 2.5% as
// the bottom whichever way the bar is moving.
export function derivePhase(s, direction) {
  if (s <= 0.05) return direction === 'drive' ? 'Lockout' : 'Standing';
  if (s >= 0.975) return 'Bottom';
  return direction === 'drive' ? 'Drive' : 'Descent';
}

// Bottom keeps the current direction: jumping there should not flip which way
// the rep is going.
export const PHASE_CHIPS = [
  { name: 'Standing', s: 0, direction: 'lowering' },
  { name: 'Descent', s: 0.5, direction: 'lowering' },
  { name: 'Bottom', s: 1, direction: null },
  { name: 'Drive', s: 0.5, direction: 'drive' },
  { name: 'Lockout', s: 0, direction: 'drive' },
];

/**
 * One step along the rep, as a path: down while lowering, the turn at the
 * bottom, then up while driving. Forward from (bottom, lowering) is
 * (bottom, drive); back from (bottom, drive) is (bottom, lowering). The path
 * ends at (0, drive) going forward and at (0, lowering) going back.
 */
export function stepAlongRep({ sample, direction }, delta, ns) {
  const last = ns - 1;
  // The path has 2·ns positions: 0…last lowering, then last…0 driving, so the
  // bottom appears twice — once on each side of the turn.
  const end = 2 * last + 1;
  const pos = direction === 'drive' ? end - sample : sample;
  const next = Math.max(0, Math.min(end, pos + delta));
  return next <= last
    ? { sample: next, direction: 'lowering' }
    : { sample: end - next, direction: 'drive' };
}
