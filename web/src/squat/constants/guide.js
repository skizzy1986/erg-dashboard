// Coaching-guide prose, carried verbatim from the source page (page/2-markup.html).
//
// Rich text is a list of segments: a plain string, or one of
//   { k: 'key' }   a model value, filled from utils/repSummary.js summariseRep().kv
//   { b: 'text' }  bold      { i: 'text' }  italic      { code: 'text' }  code
// so the numbers stay derived from the data rather than typed into the prose.
//
// Deliberate edits from the source, each because the 3D view and playback land
// in a later PR: the Phases intro drops "Select a heading to jump the model to
// that phase.", and the Measured rep pane describes the importer without the
// drop zone (PR4).

export const GUIDE_PANES = [
  { id: 'phases', label: 'Phases' },
  { id: 'metrics', label: 'Metrics and targets' },
  { id: 'measured', label: 'Measured rep' },
  { id: 'method', label: 'Method and limits' },
  { id: 'sources', label: 'Sources' },
];

export const PHASES_INTRO =
  'The same depth means different work on the way down and the way up. Each phase below gives what the muscles are doing, what this reference rep shows, what to look for, and the common faults with their cues.';

// Keyed by PHASES[i].id. `facts` values are either a literal or a { k } value.
export const PHASE_GUIDE = {
  setup: {
    facts: [
      ['Contraction', 'isometric'],
      ['Shoulder external rotation', { k: 'er' }],
      ['Elbow flexion', { k: 'elbow' }],
      ['Grip', { k: 'grip' }],
    ],
    body: [
      [
        'The bar sits on the upper trapezius, above the spine of the shoulder blade. The shoulder blades are pulled back and down to make a muscular shelf, the elbows point down under or slightly behind the bar, and the wrists stay straight with the bar in the heel of the hand. A full breath into the abdomen, held against a braced trunk wall, raises intra-abdominal pressure before the descent starts.',
      ],
    ],
    lookFor: [
      'Bar level and centred on the shelf',
      'Wrists straight, knuckles up',
      'Elbows pointing at the floor',
      'Whole foot loaded, toes out about 20°',
    ],
    faults: [
      'Soft upper back: “pull the bar into your traps”, “bend the bar”',
      'Bar hanging on bent wrists: “bar in the heel of the hand”',
      'Elbows flaring back because the grip is narrower than shoulder mobility allows: widen the grip',
      'No brace: “breathe into the belt, then descend”',
    ],
  },
  lowering: {
    facts: [
      ['Duration', { k: 'ecc' }],
      ['Peak bar speed', { k: 'vecc' }],
      ['Ground force', { k: 'fecc' }],
    ],
    body: [
      [
        'Hips and knees break together and the bar travels straight down over midfoot. The prime movers lengthen while they work, so they brake the load (eccentric action). A muscle needs fewer active motor units to hold a given force while lengthening than while shortening, so estimated activation on the way down sits well below the drive at the same depth. The descent opens with a brief unweighting and finishes with a braking phase as the lifter slows the bar into the bottom.',
      ],
      [
        'Length change from standing to the bottom position in this model: ',
        { k: 'lens' },
        '. Rectus femoris crosses both hip and knee, so it stays close to its standing length.',
      ],
    ],
    lookFor: [
      'Knees tracking over the second and third toes',
      'Shin and trunk inclining together',
      'Vertical bar path',
      'Even speed into the bottom, with no free fall',
    ],
    faults: [
      'Hips shoot back first: “knees and hips together”, “sit between your heels”',
      'Knees cave in: “spread the floor”, “knees over toes”',
      'Weight drifts to the toes: “whole foot”, “heels down”',
      'Dropping fast and bouncing off soft tissue: “own the descent, two counts down”',
    ],
  },
  bottom: {
    facts: [
      ['Transition', { k: 'trans' }],
      ['Ground force peak', { k: 'fpk' }],
      ['Depth', { k: 'depthtxt' }],
      ['Lumbar curve', { k: 'lord' }],
    ],
    body: [
      [
        'The bar stops and reverses. Ground force peaks here because the system first decelerates and then accelerates upward, so the joint moments in the hole exceed the static values shown in most textbooks. The prime movers are at their longest and switch from lengthening to shortening through a brief near-isometric period, and stretched tendons and connective tissue return some of the energy stored during braking (the stretch-shortening cycle). Tension has to stay on: a relaxed bottom position, or a long pause, gives most of that stored energy away.',
      ],
    ],
    lookFor: [
      'Depth reached with the lower-back curve still present',
      'Knees still over the toes, heels down',
      'Chest and upper back still set against the bar',
    ],
    faults: [
      'Relaxing in the hole: “stay tight and rebound, don’t rest”',
      'Pelvis tucks under at the bottom: brace harder, stop just above the point where it tucks, check ankle dorsiflexion',
      'Upper back rounds: “elbows down, chest up into the bar”',
    ],
  },
  drive: {
    facts: [
      ['Duration', { k: 'con' }],
      ['Mean bar speed', { k: 'mcv' }],
      ['Peak', { k: 'vpk' }],
      ['Sticking region', { k: 'sticktxt' }],
    ],
    body: [
      [
        'The prime movers now shorten (concentric action). Activation is highest just after the reversal, and motor units fire faster in this phase than when lowering the same load. The first few centimetres are helped by the stretch-shortening rebound. Then comes the sticking region: in heavy reps, bar speed dips between roughly 8 and 22 cm above the bottom as knee-extensor leverage worsens and the rebound fades. Glute activity rises into this zone while rectus femoris and vastus lateralis activity falls. Once through it, bar speed climbs again.',
      ],
    ],
    lookFor: [
      'Hips and shoulders rising at the same rate, so trunk angle holds through the sticking region',
      'Vertical bar path',
      'Knees staying out',
    ],
    faults: [
      'Hips rise first and the chest drops (good-morning squat): “drive your upper back into the bar”, “chest and hips up together”',
      'Knees cave on the way up: “knees out”',
      'Bar drifts forward: “push through midfoot”',
    ],
  },
  lockout: {
    facts: [
      ['Ground force', { k: 'flock' }],
      ['Contraction', 'concentric, then isometric'],
    ],
    body: [
      [
        'Hips and knees finish extending together. The bar is decelerating here, so ground force drops below system weight and the last few centimetres ride on momentum. Stand tall without leaning back, then breathe and re-brace before the next rep.',
      ],
    ],
    lookFor: [
      'Hips and knees locking out together',
      'Neutral lower back at the top',
    ],
    faults: [
      'Leaning back to finish: “stand tall, ribs down”',
      'Losing the brace between reps: “breathe and brace every rep”',
    ],
  },
};

export const METRICS_INTRO =
  'Values are from the reference rep at the bottom position unless the row says otherwise. Targets come from published squat studies and the back squat assessment of Myer et al. (2014). Where no study gives a number, the row says the target is a coaching standard.';

export const MEASURED_PANE = {
  heading: 'Compare a measured rep',
  intro:
    'Load a recording to overlay it on the reference rep. The file is read in this browser only and is not uploaded anywhere.',
  comingSoon:
    'Measured-rep import is coming in a later release. This is what it will read.',
  accepts:
    'OpenCap or OpenSim joint angles (.mot), or a CSV with a time column plus joint angles or bar velocity',
  filesHeading: 'What each file gives you',
  files: [
    [
      { b: 'OpenCap or OpenSim .mot' },
      ' (columns such as ',
      { code: 'knee_angle_r' },
      ', ',
      { code: 'hip_flexion_r' },
      ', ',
      { code: 'ankle_angle_r' },
      ', ',
      { code: 'lumbar_extension' },
      '). The deepest rep is split into lowering, bottom and drive from knee flexion. Each phase is time-scaled onto the reference rep so the curves line up, and the measured angles feed the depth, ankle and lumbar checks.',
    ],
    [
      { b: 'Bar velocity CSV' },
      ' (columns ',
      { code: 'time' },
      ' and ',
      { code: 'velocity' },
      ' in m/s, as exported by most velocity trackers). Gives lowering time, mean concentric velocity, peak velocity and a load estimate from the full-squat velocity table.',
    ],
  ],
  note: 'OpenCap’s free two-phone setup produces .mot files directly. Its published lab validation set (squats with motion capture, force plates and EMG) can be downloaded from SimTK.',
};
