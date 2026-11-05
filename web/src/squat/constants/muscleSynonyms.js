// Coach words a filter box gets typed into, mapped to a region id rather than
// to muscle names — that is what keeps this table small. Only words that no
// muscle name or region name already contains earn a row.
//
// Plain data, no imports: the matching itself lives in utils/muscleIndex.js.
export const MUSCLE_SYNONYMS = {
  glutes: 0,
  glute: 0,
  bum: 0,
  quads: 1,
  quad: 1,
  vmo: 1,
  hams: 2,
  hammies: 2,
  groin: 3,
  abductors: 5,
  calves: 6,
  calf: 6,
  shins: 6,
  feet: 6,
  toes: 6,
  abs: 7,
  core: 7,
  erectors: 7,
  'lower back': 7,
  lats: 8,
  traps: 8,
  neck: 8,
  delts: 9,
  pecs: 9,
  chest: 9,
  cuff: 9,
  arms: 9,
  grip: 10,
  wrists: 10,
  hands: 10,
  fingers: 10,
};
