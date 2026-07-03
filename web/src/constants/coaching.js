// ── ADAPTIVE DECISION ENGINE ──────────────────────────────────
// The codified "algorithm" — accumulated decision rules from our
// conversations, each with provenance. Transparent, not a black box:
// every recommendation traces to a stated rule. The ruleset EVOLVES
// (see RULE_EVOLUTION) — that's the longitudinal relationship made
// explicit. evaluateRules() reads current data and flags what fires.
export const ADAPTIVE_RULES = [
  {
    id: 'R1',
    domain: 'Intensity',
    tier: 1,
    rule: 'UT2 should feel sRPE 3–4, UT1 5–6. If an easy session scores higher, effort drifted up.',
    action:
      'Rein in next easy session — easy days genuinely easy protects the polarized base.',
    origin: 'Established 6/12 after repeated feel-good drift to top of band.',
  },
  {
    id: 'R2',
    domain: 'Fitness signal',
    tier: 1,
    rule: 'Watts rising at stable HR130 = genuine fitness gain.',
    action: 'Nudge UT1 pacer target up (deliberately, not by drifting).',
    origin: '134→145→151→149W at HR130 over a week (6/8–6/13).',
  },
  {
    id: 'R3',
    domain: 'sRPE trend',
    tier: 1,
    rule: 'Same session type scoring progressively harder week-on-week = accumulating fatigue, even if watts look identical.',
    action:
      'Flag it; ease the next cycle. Earliest overreaching signal — beats HRV.',
    origin: 'sRPE system added 6/12 per coach-review gap.',
  },
  {
    id: 'R4',
    domain: 'Recovery gate',
    tier: 2,
    rule: 'HRV below baseline + RHR above baseline together = under-recovered.',
    action:
      "Soften or skip the next hard session. Don't stack load on a dropping system.",
    origin:
      'HRV trough 25 on 6/11 confirmed the pattern; rebounded to 33 with rest.',
  },
  {
    id: 'R5',
    domain: 'Sleep',
    tier: 1,
    rule: 'Short sleep is the highest-leverage recovery deficit. Early bedtime is the lever.',
    action:
      'Protect bedtime over everything. Watch for repeated early waking (stress signal).',
    origin: '5h25m→8h50m turnaround 6/10–6/11 proved bedtime is the lever.',
  },
  {
    id: 'R6',
    domain: 'Life-stress governor',
    tier: 1,
    rule: "Family/life stress is real physiological load even though it doesn't show on the erg.",
    action:
      'When home is heavy, sessions yield without guilt. Structure is default, not obligation.',
    origin: "Partner's back + mother-in-law illness, ongoing from 6/12.",
  },
  {
    id: 'R7',
    domain: 'Roster periodisation',
    tier: 1,
    rule: 'FIFO swing = forced deload. Adaptation happens during recovery, not loading.',
    action:
      "Push when home, don't fight the deload on swing. Consolidate, don't grind.",
    origin: 'Core structural principle — roster as periodisation.',
  },
  {
    id: 'R8',
    domain: 'Base discipline',
    tier: 1,
    rule: 'No threshold/VO2 work in base phase, regardless of how good you feel or your trained background.',
    action:
      "'Push' in base = more volume, not intensity. Sharp work waits for Build 1 (Sept+).",
    origin:
      "Held against 'push it' directive 6/13 — trained cyclist engine doesn't change base physiology.",
  },
  {
    id: 'R9',
    domain: 'Testing',
    tier: 1,
    rule: 'Never benchmark while fatigued.',
    action:
      'Tests (CP, 5k, 2k) only on fresh days, off completed prerequisite work.',
    origin: 'Standing principle; CP test scheduled post-FIFO fresh day.',
  },
  {
    id: 'R10',
    domain: 'Cross-machine',
    tier: 2,
    rule: "Watts aren't comparable across machine brands (different algorithms).",
    action:
      'Anchor non-Concept2 sessions to HR + sRPE. Build personal conversion from paired data.',
    origin:
      'Technogym question 6/13 — conversion model now auto-building from Strava.',
  },
  {
    id: 'R11',
    domain: 'Data integrity',
    tier: 1,
    rule: 'Judge bodyweight & biometrics by weekly trend, never single readings.',
    action: 'Ignore daily scale/HRV noise; act on the multi-day direction.',
    origin:
      'Established during TDEE calibration; 94.0→95.3 daily swing 6/10–6/11.',
  },
  {
    id: 'R12',
    domain: 'Niggle management',
    tier: 2,
    rule: 'Active niggles get specific management, not training-through.',
    action:
      'Shoulder: forearm-press cue on planks. Hamstring: physio-led RDL rehab. Flag if erg catch provokes.',
    origin:
      'Shoulder twinge 6/10 (resolved via cue), hamstring physio history 6/12.',
  },
];

export const RULE_EVOLUTION = [
  {
    date: '6/12',
    change:
      'Engine seeded with R1–R3 (intensity discipline, fitness signal, sRPE trend) as the sRPE system and watts-first model matured.',
  },
  {
    date: '6/13',
    change:
      "Added R6 (life-stress governor), reinforced R8 (base discipline) against the 'push' directive, added R10 (cross-machine) from the Technogym question.",
  },
  {
    date: '6/13',
    change:
      'Codified the full ruleset into the dashboard as the transparent decision engine — longitudinal relationship made explicit.',
  },
];

// ── DAILY CHECK-IN ROUTINE ────────────────────────────────────
// When Scott asks "what's today's schedule" (or similar), run this
// before answering — keeps the dashboard synced to reality with no
// manual link-sending.
export const DAILY_ROUTINE = {
  trigger: "On 'what's today's schedule' / 'today's plan' / daily check-in",
  steps: [
    '1. Strava list_activities (last 2–3 days, NOT today-only — Strava timestamps run ~1 day off due to TZ/sync, so date-filtering today misses sessions). Match by distance/duration, not timestamp.',
    '2. For each new erg/bike session: get_activity_performance — HR, watts, cadence, relative effort',
    "3. Log new sessions to dashboard (Concept2 links still preferred for erg DETAIL — Strava catches what wasn't sent + Technogym/cycling)",
    '4. Flag any Technogym HR130 rows → feed the conversion model',
    "5. THEN give today's schedule from the microcycle, adjusted for what's already done + recovery state",
  ],
  note: 'Strava is the safety net — nothing trains without being captured. Concept2 share links still sent for force-curve/split detail on key erg sessions. This routine keeps the schedule answer current, not stale.',
};
