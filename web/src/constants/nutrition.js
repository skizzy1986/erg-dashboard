export const MACRO_TARGETS = [
  {
    macro: 'Protein',
    target: '~190g',
    rule: '2g per kg',
    color: '#ff2d55',
    note: 'Non-negotiable floor. Protects muscle in a deficit, drives recovery across 9 sessions/week. Hit this first every day.',
  },
  {
    macro: 'Carbs',
    target: 'High',
    rule: 'fill remaining',
    color: '#00d4ff',
    note: 'After protein, bias calories here — not fat. Fuels 5 erg + 4 lifting sessions. Low carb + your volume = dead legs.',
  },
  {
    macro: 'Fat',
    target: '~75g floor',
    rule: '0.8g per kg',
    color: '#ffd700',
    note: "Don't drop below the floor — matters for hormones. Fill remaining calories after protein and carbs are set.",
  },
];

export const MF_PROGRAM = [
  { day: 'Mon', train: '60min UT1', cal: 3000, p: 200, c: 350, f: 89 },
  { day: 'Tue', train: '45min + ladder', cal: 3000, p: 200, c: 350, f: 89 },
  { day: 'Wed', train: 'UT2 + Lower 1', cal: 3200, p: 200, c: 395, f: 89 },
  { day: 'Thu', train: 'yoga + Upper 2', cal: 2900, p: 200, c: 330, f: 87 },
  { day: 'Fri', train: '45min + Lower 2', cal: 3200, p: 200, c: 395, f: 89 },
  { day: 'Sat', train: 'long row', cal: 3200, p: 200, c: 395, f: 89 },
  { day: 'Sun', train: 'rest / light', cal: 2700, p: 200, c: 280, f: 87 },
];

export const DEFICIT_PROGRAM = {
  trigger:
    'Start ONLY after TDEE confirmed (clean week + stable weight). Not before — a deficit off a wrong maintenance does nothing or cuts too hard.',
  rate: '~0.25–0.3kg/week (avg ~230–350 cal/day under ~3,030 maintenance)',
  days: [
    {
      day: 'Mon',
      train: '60min UT1',
      cal: 2800,
      p: 210,
      c: 300,
      f: 84,
      cut: '-200',
    },
    {
      day: 'Tue',
      train: '45min + ladder',
      cal: 2800,
      p: 210,
      c: 300,
      f: 84,
      cut: '-200',
    },
    {
      day: 'Wed',
      train: 'UT2 + Lower',
      cal: 3100,
      p: 210,
      c: 375,
      f: 87,
      cut: '-100 (protect lift)',
    },
    {
      day: 'Thu',
      train: 'yoga + Upper',
      cal: 2500,
      p: 210,
      c: 250,
      f: 80,
      cut: '-400 (light day)',
    },
    {
      day: 'Fri',
      train: '45min + Lower',
      cal: 3100,
      p: 210,
      c: 375,
      f: 87,
      cut: '-100 (protect lift)',
    },
    {
      day: 'Sat',
      train: 'long row',
      cal: 3000,
      p: 210,
      c: 350,
      f: 84,
      cut: '-200',
    },
    {
      day: 'Sun',
      train: 'rest',
      cal: 2300,
      p: 210,
      c: 210,
      f: 78,
      cut: '-400 (rest day)',
    },
  ],
  guardrails: [
    'POWER@HR130 BAROMETER = the early-warning. ~150W now. Holds/climbs → fat off, fitness intact, continue. Drops 2 sessions running → add ~200 cal back.',
    'Fasted-AM weight should fall ~0.25–0.4kg/wk. Faster = too aggressive, ease up.',
    'HRV/sleep degrading → under-fuelling, back off.',
    'Squat/lift numbers dropping → deficit too steep.',
    'Protein 200–220g (HIGHER in deficit — muscle-sparing + satiety). Fat ≥75g (hormones). Cut CARBS on easy days, not protein or fat.',
  ],
  phase:
    'Run through BASE (now–Aug, forgiving of deficit). PAUSE at Build-1 (Sept) intensity ramp — eat maintenance to fuel hard work. Resume later if needed.',
  note: "Erg advantage: hold absolute watts while dropping fat = better power-to-weight = effectively faster splits. 'Hold the watts' is the whole game.",
};

export const FUELLING = {
  byType: [
    {
      type: 'Fasted easy row (UT1/UT2)',
      color: '#00d4ff',
      guide:
        'KEEP fasted — at HR130 you burn mostly fat; fasted enhances fat-ox adaptation, exactly what base wants. If ever flat: banana / few dates 20min before. >75min: sip carbs during.',
    },
    {
      type: 'Two-a-day (erg AM + lift PM)',
      color: '#f472b6',
      guide:
        "THE priority. Fasted row fine. THEN: refuel within 30–60min post-row (40–60g carb + 25–30g protein) to restock glycogen. Eat properly ACROSS the day — don't coast on light meals till 4pm (that's the energy leak). Pre-lift 2–3pm: real carb meal/snack so you can load the squat.",
    },
    {
      type: 'Strength day',
      color: '#34d399',
      guide:
        "Glycogen-dependent — unlike easy rowing. Arrive fuelled: carbs in the 2–3 hrs before. Protein 25–40g post. Don't lift depleted.",
    },
    {
      type: 'Hard intervals (Build phase)',
      color: '#ff6b35',
      guide:
        'FUEL these (unlike easy work): carbs 1–2hr before, carbs during if >45min work. Dial when Build arrives.',
    },
  ],
  hydration: [
    'Loss ~1kg (1L) per hour rowing — confirmed 6/15 (95.7→94.7 post-row). WA heat amplifies it.',
    'Pre-row: 500ml on waking before a fasted session.',
    'Post: replace 150% of loss — ~1.5L after a 1kg-loss row. Weigh before/after to know the real number.',
    'Electrolytes not just water — sodium especially, on two-a-days + heat. Plain water without salt just gets peed out.',
    "PM lift in heat: arrive already hydrated from the day, don't try to catch up at 4pm.",
  ],
  protein:
    'Floor 188g/day non-negotiable — protects muscle through any deficit. Spread across meals (~30–40g/meal), not back-loaded.',
};

export const NUTRITION_PRINCIPLES = [
  [
    '🎯',
    'Conservative deficit only: 0.25–0.4 kg/week. Aggressive cuts tank session quality and cost muscle. Slow loss preserves both.',
  ],
  [
    '📊',
    'Deficit is a weekly average, not a daily rule. Eat more around hard training, less on rest days — easier to sustain, better for performance.',
  ],
  [
    '🔋',
    "Two-a-day days need ~300–400 extra calories vs single-session days. Don't run a deficit on your highest-output days.",
  ],
  [
    '⏱️',
    'Peri-workout: 40–60g carbs + 25–30g protein within 30min of the AM erg on two-a-day days. Refuels for the PM strength session.',
  ],
  [
    '📱',
    'Consistency > precision. Log immediately, not end-of-day from memory. The logging habit is the lever — nail protein, roughly land calories, the rest sorts itself.',
  ],
  [
    '⚡',
    'Performance guardrail: if watts at a given HR start dropping, ease the deficit. For 2k erg, absolute power matters more than bodyweight — protect the power numbers.',
  ],
];

export const NUTRITION_TARGETS = {
  'two-a-day': {
    cal: [3000, 3500],
    protein: [185, 200],
    carbs: [330, 400],
    fat: [85, 110],
  },
  training: {
    cal: [2900, 3200],
    protein: [185, 200],
    carbs: [310, 370],
    fat: [80, 100],
  },
  rest: {
    cal: [2400, 2700],
    protein: [185, 200],
    carbs: [230, 290],
    fat: [70, 90],
  },
};
