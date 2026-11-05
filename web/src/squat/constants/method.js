// "Method and limits" pane, verbatim from the source page. Segment format as
// constants/guide.js. This is where the tool says what is modelled and what is
// not — the activation paragraph in particular is why nothing here may be
// labelled EMG.
export const METHOD = {
  modelledHeading: 'What is modelled',
  modelled: [
    [
      { b: 'Anatomy.' },
      ' Every bone and muscle is an anatomical surface from BodyParts3D, scaled to a 1.78 m lifter. Leg muscles follow the paths of the Rajagopal full-body OpenSim model with the Lai et al. deep-flexion update, so they stretch, shorten and wrap with the motion. Trunk muscles bend with the lumbar spine. The left side mirrors the right.',
    ],
    [
      { b: 'Upper back, arms and grip.' },
      ' The shoulder blades are retracted about 12°. The arm pose was solved under joint limits in ISB conventions (Wu et al. 2005): shoulder external rotation ',
      { k: 'er' },
      ' (the top of the normal range), elevation ',
      { k: 'elev' },
      ', elbow flexion ',
      { k: 'elbow' },
      ', and wrists within ',
      { k: 'wrist' },
      ' of neutral. The hands are about ',
      { k: 'grip' },
      ' apart in a full grip, thumb around the bar. The deltoid and pectoralis major were re-shaped from their rest anatomy with dual-quaternion skinning so they follow the 115° humeral rotation without collapsing.',
    ],
    [
      { b: 'Path and balance.' },
      ' The feet are fixed with heels 32 cm apart and toes out 20°. Knee and ankle angles are prescribed. At every depth the trunk is rotated about the hips so the bar stays directly over midfoot, which makes the bar path vertical. The centre of pressure then follows the combined centre of mass of lifter and bar, moving from ',
      { k: 'cop0' },
      ' to ',
      { k: 'cop1' },
      ' of foot length from the heel.',
    ],
    [
      { b: 'Timed rep.' },
      ' The rep timing is shaped on published barbell data: a ',
      { k: 'ecc' },
      ' controlled descent, a touch-and-go reversal, and a drive at ',
      { k: 'mcv' },
      ' mean velocity, which the full-squat velocity table places at about 80–85% of 1RM. It includes a mild sticking region where the literature locates it. It is a reference rep, not a recording.',
    ],
    [
      { b: 'Kinetics.' },
      ' Net joint moments come from body and bar weight using de Leva (1996) segment parameters for an 85 kg lifter with a 100 kg bar, scaled at each instant by the vertical acceleration of the combined centre of mass. Segment angular accelerations and horizontal forces are left out; they are small in a controlled rep but not in a bouncy one. Hip, knee and ankle moments are per leg. L5/S1 carries the whole trunk. The floor can push each foot inward and twist it, the way lifters “spread the floor”, within friction limits.',
    ],
    [
      { b: 'Muscle activation.' },
      ' Estimated, not measured. Each leg and trunk muscle scales with the joint moment it works against, calibrated to published surface EMG from loaded back squats (Contreras et al. 2015, Caterisano et al. 2002, Hammond et al. 2016, van den Tillaar et al. 2019). A contraction-mode factor then separates the phases: lengthening muscles need about 0.62 of the activation they need when shortening at the same moment, near-isometric muscles about 0.8–0.95, and both phases meet at the reversal. Shoulder, arm and neck values are typical holding levels scaled by the bar’s effective weight.',
    ],
    [
      { b: 'Muscle length.' },
      ' Musculotendon path length relative to standing, from the model’s muscle paths. Tendons stretch, so fibre behaviour can differ from the whole unit, most of all in the calf muscles. Short deep hip rotators are not reported because their paths are too short to measure reliably.',
    ],
  ],
  measuredHeading: 'What would make it measured',
  measured: [
    'Motion capture, either markers or OpenCap video, for joint angles',
    'Force plates for ground force and centre of pressure',
    'A linear position transducer or velocity tracker for bar speed',
    'Surface EMG for activation, normalised to maximal contractions',
  ],
  limitsHeading: 'Limits',
  limits: [
    'One body size and one rep. Proportions change trunk lean and knee travel.',
    'No skin or fat layer. Muscles can pass through each other where soft tissue would compress in reality.',
    'The head stays fixed to the trunk, so the gaze drops as the trunk leans.',
    'Fast or bouncy reps add inertial terms this model leaves out.',
  ],
};
