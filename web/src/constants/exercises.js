import { THEME } from './theme.js';
export const STRENGTH_TEMPLATES = [
  {
    name: 'Upper Day 1',
    focus: 'Push priority + 1 pull',
    color: THEME.accentAlt,
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
    color: THEME.accentAlt,
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
    color: THEME.positive,
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
    color: THEME.positive,
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
    color: THEME.accentAlt2,
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
