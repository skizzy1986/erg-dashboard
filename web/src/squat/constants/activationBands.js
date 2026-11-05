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
export const ACT_BASIS =
  "Bands are this model's own colour steps, not a published threshold.";
export const ACT_NONE = 'Not a muscle — no activation estimate.';
export const HEAT_LEGEND =
  'Estimated activation at the depth shown. Indicative estimate, not EMG. Tendons are not coloured.';
export const STALE_LINK =
  'That link points to a muscle this version does not have.';

// Where the ramp's four colour tokens sit along 0-1 — the band cuts, so the
// legend's swatches land exactly where the bands do.
export const HEAT_STOPS = [0, ...ACT_BANDS.map((b) => b.max)];
