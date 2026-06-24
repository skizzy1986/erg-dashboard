export const REP_SCHEMES = [
  {
    tier: 'Heavy Compounds',
    reps: '4–6',
    rest: '3 min',
    color: '#34d399',
    lifts: 'Squat · Deadlift · RDL',
    why: 'Maximal strength & rate of force development. Best transfer to drive/pedal, least aerobic interference. Drive concentric explosively.',
  },
  {
    tier: 'Strength / Size',
    reps: '5–8',
    rest: '2–3 min',
    color: '#00d4ff',
    lifts: 'Barbell Row · Bench · Incline · Pulldown',
    why: 'Balance of strength and hypertrophy. Pulling builds the rowing engine + back thickness; pressing is aesthetic.',
  },
  {
    tier: 'Hypertrophy',
    reps: '8–12',
    rest: '60–90 sec',
    color: '#a78bfa',
    lifts: 'Curls · Lateral raises · Leg curl · Flyes · Calves',
    why: "Aesthetic work on small muscles. Low systemic fatigue cost — won't compromise erg recovery.",
  },
];

export const LOWER_DIFFERENTIATION = [
  {
    day: 'Lower Day 1',
    focus: 'Heavy Squat Priority',
    detail:
      'Back squat 4–5 × 4–6 @ 3min rest (explosive concentric). Secondary: leg press or hack squat 3 × 6–8. Accessory: leg curl, calves 8–12.',
  },
  {
    day: 'Lower Day 2',
    focus: 'Posterior Chain + Unilateral',
    detail:
      'RDL 4 × 5–6 primary. Bulgarian split squat / walking lunge 3 × 8/leg. Squat lighter or as explosive power (5 × 3 @ 60%). Accessory: leg curl, calves.',
  },
];

export const STRENGTH_TEMPLATES = [
  {
    name: 'Upper Day 1',
    focus: 'Push priority + 1 pull',
    color: '#a78bfa',
    exercises: [
      'Barbell Bench Press · 3×6–8 (focus)',
      'Barbell Shoulder Press · 3–4×6–8 (strength)',
      'Bent Over Barbell Row · 3×6–8',
      'DB Bicep Curl · 3×8–10',
      'Plank · 3×max',
    ],
  },
  {
    name: 'Upper Day 2',
    focus: 'Pull priority',
    color: '#a78bfa',
    exercises: [
      'Lat Pulldown · 3×6 (focus — warm up pattern)',
      'Assisted Pull Up · 3×8–10 (neutral grip) — SECOND while back fresh',
      'Cable Row · 4×6',
      'Cable Lateral Raise · 3×10 (side delt)',
      'Cable Rope Tricep Ext · 3×10',
      'Pallof Press · 3×10–12/side (anti-rotation)',
      'Side Bridge · 2×max right, then left — right side first (2 sets only until R shoulder clears)',
    ],
  },
  {
    name: 'Lower Day 1',
    focus: 'Heavy squat priority',
    color: '#34d399',
    exercises: [
      'Back Squat · 4–5×5–6 (focus, explosive concentric)',
      'Romanian Deadlift · 3×6–8',
      'Lying Hamstring Curl · 3×10',
      'Side Bridge · 2×max — right side first (2 sets until R shoulder clears)',
    ],
  },
  {
    name: 'Lower Day 2',
    focus: 'Posterior chain + unilateral / power',
    color: '#34d399',
    exercises: [
      'Romanian Deadlift · 4×6 (focus)',
      'Bulgarian Split Squat · 3×8/leg',
      'Back Squat · 5×3 (explosive power, ~60%)',
      'Standing Barbell Calf Raise · 3×12 (full ROM)',
      'Plank · build holds while pain-free (press forearms down — engages serratus, protects shoulder). Drop to 60s if R shoulder twinges.',
    ],
  },
  {
    name: 'Prehab + Shoulder',
    focus: 'Flexible 5th · shoulder health + L/R asymmetry · LIGHT',
    color: '#f472b6',
    exercises: [
      'Band Pull-Apart · 2×20 (warm-up)',
      'PVC Around the World · 2×10 (shoulder mobility — controlled, no pinch on R)',
      'Face Pull · 3×15 (cuff + rear delt health)',
      'Cable Lateral Raise (single arm) · 3×12/side, R first — strict, lead with elbow (asymmetry work)',
      'Rear Delt Fly · 3×15 (light)',
      'Pallof Press · 3×12/side',
      'Side Bridge · 3×max/side, R first (forearm-press cue)',
      'Dead Bug · 3×10/side',
      'Bird Dog · 2×10/side',
      'Glute Bridge · 3×15',
      'Banded Lateral Walk / Clamshell · 2×15/side',
    ],
  },
];

export const PREHAB_NOTE =
  "Flexible 5th session — serves the main work, never competes. LIGHT loads only (pump + movement quality, not strength). Best as: a filler on an easy day, a rest-day add-on, or the 'strength if energy' slot on FIFO weeks (band-based, travel-friendly). Never adjacent to a heavy upper day. Priority targets: right shoulder robustness + the lateral-raise L/R asymmetry — until those resolve, then ongoing maintenance. ~1×/week wherever it fits.";

export const STRENGTH_PRINCIPLES = [
  [
    '🦵',
    'Lower body is the priority — serves rowing, cycling and aesthetics with zero conflict. Most of your strength investment lives here.',
  ],
  [
    '🔙',
    'Bias pulling 2:1 over pressing on upper days. Back thickness is both the rowing engine and the V-taper.',
  ],
  [
    '💥',
    'Explosive concentric on squat & RDL — same weight, same reps, move the bar up fast. Trains force development for the drive and pedal stroke.',
  ],
  [
    '📉',
    'When Phase 2 threshold work starts, shift strength to maintenance — same loads, fewer sets. Protect the aerobic engine.',
  ],
  [
    '⚖️',
    "PRs will slow — the early 5kg jumps were return-to-training gains. When they stall, hold and consolidate. Don't force weight while carrying erg fatigue.",
  ],
];
