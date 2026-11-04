// The ten form-check items, in the source page's order (page/4-ui.js
// checksFor, model branch). Each one's model value comes from
// utils/repSummary.js summariseRep().checks at the same index.
//
// What this is: the REFERENCE IDEAL — the modelled rep scored against
// published targets. It is never "your result"; a measured comparison arrives
// with the importer (PR4). The source's initial "9 of 9" was a stale count:
// there are ten items.
//
// `ref` uses the segment format from constants/guide.js. `sources` are ids
// from constants/references.js; `tab` and `at` are the graph and rep time the
// item jumps to once playback lands (PR3).
export const FORM_CHECK_LABEL = 'Reference ideal — modelled';

export const FORM_CHECK = [
  {
    id: 'bar-path',
    name: 'Bar path over midfoot',
    ref: ['Target: within ±25 mm of midfoot all rep'],
    sources: [],
    tab: 'force',
    at: 'bottom',
  },
  {
    id: 'depth',
    name: 'Depth',
    ref: [
      'IPF: hip crease below top of knee. Assessment standard: thighs at least parallel',
    ],
    sources: ['myer2014'],
    tab: 'angles',
    at: 'bottom',
  },
  {
    id: 'knees',
    name: 'Knees track over toes',
    ref: ['Target: 0 to +3 cm, no inward collapse'],
    sources: ['myer2014'],
    tab: 'angles',
    at: 'bottom',
  },
  {
    id: 'trunk-shin',
    name: 'Trunk parallel to shin',
    ref: [
      'Target: within 6°. Assessment standard: tibia parallel with the trunk',
    ],
    sources: ['myer2014'],
    tab: 'angles',
    at: 'bottom',
  },
  {
    id: 'lumbar',
    name: 'Lower-back curve held',
    ref: [
      'Trained lifters: 13–26° under load (McKean 2010). Watch for the pelvis tucking under',
    ],
    sources: ['mckean2010'],
    tab: 'angles',
    at: 'bottom',
  },
  {
    id: 'foot',
    name: 'Whole foot loaded',
    ref: ['Target: 25–60%, heels down, toes relaxed'],
    sources: [],
    tab: 'force',
    at: 'bottom',
  },
  {
    id: 'hip-knee',
    name: 'Hip and knee share the load',
    ref: ['High-bar about 1.2, low-bar about 2.3 (Wretenberg 1996)'],
    sources: ['wretenberg1996'],
    tab: 'moments',
    at: 'bottom',
  },
  {
    id: 'ankle',
    name: 'Ankle mobility',
    ref: ['High-bar weightlifters use about 32° ankle range (Glassbrook 2019)'],
    sources: ['glassbrook'],
    tab: 'angles',
    at: 'bottom',
  },
  {
    id: 'tempo',
    name: 'Tempo and bar speed',
    ref: [
      'Controlled 1.5–2 s descent. 0.59–0.67 m/s ≈ 80–85% 1RM (Sánchez-Medina 2017)',
    ],
    sources: ['sanchezmedina2017'],
    tab: 'force',
    at: 'bottom+0.3',
  },
  {
    id: 'upper-back',
    name: 'Upper back and grip set',
    ref: [
      'Shoulder external rotation ',
      { k: 'er' },
      ' is the top of normal range. If it is out of reach, widen the grip',
    ],
    sources: ['wu2005'],
    tab: 'act',
    at: 0.3,
  },
];
