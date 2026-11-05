// "Metrics and targets" rows, verbatim from the source page (page/4-ui.js,
// metrics table). Each row's Model value comes from utils/repSummary.js
// summariseRep().metrics at the same index; `target` uses the segment format
// from constants/guide.js so the one data-derived target (row 11) stays
// derived.
//
// The source has EIGHTEEN rows, not the seventeen the PR1 spec counted:
// "Muscle length at the bottom" is the eighteenth. All are carried over.
export const METRICS_TABLE = [
  {
    metric: 'Bar over midfoot',
    target: [
      'Within ±25 mm (coaching standard). Experienced high-bar lifters: bar about 2 cm behind the centre of pressure at depth (Glassbrook 2019)',
    ],
    why: 'Balance and efficiency. A bar that drifts forward lengthens the hip and lower-back lever arms.',
  },
  {
    metric: 'Depth',
    target: [
      'IPF: hip crease below the top of the knee. Back squat assessment: thighs at least parallel (Myer 2014)',
    ],
    why: 'Competition standard and full range of motion.',
  },
  {
    metric: 'Knee flexion',
    target: [
      'High-bar weightlifters at 1RM: about 124 ± 7° (Glassbrook 2019, converted from included angle)',
    ],
    why: 'How deep the knee works. This rep sits slightly deeper than the study mean.',
  },
  {
    metric: 'Hip flexion (pelvis to thigh)',
    target: [
      'Studies define the hip angle differently, so compare like with like',
    ],
    why: 'Hip demand. Rises with depth and with forward lean.',
  },
  {
    metric: 'Ankle dorsiflexion',
    target: ['High-bar weightlifters: about 32 ± 3° range (Glassbrook 2019)'],
    why: 'Lets the knees travel forward with the heels down.',
  },
  {
    metric: 'Trunk lean vs shin',
    target: ['Trunk roughly parallel to the tibia (Myer 2014)'],
    why: 'The upright high-bar pattern. A trunk much flatter than the shins shifts load to the hips and back.',
  },
  {
    metric: 'Lumbar flexion and lordosis',
    target: [
      'Trained lifters under load: 13–26° lumbar flexion during descent (McKean 2010)',
    ],
    why: 'A neutral spine still moves. The fault is end-range flexion at the bottom.',
  },
  {
    metric: 'Knee tracking',
    target: ['Knees over the toes, no inward collapse (Myer 2014)'],
    why: 'Frontal-plane control of hip and knee.',
  },
  {
    metric: 'Centre of pressure',
    target: ['Inside 25–60% with heels down (coaching standard)'],
    why: 'Where the lifter is balanced. With the bar over midfoot it moves toward the heel as the hips go back.',
  },
  {
    metric: 'Hip to knee moment ratio',
    target: [
      'High-bar about 1.2 (hip 230, knee 191 N·m); low-bar about 2.3 (Wretenberg 1996)',
    ],
    why: 'How the load is shared between the hip and knee extensors.',
  },
  {
    metric: 'Net joint moments, static at depth (per kg)',
    target: [
      'Scale with load. The dynamic peak is up to ',
      { k: 'fpkx' },
      ' these values',
    ],
    why: 'Mechanical demand on each joint.',
  },
  {
    metric: 'Vertical ground force',
    target: ['Peaks at the reversal in a touch-and-go rep'],
    why: 'Braking on the way down, drive on the way up.',
  },
  {
    metric: 'Bar velocity',
    target: [
      'Full squat mean velocity: 0.67 m/s at 80%, 0.50 at 90%, 0.32 at 1RM (Sánchez-Medina 2017)',
    ],
    why: 'Load and fatigue monitoring with velocity-based training.',
  },
  {
    metric: 'Tempo',
    target: ['Controlled 1.5–2 s descent (coaching standard)'],
    why: 'Time under tension and control of the braking phase.',
  },
  {
    metric: 'Sticking region',
    target: [
      'Heavy reps: 8–22 cm above the bottom, knee about 80–100° included angle (ISBS 2014)',
    ],
    why: 'Where heavy reps slow down or fail. Train it with paused squats and pin squats.',
  },
  {
    metric: 'Shoulder, elbow and wrist',
    target: [
      'External rotation near 90° is the top of normal range (ISB convention). Wrist within about 15° of neutral',
    ],
    why: 'Upper-back setup. Limited rotation shows up as bent wrists or flared elbows.',
  },
  {
    metric: 'Estimated activation',
    target: [
      'Estimated from joint moments, not EMG. Drive exceeds lowering at the same depth (Orantes-Gonzalez 2023; Enoka 1996)',
    ],
    why: 'Why the same depth is easier on the way down.',
  },
  {
    metric: 'Muscle length at the bottom',
    target: ['Musculotendon length from the model’s muscle paths'],
    why: 'Which muscles work under stretch at depth.',
  },
];
