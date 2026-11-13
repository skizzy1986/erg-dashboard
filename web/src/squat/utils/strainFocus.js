import { REGION_OF } from '../constants/muscleRegions.js';
import { TOP_N } from '../constants/activationBands.js';
import { activationOf, bandOf } from './activation.js';

/**
 * The `n` regions working hardest at depth `s` going `direction`, each named
 * by its leading muscle. Regions, not muscles: 116 muscles share 51 curves,
 * so a muscle top-3 is mostly tie artefacts (HERO_STAGE_SPEC.md, Gate 2 #1).
 *
 * Deterministic: the leader is the highest weight in its region, ties to the
 * lower manifest index; regions sort by that weight, ties to region order.
 * A muscle with no estimate (no `act`, a tendon) is never a leader.
 */
export function topActivated(muscles, s, direction, n = TOP_N) {
  if (!muscles?.length || n <= 0) return [];
  const lead = new Map();
  muscles.forEach((m, i) => {
    if (m.tendon) return;
    const value = activationOf(m, s, direction);
    const region = REGION_OF[i];
    if (value === null || region === undefined) return;
    const cur = lead.get(region);
    if (!cur || value > cur.value) {
      lead.set(region, { region, i, name: m.name, value });
    }
  });
  return [...lead.values()]
    .sort((a, b) => b.value - a.value || a.region - b.region)
    .slice(0, n)
    .map((r) => ({ ...r, band: bandOf(r.value) }));
}

/** What the readout shows, as a string: equal keys mean an equal readout. */
export const focusKey = (list) =>
  list.map((r) => `${r.region}:${r.i}:${r.band.id}`).join('|');

/** Every muscle (not tendon) in the listed regions: what the model lifts. */
export function regionMuscles(muscles, list) {
  const want = new Set(list.map((r) => r.region));
  const out = [];
  muscles?.forEach((m, i) => {
    if (!m.tendon && want.has(REGION_OF[i])) out.push(i);
  });
  return out;
}

/**
 * One byte per muscle, 1 where the model should stand out: the top regions'
 * muscles (empty with the heatmap off) plus the selected muscle. Null when
 * there is nothing to emphasise, so the model keeps its plain colours.
 */
export function focusMask(n, topIdx, selectedIdx) {
  const hasSel = Number.isInteger(selectedIdx) && selectedIdx >= 0;
  if (!topIdx?.length && !hasSel) return null;
  const mask = new Uint8Array(n);
  for (const i of topIdx ?? []) if (i >= 0 && i < n) mask[i] = 1;
  if (hasSel && selectedIdx < n) mask[selectedIdx] = 1;
  return mask;
}
