// Program-structure reference data (phases, annual arc, event pathway,
// technique/mobility drills, conversions). Pure data — consumed by ProgramView.

// ── TECHNIQUE & SKILL DEVELOPMENT ─────────────────────────────
// Coach-review gap: program was physiology-only. Technical efficiency
// is free speed — costs no recovery. Integrated into existing sessions.

// ── ERGZONE-COMPLIANT PRESCRIPTION STANDARD ───────────────────
// Every structured session is built in ErgZone-ready form: the fields
// map directly onto the app's interval builder. Build once → ErgZone
// paces it on the PM5 → logs to C2 logbook + Strava → I read it back.
// Same indirect pipe as Strava (no live connector); transcribes in seconds.
export const ERGZONE_FORMAT = {
  note: "Structured sessions below are ErgZone-builder ready. Build in the app's interval editor; it paces on the PM5 and logs back through your pipes — another data stream, like Strava.",
  fields:
    'Type (distance/time intervals) · Work × reps · Rest · Target · Rate cap · separate warmup',
  unlock:
    'CP test (Wed 1 Jul, 4-min protocol) switches targets from PACE to %FTP (ErgZone Premium, watts-based) — matches the watts-first model exactly. Until then, pace bands (free tier handles these).',
  status:
    "Queued for Build 1 (Sept). Base phase has nothing to program — easy HR-governed rows don't need it. Designs below won't change; only the target numbers firm up after the CP test + first 2k.",
};

// ── ROJABO PRINCIPLE — intensity model evolution ──────────────
// Danish National Team method (20+yr). Governs intensity by STROKE
// RATE with watts FIXED per rate — NOT heart rate. Reasoning: backing
// off to protect HR trains you to drop power as you fatigue = the
// opposite of racing. We adopt this for Build/race; base stays
// HR-governed (the HR cap is what keeps easy genuinely easy).
export const INTENSITY_EVOLUTION = {
  base: 'HR-GOVERNED (now). HR130 anchor, watts land where they fall, ceiling 136. Goal: aerobic adaptation, minimal fatigue. HR cap keeps easy genuinely easy.',
  buildRace:
    'STROKE-RATE / WATTS-FIXED (Build 1+, Rojabo). Fix target watts per stroke rate, hold constant power, let HR rise naturally as in a race. Trains you to HOLD power under fatigue — race-specific.',
  powerGuide:
    'Personal POWER GUIDE — built after the CP test. A table of target watts at each stroke rate (r18/20/22/24/26/28). Feeds ErgZone targets + race-pace anchors. This is the bridge from CP test → fixed-watts-per-rate prescription.',
  why: "Both right for their phase. Don't switch now — HR-governing is correct for base. The shift happens when race-specific work begins.",
};

// First structured sessions entering at Build 1. Targets PROVISIONAL
// (pace bands off the 2k target ~1:56) until CP test + real 2k land.
export const BUILD1_SESSIONS = [
  {
    name: 'Threshold · 3×2000m',
    serves: '5k engine',
    color: '#ffd700',
    purpose:
      'Lactate threshold / sustainable power — the core driver of a bigger 2k & 5k.',
    type: 'Distance intervals',
    work: '2000m × 3',
    rest: '3:00 (or 500m easy paddle)',
    target: '2:04–2:08 /500m · ~88–92% FTP once tested',
    rate: 'r22',
    warmup: '10min separate + 3×20s build',
  },
  {
    name: 'Threshold · 4×1500m',
    serves: '5k engine (progression)',
    color: '#ffd700',
    purpose:
      'Same system, shorter reps slightly faster — progression from 3×2000m.',
    type: 'Distance intervals',
    work: '1500m × 4',
    rest: '2:30',
    target: '2:02–2:06 /500m · ~90–94% FTP',
    rate: 'r22–24',
    warmup: '10min separate + 3×20s build',
  },
  {
    name: 'VO₂ · 8×500m',
    serves: '1000m / top-end',
    color: '#ff6b35',
    purpose: 'VO₂max & top-end power. Hard but controlled — not sprints.',
    type: 'Distance intervals',
    work: '500m × 8',
    rest: '2:30 easy',
    target: '1:54–1:58 /500m · ~105–110% FTP',
    rate: 'r26–28',
    warmup: '10min separate + 3×20s build',
  },
  {
    name: 'Race-pace · 4×1000m',
    serves: '1000m specific',
    color: '#ff2d55',
    purpose:
      'Race-pace tolerance for the 1000m format. Rehearse the goal pace.',
    type: 'Distance intervals',
    work: '1000m × 4',
    rest: '3:00',
    target: 'goal 1000m pace · ~100% FTP',
    rate: 'r28–30',
    warmup: '10min separate + 3×20s build',
  },
];

// ── OPTIONAL VOLUME EXTRAS (ErgZone-ready) ────────────────────
// Afternoon add-ons to grow weekly volume the RIGHT way: easy
// aerobic + technique, genuinely low-stress. Free volume only if
// kept truly easy. RULES: HR-capped (the cost-control), add on
// fresh days, SKIP before/around hard or strength days, body leads.
// This is how the serious-competitor volume arc gets built —
// easy minutes, not more intensity. Add gradually (young tissue).
export const VOLUME_EXTRAS = {
  rules:
    "Genuinely EASY or it's not free volume. HR cap is the guardrail. Add when fresh; skip when tired or a hard/strength day is adjacent. Build gradually — don't jump 5h→8h in a week. Body leads, never junk minutes to hit a number.",
  templates: [
    {
      name: 'Technique UT2 · 30min',
      color: '#00d4ff',
      focus: 'Volume + skill',
      type: 'Single time interval',
      work: '30:00',
      target: 'HR <120 · ~120–130W',
      rate: 'r18',
      warmup: '5min easy build',
      cues: 'Every stroke deliberate. Sequence: legs → back → arms (drive), arms → back → legs (recovery). Clean catch, no rush up the slide. Pause drills optional: 1sec pause at arms-away each stroke for 5min.',
    },
    {
      name: 'Easy UT2 flush · 30min',
      color: '#34d399',
      focus: 'Pure easy volume',
      type: 'Single time interval',
      work: '30:00',
      target: 'HR <125 · ~125–135W',
      rate: 'r19–20',
      warmup: '5min easy build',
      cues: "Conversational the whole way. Blood flow + aerobic base, zero stress. If you can't talk, ease off.",
    },
    {
      name: 'Technique + pause · 20min',
      color: '#a78bfa',
      focus: 'Skill-dominant',
      type: 'Single time interval',
      work: '20:00',
      target: 'HR <115 · light',
      rate: 'r16–18',
      warmup: '5min easy build',
      cues: 'Lowest-stress option. Pause drills: 2sec pause at arms-away, then bodies-over. Grooves sequencing without fatigue. Good the day before a hard session.',
    },
  ],
};

export const TECHNIQUE_WORK = [
  {
    name: 'Force curve review',
    freq: 'Every session',
    color: '#00d4ff',
    how: 'PM5: Display → Force Curve. Watch the shape — target a smooth haystack: rapid build, rounded peak mid-drive, gradual taper. Spikes = jerky catch; double-hump = legs/back disconnect; early peak collapse = leaning back too soon. NOTE: the curve is NOT in the Concept2 share links — for coaching feedback on the shape, SCREENSHOT the ErgData/PM5 force-curve display and send the image. Links carry splits/watts/drag/HR only.',
    why: '2–3% efficiency gain = free speed at every intensity.',
  },
  {
    name: 'Rate ladder block',
    freq: '1×/week (inside a UT1 session)',
    color: '#34d399',
    how: 'Mid-session: 2min @ r20 → 1min @ r22 → 1min @ r24 → 30sec @ r26 → back to r20. Hold the SAME watts-per-stroke feel — rate up by quickening recovery, not yanking the drive. HR will rise slightly; let it settle after.',
    why: "Race pace is r28–32. Rating up efficiently is a motor skill — build it now or it's a gap in November.",
  },
  {
    name: 'Technique 10s',
    freq: '2–3× per long row',
    color: '#a78bfa',
    how: '10 strokes of deliberate perfect focus: sequence (legs→back→arms / arms→back→legs), long stroke, clean catch. Then resume normal rowing.',
    why: 'Attention resets. Quality strokes under low fatigue groove the pattern that holds under high fatigue.',
  },
  {
    name: 'Video self-review',
    freq: '1×/fortnight (home week)',
    color: '#ffd700',
    how: 'Phone side-on, 2min of rowing at r20. Check: shins vertical at catch, back angle set before drive, no early arm bend, controlled recovery (not rushing the slide).',
    why: "You can't feel what you can't see. Fortnightly is enough to catch drift.",
  },
];

// ── MOVEMENT SCREEN & MOBILITY ────────────────────────────────
// Self-screen monthly; mobility block before every strength session.

export const MOVEMENT_SCREEN = [
  {
    test: 'Overhead squat (bare feet, arms up)',
    look: 'Heels down? Knees tracking? Arms staying overhead? Torso upright?',
    flag: 'Heels lift / arms fall forward → ankle or t-spine restriction',
  },
  {
    test: 'Toe touch',
    look: 'Smooth hinge, hands to toes without knee bend',
    flag: 'Short = hamstring length limiting catch compression & RDL depth',
  },
  {
    test: 'Single-leg balance (eyes closed, 20s each)',
    look: 'Stable both sides?',
    flag: 'Big L/R difference → note which side wobbles, watch it on split squats',
  },
  {
    test: 'Split squat depth L vs R',
    look: 'Equal depth and control both sides',
    flag: 'Asymmetry shows here first — log it, monitor monthly',
  },
];

export const MOBILITY_WARMUP = [
  'Hip hinge groove — 10 banded/bodyweight RDLs, slow',
  'T-spine rotation — 8/side (open books or thread-the-needle)',
  'Hip flexor + adductor — 60sec each (couch stretch / cossack holds)',
  'Ankle rocks — 10/side (knee over toe, heel down)',
];

// ── sRPE / SUBJECTIVE MONITORING ──────────────────────────────
// Research: subjective measures often outperform objective for catching
// overreaching. One number per session + daily feel. Logged with sessions.

// ── ANNUAL MACRO ARC ──────────────────────────────────────────
// TARGET: World Rowing Virtual Indoor Championships, ~late Feb 2027
// (date provisional — confirm when World Rowing announces 2027).
// Attempting all 3 formats: 1-min, 1000m, 5000m. Periodised to peak
// for that window. Repeating 2-week roster microcycles throughout.

// ── TECHNOGYM ↔ CONCEPT2 CONVERSION (building) ────────────────
// Anchor through the body: HR130 + sRPE are machine-independent.
// Row to HR130 on the Technogym, record its DISPLAYED watts. Compare
// to the same-day Concept2 HR130 power. The offset reveals the
// conversion. Needs ~4–6 clean paired points; offset may not be flat
// (could differ at high vs low power); baseline moves as fitness climbs.

export const TECHNOGYM_CONVERSION = {
  status:
    'Auto-collecting from Strava — both Concept2 and Technogym sessions flow in. 0 Technogym points so far (none rowed yet).',
  method:
    'AUTOMATIC: Technogym (via mywellness→Strava) and Concept2 sessions both land in Strava. I pull HR + displayed watts from each via the connector. Pair Technogym HR130 rows against Concept2 HR130 power → derive the offset. No manual reporting needed — just row to HR130 at camp and it self-captures.',
  current_c2_anchor: 'HR130 ≈ 150W (Concept2, 6/13)',
  pairs: [
    // auto-populated from Strava as Technogym HR130 sessions appear
  ],
  caveats:
    "Strava may carry Technogym's displayed watts (good) or only HR/pace (then HR-anchor only). Check first session's data richness. Re-check offset periodically — Concept2 HR130 baseline is climbing. Need ~4–6 clean points; offset may differ at high vs low power.",
};

// ── ATHLETE BACKGROUND (from Strava history) ──────────────────
// Context that informs how we read progression. NOT a novice — a
// recently-trained endurance athlete who pivoted to rowing Feb 2026.

export const ATHLETE_BACKGROUND = {
  headline:
    'Recently-trained cyclist + real strength age — pivoted to rowing Feb 2026',
  cycling: [
    'Peak block Oct–Dec 2025: regular 60–95km road rides (incl. 93.6km, 80km Scarbs loop, 70km group rides)',
    'Structured power training: full Wahoo SYSTM interval library + Zwift racing (Tour de Zwift, group rides)',
    'Very high training loads (relative effort up to 366) — trained hard, not just riding',
    'Bunch-riding experience (city loop group rides) — relevant for Perth group rides B-goal',
    'Last real ride mid-Jan 2026, then deliberate pivot to rowing',
  ],
  strength: [
    'Squat to 110kg×3, regularly 100–105kg×5 (autumn 2025)',
    'Deadlift 112.5kg×4 · Bench 72.5kg×5 · Military press 50kg×6',
    'Current squat e1rm ~118 ≈ where he was last autumn — real strength age, not rebuilding from zero',
  ],
  implications: [
    "Aerobic ceiling likely higher than current erg data shows — central engine already built, rowing-specific peripheral adaptation is what's catching up",
    "HR130 power may climb faster than a true novice's",
    'Cycling B-goal very achievable — maintaining/re-sharpening a strong recent base, not building from zero. Weeks not months to group-ride ready',
    'Responds well to structured intervals (SYSTM history) — bodes well for Build 1 threshold/VO2 work',
  ],
};

export const RACE_TARGET = {
  name: 'World Rowing Virtual Indoor Champs',
  when: '~late Feb 2027 (provisional)',
  formats: '1-min · 1000m · 5000m',
  note: 'Virtual — raced from your own erg, ErgData auto-verifies. No roster/travel clash.',
};

// ── ORGANISATIONS TO FOLLOW ───────────────────────────────────
export const ORGS = [
  {
    tier: 'GLOBAL',
    name: 'World Rowing (FISA)',
    site: 'worldrowing.com',
    color: '#ff2d55',
    note: 'International federation. Runs the World Rowing Indoor Champs (virtual + in-person). Home of your Feb 2027 target.',
  },
  {
    tier: 'GLOBAL',
    name: 'Concept2',
    site: 'concept2.com/events',
    color: '#ff2d55',
    note: 'Global rankings, Virtual Indoor Sprints, year-round logbook challenges. Follow most closely as a C2 athlete.',
  },
  {
    tier: 'GLOBAL',
    name: 'C.R.A.S.H.-B. Sprints',
    site: 'crash-b.org',
    color: '#ff2d55',
    note: "World's most prestigious in-person indoor champs (Boston, each winter). Hammer trophy. Bucket-list.",
  },
  {
    tier: 'NATIONAL',
    name: 'Rowing Australia',
    site: 'rowingaustralia.com.au',
    color: '#ffd700',
    note: 'Australian Indoor Rowing Champs + on-water nationals. Deep masters M40-49 category.',
  },
  {
    tier: 'STATE',
    name: 'Rowing WA',
    site: 'rowingwa.com.au',
    color: '#34d399',
    note: 'Your state body. State indoor champs, local clubs, sanctioned events. First in-person step.',
  },
];

// ── EVENT PROGRESSION PATHWAY ─────────────────────────────────
export const EVENT_PATHWAY = [
  {
    step: '1',
    when: 'Feb–Mar 2027',
    event: 'World Rowing Virtual Indoor Champs',
    type: 'Virtual',
    why: 'Race the world from home. Global ranking, 3 formats, zero travel. Your primary target.',
  },
  {
    step: '2',
    when: '2027',
    event: 'C2 Virtual Indoor Sprints (1000m)',
    type: 'Virtual',
    why: 'Lower-stakes virtual race in a set window. Good first competitive rep.',
  },
  {
    step: '3',
    when: '2027 +',
    event: 'WA State Indoor Championships',
    type: 'In-person',
    why: 'First in-person floor. Local-ish — experience racing others before travelling.',
  },
  {
    step: '4',
    when: '2028 +',
    event: 'Australian Indoor Rowing Champs',
    type: 'In-person',
    why: 'National level. M40-49 competitive and well-supported. A real step up.',
  },
  {
    step: '5',
    when: 'down the line',
    event: 'C.R.A.S.H.-B. / In-person World Indoors',
    type: 'International',
    why: 'The international goal. Boston winter. Where it becomes real.',
  },
];

export const ANNUAL_ARC = [
  {
    block: 'Extended Base',
    months: 'Jun – Aug 26',
    weeks: '~12 wks',
    current: true,
    focus:
      'Aerobic engine — underpins all 3 formats, 5k most directly. Z2 volume, strength building.',
    test: '5k benchmark end of block',
  },
  {
    block: 'Build 1',
    months: 'Sep – Oct 26',
    weeks: '~8 wks',
    current: false,
    focus:
      'Add threshold (2k reps) + short-sharp power (100m–1k) for the Erg Power Series. Lifts 5k & 1000m pace. Polarized. Strength → maintenance bias.',
    test: '🏁 ERG POWER SERIES (12 Sep–9 Oct, 4 wks/4 WODs, 100m–1k, Masters 40-49 open-wt) — FIRST real competition, lands exactly on the Base→Build transition. Power end = heavyweight advantage. Sharpen 2-3 wks before Sep 12.',
  },
  {
    block: 'Build 2 / Power',
    months: 'Nov – Dec 26',
    weeks: '~8 wks',
    current: false,
    focus:
      'Add VO₂ intervals (500m) + sprint/power work for 1-min & 1000m. Explosive strength carries over.',
    test: '1k or 2k checkpoint',
  },
  {
    block: 'Sharpen / Peak',
    months: 'Jan – Feb 27',
    weeks: '~7 wks',
    current: false,
    focus:
      'Race-pace work across all 3 formats. Sprint sharpening + threshold maintenance. Taper into champs.',
    test: '🎯 race-pace tune-ups',
  },
  {
    block: '🎯 RACE WINDOW',
    months: 'late Feb 27',
    weeks: 'race',
    current: false,
    focus:
      'World Rowing Virtual Indoor Champs. 1-min, 1000m, 5000m. Manage 3 max efforts across the race window — likely sprints and 5k on separate days.',
    test: '🎯 THE TARGET — 1min / 1000m / 5000m',
  },
  {
    block: 'Recovery',
    months: 'Mar 27',
    weeks: '~2–3 wks',
    current: false,
    focus:
      'Active recovery post-champs. Reduced structure, reflect on results, plan next cycle.',
    test: 'None — recharge',
  },
  {
    block: 'Base 2',
    months: 'Apr 27 +',
    weeks: 'ongoing',
    current: false,
    focus:
      'Rebuild base off a higher floor for the next season. On-water option in WA winter.',
    test: '5k benchmark — year-on-year compare',
  },
];
