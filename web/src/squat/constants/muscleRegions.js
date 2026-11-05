// The eleven functional regions the 118 modelled muscles are grouped into for
// the muscle list, ordered the way a squat loads: hips first, then knee, then
// everything holding the bar. Not alphabetical.
export const REGION_NAMES = [
  'Hip extensors',
  'Knee extensors',
  'Hamstrings and knee flexors',
  'Adductors',
  'Hip flexors',
  'Hip stabilisers and abductors',
  'Calves, ankle and foot',
  'Trunk and bracing',
  'Upper back and bar shelf',
  'Shoulders and arms',
  'Grip and forearm',
];

// Region per muscle, in meta.muscles order. Index-keyed rather than name-keyed
// because it is a quarter of the bytes (257 vs ~1,017 measured), and that is
// safe only because squat-manifest.json is pinned by sha256 AND byte count in
// constants/dataAsset.js: the data cannot shift under this array without
// content.test.js failing first. Re-derive it whenever the pipeline is re-run.
// The named table that documents every row lives in
// __tests__/muscleIndex.test.js, where it costs no bundle bytes.
export const REGION_OF = [
  0, 5, 5, 5, 4, 4, 5, 5, 4, 1, 1, 1, 1, 3, 3, 0, 0, 3, 2, 2, 2, 2, 6, 6, 6, 6,
  6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 5, 5, 5, 5, 5, 4, 2, 7, 7, 7, 7, 7, 7, 7, 7, 7,
  7, 7, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 9,
  9, 9, 9, 9, 9, 8, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 10, 10, 10, 10, 10,
  10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 7,
];
