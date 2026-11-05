import { THEME } from './theme.js';
// Generic macro framework. The athlete's own numbers (protein/fat floors, TDEE,
// day-type targets, the maintenance and deficit plans) are live anchors
// (protein_floor_g, fat_floor_g, tdee_kcal, nutrition_targets, maintenance_plan,
// deficit_plan) — never written here.
export const MACRO_TARGETS = [
  {
    macro: 'Protein',
    rule: '~2g per kg',
    color: THEME.critical,
    anchorKey: 'protein_floor_g',
    note: 'Non-negotiable floor. Protects muscle in a deficit and drives recovery across a high-volume week. Hit this first every day.',
  },
  {
    macro: 'Carbs',
    rule: 'fill remaining',
    color: THEME.accent,
    anchorKey: null,
    note: 'After protein, bias calories here — not fat. Fuels the erg and lifting volume. Low carb + high volume = dead legs.',
  },
  {
    macro: 'Fat',
    rule: '~0.8g per kg',
    color: THEME.caution,
    anchorKey: 'fat_floor_g',
    note: "Don't drop below the floor — matters for hormones. Fill remaining calories after protein and carbs are set.",
  },
];

// Generic guardrails for any deficit phase. The plan itself (trigger, rate,
// phase timing, day-by-day numbers) is the `deficit_plan` anchor.
export const DEFICIT_GUARDRAILS = {
  guardrails: [
    'Aerobic power at a fixed HR is the early-warning barometer. Holds or climbs → fat off, fitness intact, continue. Drops two sessions running → add calories back.',
    'Fasted-AM weight should fall ~0.25–0.4 kg/wk. Faster = too aggressive, ease up.',
    'HRV/sleep degrading → under-fuelling, back off.',
    'Lift numbers dropping → deficit too steep.',
    'Protein at or above the floor (higher in a deficit — muscle-sparing + satiety). Fat at or above its floor. Cut CARBS on easy days, not protein or fat.',
  ],
  note: "Erg advantage: hold absolute watts while dropping fat = better power-to-weight = effectively faster splits. 'Hold the watts' is the whole game.",
};

export const FUELLING = {
  byType: [
    {
      type: 'Fasted easy row (UT1/UT2)',
      color: THEME.accent,
      guide:
        'KEEP fasted — at easy aerobic HR you burn mostly fat; fasted enhances fat-ox adaptation, exactly what base wants. If ever flat: banana / few dates 20min before. >75min: sip carbs during.',
    },
    {
      type: 'Two-a-day (erg AM + lift PM)',
      color: THEME.accentAlt2,
      guide:
        "THE priority. Fasted row fine. THEN: refuel within 30–60min post-row (40–60g carb + 25–30g protein) to restock glycogen. Eat properly ACROSS the day — don't coast on light meals till 4pm (that's the energy leak). Pre-lift 2–3pm: real carb meal/snack so you can load the squat.",
    },
    {
      type: 'Strength day',
      color: THEME.positive,
      guide:
        "Glycogen-dependent — unlike easy rowing. Arrive fuelled: carbs in the 2–3 hrs before. Protein 25–40g post. Don't lift depleted.",
    },
    {
      type: 'Hard intervals (Build phase)',
      color: THEME.warning,
      guide:
        'FUEL these (unlike easy work): carbs 1–2hr before, carbs during if >45min work. Dial when Build arrives.',
    },
  ],
  hydration: [
    'Sweat loss on the erg is often ~1 L per hour, more in heat. Weigh before/after a session to know your own number.',
    'Pre-row: 500ml on waking before a fasted session.',
    'Post: replace ~150% of the measured loss (e.g. ~1.5 L after a 1 kg loss).',
    'Electrolytes not just water — sodium especially, on two-a-days + heat. Plain water without salt just gets peed out.',
    "PM lift in heat: arrive already hydrated from the day, don't try to catch up at 4pm.",
  ],
  protein:
    'Daily protein floor (the live `protein_floor_g` anchor) is non-negotiable — protects muscle through any deficit. Spread across meals (~30–40g/meal), not back-loaded.',
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
