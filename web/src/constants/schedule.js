export const MICROCYCLE = {
  home: {
    label: 'HOME WEEK — Loading (PUSH)',
    sub: 'Off-swing · full volume · build while fresh · trained engine can absorb it · erg 6am / strength 4pm',
    color: '#00d4ff',
    days: [
      {
        day: 'Sun',
        am: 'Upper Day 1 + optional 20–30min UT2',
        pm: '—',
        amNote:
          "Week opener, legs fresh. Upper push/pull — set the week's tone. Optional easy spin after for volume. Mobility block first.",
        amFuel:
          'Day target ~2,700 cal · 200g protein · ~280g carbs (lightest day). Protein around the lift for the upper work; carbs modest since demand is low.',
        amMeal: {
          pre: "FASTED + soy latte (your default). Upper work tolerates fasted easily — no carb load needed for it. The latte's soy protein is a fine touch.",
          post: '~30g protein + ~30g carbs. Upper sessions are lower glycogen-cost, so post-meal is protein-led. This is where the fuelling lands since you trained fasted.',
        },
      },
      {
        day: 'Mon',
        am: 'Erg — long (60min UT1)',
        pm: '—',
        amNote:
          'Big aerobic anchor. Settle low-130s, sRPE 6. Technique 10s ×3. Watch the force curve. Push = more volume, NOT more intensity.',
        amFuel:
          'Day target ~3,000 cal · 200g protein · ~350g carbs. Long aerobic = carbs matter. Can row fasted (fat-ox benefit in base), but refuel within 30-60min: ~40-60g carbs + 25-30g protein.',
        amMeal: {
          pre: "FASTED + soy latte — ideal for this. Long Z2 fasted is a genuine fat-ox benefit in base; the latte's fine. This is exactly the session to train fasted.",
          post: 'THE meal: ~50-60g carbs + 30g protein within 30-60min. The 60min depletes glycogen — since you rowed fasted, the refuel is where it all lands.',
        },
      },
      {
        day: 'Tue',
        am: 'Erg — 45min UT1 + rate ladder',
        pm: 'Rest',
        amNote:
          'Rate ladder mid-session: 2min r20→1min r22→1min r24→30s r26→r20. Same per-stroke feel throughout. Skill, not intensity.',
        amFuel:
          "Day target ~3,000 cal · 200g protein · ~350g carbs. Don't go fully fasted if pushing the rate work — some carbs in the tank for the ladder. PM rest: eat to recover.",
        amMeal: {
          pre: "FASTED + soy latte. The rate ladder is skill not intensity, so fasted is fine — you're not going hard enough to need carbs in the tank. If a rare day you feel flat, a few dates 20min before is plenty.",
          post: '~40g carbs + 25-30g protein, then eat normally across the day (PM rest).',
        },
      },
      {
        day: 'Wed',
        am: 'Erg — 30min UT2 easy',
        pm: 'Lower Day 1',
        amNote:
          "Genuinely easy (sRPE 3–4) — this is the recovery half of the day. Keep HR under cap. Don't let it bleed into the PM squat's legs.",
        amFuel:
          'AM of a TWO-A-DAY (day total ~3,200 cal · 200g protein · ~395g carbs). Light fuel before the easy erg, then a proper carb meal after to load for the PM squat.',
        amMeal: {
          pre: "FASTED + soy latte — perfect for the easy 30min. It's recovery-easy, no fuel needed.",
          post: "BIG refuel meal: ~80-100g carbs + 30-40g protein. This is the load-up for the PM squat — most important meal of the day sits here, eaten across the morning ~2hr before lifting (you've broken the fast by now).",
        },
        pmNote:
          "Heavy squat — progress the load (real strength age, reps in reserve). Mobility first, breathe through reps. This is the day's priority session.",
        pmFuel:
          "Fuel BETWEEN sessions: a proper carb meal ~2hr before this squat — don't lift glycogen-depleted. Creatine with the post-AM meal. This is why today eats ~300-400 more than single days.",
        pmMeal: {
          pre: 'Covered by the post-AM-erg meal (the ~80-100g carb load, eaten ~2hr before this squat). Creatine with it. Small ~20g carb top-up 30min prior if hungry.',
          post: '~60g carbs + 30-40g protein within 30-60min. Heavy squat = high glycogen cost, refuel properly.',
        },
      },
      {
        day: 'Thu',
        am: 'Foam roll + Yoga',
        pm: 'Upper Day 2',
        amNote:
          'Recovery AM — mobility and tissue work, not a session. Sets up the PM upper. Low burn.',
        amFuel:
          'Day target ~2,900 cal · 200g protein · ~330g carbs. AM is recovery (minimal burn) — normal meals, protein steady.',
        amMeal: {
          pre: "No specific pre-meal — mobility isn't a fuelling event. Just eat normally through the morning, protein-forward.",
          post: 'N/A — flows into normal daytime meals.',
        },
        pmNote:
          "Upper 2 — pull-ups 2nd while fresh, Pallof, forearm-press planks. Mobility first. Won't interfere with Friday's work.",
        pmFuel:
          'Protein around the lift (muscle). Carbs slightly lower than two-a-day days since only one real session.',
        pmMeal: {
          pre: '~400-500 cal · 40-50g carbs · 30-40g protein, ~90min before. Enough to fuel the pulls, not heavy.',
          post: "~30-40g protein + ~30g carbs. Protein-led — upper work's glycogen cost is modest.",
        },
      },
      {
        day: 'Fri',
        am: 'Erg — 45min UT1',
        pm: 'Lower Day 2',
        amNote:
          'Z2 aerobic AM. Steady, controlled. Fortnight video self-review: film 2min side-on. Mobility first.',
        amFuel:
          'AM of a TWO-A-DAY (day total ~3,200 cal · 200g protein · ~395g carbs). Refuel after the erg to load for the PM lower.',
        amMeal: {
          pre: 'FASTED + soy latte — steady 45min aerobic, ideal fasted.',
          post: 'BIG refuel: ~80-100g carbs + 30-40g protein. Loads up for the PM lower — eaten across the day, ~2hr before lifting.',
        },
        pmNote:
          'RDL rehab + power PM (6hr gap from erg). The hamstring/glute rehab work — quality over load. Protect the movement.',
        pmFuel:
          "Carb meal ~2hr before — protect the RDL/power work with glycogen. Don't lift the rehab session under-fuelled (form matters most here).",
        pmMeal: {
          pre: "The post-AM-erg carb load (~80-100g carbs) doubles as this pre-meal, ~2hr before. Rehab form needs fuel — don't skimp. Small carb top-up 30min prior if needed.",
          post: '~50-60g carbs + 30-40g protein within 30-60min.',
        },
      },
      {
        day: 'Sat',
        am: 'Erg — long (60–70min UT1)',
        pm: '—',
        amNote:
          'Extended long row — push the DURATION this week (engine can take it). Genuinely easy pace, sRPE 5–6. Erg only, no strength.',
        amFuel:
          'Peak-volume day · ~3,200 cal · 200g protein · ~395g carbs. Longest row = highest glycogen demand. Hydrate hard (replace ~150% of fluid lost). Refuel within 30-60min after.',
        amMeal: {
          pre: 'FASTED + soy latte is your default. ONE honest caveat: the 60-70min long row is the session where fasted is most likely to leave you flat late in the row. If you fade past ~45min, ~30g carbs during (sports drink/gel) helps — not a pre-meal, just mid-row fuel. Otherwise fasted is fine.',
          post: 'THE big one: ~60-80g carbs + 30g protein within 30-60min. Highest glycogen cost of the week + you trained fasted = refuel properly. Rehydrate to 150% of fluid lost.',
        },
      },
    ],
  },
  fifo: {
    label: 'FIFO WEEK — Consolidation (RECOVER)',
    sub: "On-swing · 12hr shifts · the deload that banks last week's gains · sleep is king",
    color: '#ffd700',
    machineNote:
      "Camp uses Technogym (Concept2 harder to access). For FIFO maintenance rows that's fine — connect Technogym app → Strava so sessions auto-capture. Log as HR/sRPE-anchored cross-training, NOT on the Concept2 watts trend or HR130 barometer (brand power numbers aren't comparable). Row to HR130 + report sRPE — those transfer across machines, watts don't. Comparable data resumes on the home Concept2. BUILDING a personal conversion (see below) to eventually give real Technogym watt targets.",
    days: [
      {
        day: 'Sun',
        am: 'Travel + foam roll/yoga if energy',
        pm: '—',
        amNote:
          "Transition day. Last week's load consolidates now. Sleep priority — the swing compresses it.",
        amFuel:
          'Recovery week, lower demand. ~2,600-2,800 cal · 200g protein (HOLD — protects muscle during the deload) · ~250g carbs. Travel: protein + whole foods over airport carbs.',
        amMeal: {
          pre: 'No training meal needed (travel/mobility day). Eat normally — protein-forward, whole foods over airport carbs.',
          post: 'N/A — normal daytime meals, protein floor held.',
        },
      },
      {
        day: 'Mon',
        am: 'Erg 30min easy (pre/post shift)',
        pm: '—',
        amNote:
          "Z2 only. The 12hr shift IS the stress — the erg is just engine maintenance. Adaptation from last week happens THIS week; don't fight the deload.",
        amFuel:
          "~2,700 cal · 200g protein · ~280g carbs. Fuel for the shift's demands, not the row. Pack protein-forward meals. Hydrate (shift work dehydrates).",
        amMeal: {
          pre: "Minimal for the easy 30min — a banana/coffee if anything. The shift's the real fuelling challenge: pack protein-forward meals for the 12hr.",
          post: '~30g protein + light carbs. Then fuel across the shift, hydrate well.',
        },
      },
      {
        day: 'Tue',
        am: 'Rest or Erg 20min',
        pm: '—',
        amNote:
          "Optional. Skip entirely if the shift was heavy or sleep was poor. No guilt — recovery is the week's job.",
        amFuel:
          '~2,600 cal · 200g protein · ~250g carbs. Minimal training — eat to recover, not to fuel. Protein floor holds.',
        amMeal: {
          pre: 'No pre-meal — optional 20min easy at most. Eat to recover, not to fuel.',
          post: 'Normal meals, protein floor (200g) holds. Carbs modest.',
        },
      },
      {
        day: 'Wed',
        am: 'Erg 30min easy',
        pm: '—',
        amNote:
          'Aerobic touch, zero intensity. Keep the engine ticking without adding fatigue.',
        amFuel:
          '~2,700 cal · 200g protein · ~280g carbs. Light aerobic only. Sleep + recovery are the real priority.',
        amMeal: {
          pre: 'Minimal — easy 30min, fasted is fine. Banana if hungry.',
          post: '~25-30g protein + light carbs. Recovery-week eating, nothing special needed.',
        },
      },
      {
        day: 'Thu',
        am: 'Foam roll + Yoga, or Prehab+Shoulder if energy',
        pm: '—',
        amNote:
          'Recovery or light band prehab (travel-friendly). Keeps the shoulder/asymmetry work ticking without load.',
        amFuel:
          '~2,600 cal · 200g protein · ~250g carbs. Recovery day — nutrient density over volume.',
        amMeal: {
          pre: "No training meal — mobility/prehab isn't a fuelling event. Normal protein-forward eating.",
          post: 'N/A — flows into recovery-week meals, nutrient density over volume.',
        },
      },
      {
        day: 'Fri',
        am: 'Erg 30min easy',
        pm: '—',
        amNote: 'Engine ticking over. Easy aerobic, no more.',
        amFuel:
          '~2,700 cal · 200g protein · ~280g carbs. Standard recovery-week fuelling.',
        amMeal: {
          pre: 'Minimal — easy 30min, fasted fine.',
          post: '~25-30g protein + light carbs. Standard recovery-week intake.',
        },
      },
      {
        day: 'Sat',
        am: 'Rest or Erg 20–30min',
        pm: '—',
        amNote:
          'Auto-regulate to how the swing went. Home loading resumes tomorrow — arrive recovered, not depleted.',
        amFuel:
          '~2,700 cal · 200g protein · ~290g carbs. Slight carb bump to refuel glycogen ahead of the PUSH week starting tomorrow.',
        amMeal: {
          pre: 'Minimal — optional easy session. ',
          post: 'Slightly higher carbs across the day (~290g) to top up glycogen before home loading resumes tomorrow. Protein floor holds.',
        },
      },
    ],
  },
};

export const SEASON = {
  current: 1,
  label: 'SEASON 1',
  span: 'Jun 2026 – Mar 2027',
  finale: 'World Rowing Virtual Indoor Champs (late Feb 2027)',
  arc: 'Base (Jun–Aug) → Build 1 (Sep–Oct) → Build 2 (Nov–Dec) → Peak (Jan–Feb) → Race → Recover (Mar)',
  goal: 'First full competitive season. Establish the baseline across all 3 formats (1-min/1000m/5000m). Lean out through base, build power through Build, peak for Worlds.',
  next: 'Season 2 (Apr 2027+) rebuilds off a higher floor — more volume, the lessons of S1 banked, a stronger base each cycle. The multi-year arc = stacked seasons.',
  principle:
    'A season is the unit of progression. Worlds is the finale, not the finish. Each season: full cycle, race the finale, recover, then begin again higher.',
};

export const SEASON_2 = {
  label: 'SEASON 2',
  span: 'Apr 2027 – Mar 2028',
  theme:
    'Off a higher floor. Introduce the 2000m (the classic indoor distance) — opens the door to in-person racing. First live-race experience the big step.',
  fork: 'STRATEGIC FORK: keep the virtual Worlds as finale (familiar, proven), OR step up to an in-person event (CRASH-B / Aus Indoor Champs / in-person WRICH). In-person = the serious-competitor leap but needs 2k/500m focus. Decide early in S2 — it shapes the whole format emphasis.',
  phases: [
    {
      phase: 'Transition · Apr 27',
      events:
        'Recover from S1. Reflect on Worlds. Plan S2 + make the in-person fork decision.',
      kind: 'recover',
    },
    {
      phase: 'Base 2 · May–Aug 27',
      events:
        'Higher-floor base (6-7h). On-water option in WA winter. Benchmarks: CP retest, 5k TT off a stronger engine. Possibly introduce 2k baseline if going in-person.',
      kind: 'benchmark',
    },
    {
      phase: 'Build 1 · Sep–Oct 27',
      events:
        'Erg Power Series again (if recurring) — now stronger, target a podium. Power/sprint focus.',
      kind: 'competition',
    },
    {
      phase: 'Build 2 · Nov–Dec 27',
      events:
        'Monthly challenges. 🌟 FIRST IN-PERSON COMP — a regional/state Australian indoor race (less travel than overseas, ideal first live-race experience).',
      kind: 'aspirational',
    },
    {
      phase: 'Peak · Jan–Feb 28',
      events:
        '2k tests + race-pace tune-ups. 🌟 CRASH-B SPRINTS (Boston, ~late Feb/Mar) — the bucket-list indoor champs, 2000m, the global aspirational target. Big trip from WA — investigate cost/timing early.',
      kind: 'aspirational',
    },
    {
      phase: 'Race · Feb–Mar 28',
      events:
        'Season finale: virtual Worlds (Feb 2028) AND/OR the chosen in-person event. 🌟 In-person WRICH (2000m/500m) if it materialises.',
      kind: 'TARGET',
    },
    {
      phase: 'Post · Mar 28',
      events:
        'WR Virtual Sprints (1000m) season-closer. Recover. Open Season 3 off a higher floor again.',
      kind: 'optional',
    },
  ],
  aspirational: [
    {
      name: 'CRASH-B Sprints (Boston)',
      what: "The world's most famous indoor champs. 2000m. Every Feb/Mar. The bucket-list travel race — huge trip from WA, but THE indoor rowing event. A genuine serious-competitor milestone.",
      chase:
        'Investigate 2028 dates + cost early. A real goal to build toward.',
    },
    {
      name: 'Australian Indoor Champs / state comps',
      what: 'Domestic in-person racing — far less travel for a WA athlete. The sensible FIRST live-race experience before chasing overseas events.',
      chase:
        'Find the WA/national indoor calendar. Lowest barrier to first in-person race.',
    },
    {
      name: 'In-person WRICH (2000m/500m)',
      what: "World Rowing's planned in-person championship (traditional distances). If it runs, the natural in-person step-up from the virtual Worlds.",
      chase: "Watch for World Rowing's announcement.",
    },
    {
      name: 'HYROX (erg + fitness crossover)',
      what: 'Functional-fitness race featuring the erg. A fun, different challenge — tests fitness beyond pure rowing.',
      chase: 'Optional/fun. Investigate if cross-training appeals.',
    },
  ],
};

export const EVENT_LADDER = [
  {
    date: 'Wed 1 Jul 26',
    name: 'CP Test #1 (4-min)',
    kind: 'benchmark',
    phase: 'Base',
    serves:
      'Keystone pt 1 — first clean rowing-test anchor on fresh legs (post-FIFO taper). 4-min all-out (C2 protocol, pace-able, on the ranking). Sets a trustworthy threshold anchor; CP+W′ model completed by test #2 next home week. Unlocks %CP pacing + Power Guide.',
  },
  {
    date: '~Mid Jul 26',
    name: 'CP Test #2 (2nd duration)',
    kind: 'benchmark',
    phase: 'Base',
    serves:
      'Keystone pt 2 — second maximal effort at a different duration (e.g. 1-min + the 4-min, or a longer 7-10min piece) to complete the 2-point power-duration model. More reliable than any single all-out test. Builds CP + W′ properly.',
  },
  {
    date: '~Early Aug 26',
    name: '5k Time Trial',
    kind: 'benchmark',
    phase: 'Base end',
    serves:
      'First real read on the 5000m format + what base built. Do fresh, low-stakes.',
  },
  {
    date: '12 Sep–9 Oct 26',
    name: 'Erg Power Series',
    kind: 'competition',
    phase: 'Build 1',
    serves:
      'FIRST competition. Tests 1-min/1000m power end (2 of 3 Worlds formats). Heavyweight advantage. Sharpen 2-3wk prior.',
  },
  {
    date: 'Nov–Dec 26',
    name: 'C2 Monthly / handicap race',
    kind: 'competition',
    phase: 'Build 2',
    serves:
      'Low-stakes competitive volume — race within training, no peak needed. Keeps the edge through the build.',
  },
  {
    date: '~Mid Jan 27',
    name: '2k Test',
    kind: 'benchmark',
    phase: 'Peak lead-in',
    serves:
      'Universal rowing benchmark — best single fitness measure, predicts across all distances. Pre-peak data.',
  },
  {
    date: 'Late Jan 27',
    name: '1000m + 1-min tune-ups',
    kind: 'benchmark',
    phase: 'Peak',
    serves:
      'Race-specific rehearsals at Worlds distances, ~3-4wk out. Dial pacing, not compete.',
  },
  {
    date: '🎯 Late Feb 27',
    name: 'World Rowing Virtual Indoor Champs',
    kind: 'TARGET',
    phase: 'Race',
    serves:
      'THE GOAL. 1-min, 1000m, 5000m. Two Feb weekends (2026 pattern: Feb 21/22 + 28). The only true peak.',
  },
  {
    date: 'Early Mar 27',
    name: 'WR Virtual Indoor Sprints (1000m)',
    kind: 'optional',
    phase: 'Post-peak',
    serves:
      'Recurs every March, race anywhere. Bonus 1000m while still sharp — clean season-closer before recovery.',
  },
];

export const VOLUME_PROGRESSION = {
  ambition:
    'Serious masters competitor — a 2–3 YEAR arc, not a single peak. Feb 2027 = first real benchmark, raced off one solid year. The genuine contender version is the 2028–2029 athlete, built on accumulated volume.',
  principle:
    "Build ~10%/cycle, body leads. You don't decide to be a 10h athlete — you become one through sustainable accumulated load. Never jump volume; build into it. Young rowing tissues (18mo in) still maturing despite the cycling base.",
  current: '~5h loading week / ~2h FIFO week (~3.5h cycle avg)',
  unlock:
    'FIFO is THE structural puzzle. Half your weeks lost to 12hr shifts → a 10h avg needs home weeks carrying 12–14h (brutal). The real unlock: genuine training at camp (Technogym / camp C2), not just maintenance — turning FIFO from deload-by-necessity into deload-by-CHOICE. Biggest single lever on serious volume.',
  trajectory: [
    {
      phase: 'Base · now→Aug',
      target: '5 → 6–7h loading wk',
      note: 'Pure aerobic. Build long-row duration + add easy volume.',
    },
    {
      phase: 'Build 1–2 · Sep–Dec',
      target: '7–9h',
      note: 'Volume gains QUALITY — threshold/VO2 added. Not just more minutes.',
    },
    {
      phase: 'Peak · Jan–Feb',
      target: 'sharpen',
      note: 'Volume may dip as intensity peaks. Race-specific.',
    },
    {
      phase: 'Year 2+ · post-Feb27',
      target: '10h+',
      note: "Serious-competitor volume lives here, off a full year's base.",
    },
  ],
  caveat:
    'Volume stays HR-governed easy in base — NEVER junk minutes to hit a number. The number serves the engine, not the reverse. If recovery/sRPE flag accumulation, hold the build. Sustainable-and-consistent beats maximal-and-fragile, especially with FIFO + life load.',
};

export const PHASES = [
  {
    id: 'base',
    name: 'Phase 1 — Base',
    duration: '6–8 weeks',
    current: true,
    status: 'IN PROGRESS',
    principle:
      'Build aerobic engine. 100% of erg sessions in UT1/UT2 (HR < 141). Volume increases ~10% per week. No intensity. Strength: 2 upper + 2 lower, progressive overload on compounds.',
    science:
      'Seiler (2010) & GBRT matrix: low-intensity volume drives peripheral adaptations — mitochondrial density, capillarisation, fat oxidation. These take 6–8 weeks minimum to consolidate and cannot be rushed with intensity.',
    test: "End of Phase 1 (~wk 6): 5k benchmark off 2–3 days easy. Base-phase reference + doubles as threshold marker. Optional 30min step test earlier if FTP calibration needed — that's a training tool, not a performance test.",
    weekly: [
      {
        day: 'Mon',
        type: 'Z2 Aerobic',
        label: 'Long Row',
        detail: '60min',
        zone: 'UT1/UT2',
        hr: '119–136',
        notes:
          'Flat splits. Settle into HR band by 2km and hold. Ceiling 136 — ease off if approaching it rather than pushing through.',
      },
      {
        day: 'Tue',
        type: 'Upper Strength',
        label: 'Upper Body',
        detail: '60 min',
        zone: '—',
        hr: '—',
        notes:
          'Compounds first. Bench, Row, Pulldown, Shoulder Press. Progressive overload each session.',
      },
      {
        day: 'Wed',
        type: 'Z2 Aerobic',
        label: 'Steady State',
        detail: '45min',
        zone: 'UT1/UT2',
        hr: '119–136',
        notes:
          'Warmup piece separate (8–10min). Log main 45min block clean. HR governor — no grey zone.',
      },
      {
        day: 'Thu',
        type: 'Lower Strength',
        label: 'Lower Body',
        detail: '60 min',
        zone: '—',
        hr: '—',
        notes:
          'Squat, RDL primary. Explosive concentric. Add 2.5–5kg when 3 sets completed cleanly.',
      },
      {
        day: 'Fri',
        type: 'Z2 Aerobic',
        label: 'Easy Row',
        detail: '45min',
        zone: 'UT1/UT2',
        hr: '119–134',
        notes:
          "Keep HR lower end of band. Should feel easier than Mon/Wed rows — it's the third erg session of the week.",
      },
      {
        day: 'Sat',
        type: 'Upper Strength',
        label: 'Upper Body',
        detail: '60 min',
        zone: '—',
        hr: '—',
        notes: 'Second upper session. Same compounds as Wednesday gym session.',
      },
      {
        day: 'Sun',
        type: 'Rest',
        label: 'Full Rest',
        detail: 'Off',
        zone: '—',
        hr: '—',
        notes: 'Rest. Adaptation happens during recovery.',
      },
    ],
  },
  {
    id: 'build',
    name: 'Phase 2 — Build',
    duration: '4–6 weeks',
    current: false,
    status: 'UPCOMING',
    principle:
      'Add one threshold session per week. 80% erg volume stays Z2. 20% moves to AT zone. Pete Plan structure: 1 threshold session + 2–3 Z2 sessions. Strength maintained.',
    science:
      'Polarized TID: ~80% below LT1, ~20% above LT2. GBRT AT training improves lactate clearance and delays anaerobic threshold. Evidence: Neal et al. (2013) showed POL superior to threshold-only in well-trained athletes.',
    test: 'Mid/end Phase 2: optional 5k re-test to track threshold progress. Hold the 2k back — testing it before interval work undersells your potential.',
    weekly: [
      {
        day: 'Mon',
        type: 'Z2 Aerobic',
        label: 'Long Row',
        detail: '10,000m',
        zone: 'UT1/UT2',
        hr: '130–141',
        notes: 'Base session unchanged from Phase 1. Flat splits.',
      },
      {
        day: 'Tue',
        type: 'Upper Strength',
        label: 'Upper Body',
        detail: '60 min',
        zone: '—',
        hr: '—',
        notes: 'Maintain Phase 1 loads. Add reps before weight.',
      },
      {
        day: 'Wed',
        type: 'Threshold',
        label: 'Threshold Reps',
        detail: '3 × 2000m',
        zone: 'AT',
        hr: '141–153',
        notes:
          '3min rest between reps. All three at same pace. Build to 4 × 2000m over Phase 2.',
      },
      {
        day: 'Thu',
        type: 'Lower Strength',
        label: 'Lower Body',
        detail: '60 min',
        zone: '—',
        hr: '—',
        notes:
          'Squat, RDL. Legs may carry threshold fatigue — warm up fully before loading.',
      },
      {
        day: 'Fri',
        type: 'Z2 Aerobic',
        label: 'Steady State',
        detail: '8,000m',
        zone: 'UT1/UT2',
        hr: '130–141',
        notes: 'Flush session after Thursday lower. Flat pace, low rate.',
      },
      {
        day: 'Sat',
        type: 'Upper Strength',
        label: 'Upper Body',
        detail: '60 min',
        zone: '—',
        hr: '—',
        notes: 'Second upper. Same structure as Tuesday.',
      },
      {
        day: 'Sun',
        type: 'Rest',
        label: 'Full Rest',
        detail: 'Off',
        zone: '—',
        hr: '—',
        notes:
          'Full rest. Threshold work elevates fatigue — recovery is non-negotiable.',
      },
    ],
  },
  {
    id: 'peak',
    name: 'Phase 3 — Peak',
    duration: '4–6 weeks',
    current: false,
    status: 'UPCOMING',
    principle:
      'Full polarized distribution. Add VO₂ intervals (500m pieces). 2 hard sessions/week max — threshold + intervals on non-adjacent days. Z2 volume maintained. Strength: move toward maintenance (fewer sets, same load). RACE-CRAFT becomes explicit: pacing strategy per format, start sequences, rate plans, middle-1000 management. Racing is a skill — and three formats means three different skills.',
    science:
      '2024 systematic review (Nøst et al., Sports): 15–20% HIT combined with 75–80% LIT produces greatest VO2max improvement. Long-interval format (4–6 × 3min @ VO2max pace) maximises cardiac output stimulus per Athletica rowing science.',
    test: '🎯 2k TARGET TEST (~wk 10–12): the real benchmark. Full 3-day taper before it. Tested fresh, off completed interval + threshold work. Submit to Concept2 World Rankings. This is the number the whole block builds toward.',
    weekly: [
      {
        day: 'Mon',
        type: 'VO₂ Intervals',
        label: 'Intervals',
        detail: '8 × 500m',
        zone: 'TR',
        hr: '153–162',
        notes:
          '3min rest between reps. Target: 2sec faster than threshold rep pace. Start conservative — complete all 8.',
      },
      {
        day: 'Tue',
        type: 'Upper Strength',
        label: 'Upper Body',
        detail: '60 min',
        zone: '—',
        hr: '—',
        notes:
          'Upper strength. Reduce to maintenance volume (2 sets per compound vs 3).',
      },
      {
        day: 'Wed',
        type: 'Z2 Aerobic',
        label: 'Steady State',
        detail: '10,000m',
        zone: 'UT1/UT2',
        hr: '130–141',
        notes: "Long Z2 between hard sessions. Critical — don't skip.",
      },
      {
        day: 'Thu',
        type: 'Threshold',
        label: 'Threshold Reps',
        detail: '4 × 2000m',
        zone: 'AT',
        hr: '141–153',
        notes:
          'Full 4 reps. Wednesday Z2 should mean legs are ready. Hold same split all 4.',
      },
      {
        day: 'Fri',
        type: 'Lower Strength',
        label: 'Lower Body',
        detail: '60 min',
        zone: '—',
        hr: '—',
        notes:
          'Lower strength. Maintenance focus — squat and RDL, reduced volume.',
      },
      {
        day: 'Sat',
        type: 'Z2 Aerobic',
        label: 'Easy Row',
        detail: '5,000m',
        zone: 'UT2',
        hr: '< 130',
        notes: 'Easy flush. Low rate, low HR. Pre-rest day aerobic stimulus.',
      },
      {
        day: 'Sun',
        type: 'Rest',
        label: 'Full Rest',
        detail: 'Off',
        zone: '—',
        hr: '—',
        notes: 'Full rest before Monday intervals. Do not compromise this.',
      },
    ],
  },
];

export const PHASE_CONTEXT = {
  current: 'BASE',
  phaseLabel: 'Phase 1 — Base (Extended)',
  window: 'Jun–Aug 2026',
  weeksIn: 3,
  weeksTotal: 12,
  doing:
    'Building the aerobic engine. All erg in UT1/UT2, volume rising ~10%/wk, no intensity. Strength progressing on compounds.',
  why: "Peripheral adaptations (mitochondria, capillaries, fat oxidation) take 6–8wk minimum and can't be rushed. The foundation everything later is built on.",
  notYet:
    "No threshold or VO2 work — that's Build 1 (Sept+). Resisting intensity now IS the work.",
  nextGate:
    'End-of-base 5k benchmark (~wk 6, early Aug) — first real fitness checkpoint.',
  arc: [
    { phase: 'BASE', window: 'Jun–Aug', active: true },
    { phase: 'BUILD 1', window: 'Sep–Oct', active: false },
    { phase: 'BUILD 2', window: 'Nov–Dec', active: false },
    { phase: 'PEAK', window: 'Jan–Feb', active: false },
    { phase: 'RACE', window: 'late Feb 2027', active: false },
  ],
};
