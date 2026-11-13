// Every user-facing string about estimated activation lives here, so the prose
// scan in __tests__/content.test.js reaches all of it in one place.

// Three bands, cut at the model's OWN colour-ramp stops (docs/squat/SKINNING.md
// RAMP) — not invented thresholds and not a published range, which is why
// ACT_BASIS says so in words instead of carrying a citation.
export const ACT_BANDS = [
  { id: 'low', name: 'Low', max: 0.3 },
  { id: 'mod', name: 'Moderate', max: 0.6 },
  { id: 'high', name: 'High', max: 1 },
];

export const ACT_NOTE = 'Indicative estimate, not EMG.';
// How many regions the strain readout names (HERO_STAGE_SPEC.md, Gate 2 #1).
export const TOP_N = 3;
export const STRAIN_TITLE = 'Working hardest now';
export const ACT_BASIS =
  "Bands are this model's own colour steps, not a published threshold.";
export const ACT_NONE = 'Not a muscle — no activation estimate.';
// The heatmap paints muscle only; the strain panel says so beside its key.
export const HEAT_TENDONS = 'Tendons are not coloured.';
// With the heatmap on, muscles outside the named regions are dimmed toward grey
// (focusDim), so their colour no longer matches the key: the overlay says so.
export const HEAT_OTHERS = 'Others greyed.';
export const HEAT_LEGEND = `Estimated activation at the depth shown. ${ACT_NOTE} ${HEAT_TENDONS}`;
export const STALE_LINK =
  'That link points to a muscle this version does not have.';

// Where the ramp's four colour tokens sit along 0-1 — the band cuts, so the
// legend's swatches land exactly where the bands do.
export const HEAT_STOPS = [0, ...ACT_BANDS.map((b) => b.max)];
