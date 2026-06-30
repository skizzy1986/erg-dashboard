import { useState, useEffect, Component, lazy, Suspense } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { supabase } from './supabaseClient.js';
import StrengthLogger from './StrengthLogger.jsx';
import ErgLiveView from './views/ErgLiveView.jsx';
import CoachView from './views/CoachView.jsx';
import ErgView from './views/ErgView.jsx';
import JournalView from './views/JournalView.jsx';
import RecoveryView from './views/RecoveryView.jsx';
import WorkoutItem from './components/WorkoutItem.jsx';
import LogSessionForm from './components/LogSessionForm.jsx';
import LogEntry from './components/LogEntry.jsx';
import ErgTooltip from './components/ErgTooltip.jsx';
import StrengthTooltip from './components/StrengthTooltip.jsx';
import LoadTooltip from './components/LoadTooltip.jsx';
import { calcTrainingLoad, deriveTargets } from './utils/trainingLoad.js';
import {
  SRPE_GUIDE,
  CALIBRATION_STATUS,
  CRITICAL_POWER,
  POWER_DURATION,
  FTP_TEST,
  HR_ZONES,
  EST_MHR,
  SRPE_SCALE,
  DAILY_TSS,
  RHR_BASELINE,
  HRV_BASELINE,
  HR130_POWER,
} from './constants/trainingConfig.js';
import {
  REP_SCHEMES,
  LOWER_DIFFERENTIATION,
  PREHAB_NOTE,
  STRENGTH_PRINCIPLES,
  STRENGTH_TEMPLATES,
} from './constants/exercises.js';
import {
  MACRO_TARGETS,
  MF_PROGRAM,
  DEFICIT_PROGRAM,
  FUELLING,
  NUTRITION_PRINCIPLES,
  NUTRITION_TARGETS,
} from './constants/nutrition.js';
import {
  MICROCYCLE,
  SEASON,
  SEASON_2,
  EVENT_LADDER,
  VOLUME_PROGRESSION,
  PHASES,
  PHASE_CONTEXT,
} from './constants/schedule.js';
import { C, ICON } from './constants/ui.js';
import { normType, assessMacro, macroColor } from './utils/formatting.js';
import {
  getRosterMode,
  resolveDay,
  logEntriesForDate,
  dayStatus,
  getToday,
  getUpcomingSessions,
  daySessions,
} from './utils/schedule.js';
import {
  evaluateRules,
  checkConsistency,
  autoregulate,
  calcReadiness,
} from './utils/analysis.js';
import { mobilityLog, nutritionLog, recoveryLog } from './constants/logs.js';
import {
  ADAPTIVE_RULES,
  RULE_EVOLUTION,
  DAILY_ROUTINE,
} from './constants/coaching.js';

/* ═══════════════════════════════════════════════════════════════
   ERG COACHING DASHBOARD · v1.2 beta
   ───────────────────────────────────────────────────────────────
   MAP (search the ── banner to jump):
   • DATA + HELPERS ......... lines ~4–2015 (everything before App)
       - Logs: SESSION LOG, BLOODS, HORMONE, MOBILITY, DECISION LEDGER
       - Plans: MICROCYCLE, SEASON, EVENT PROGRESSION, MACROFACTOR
       - Engine: ADAPTIVE DECISION ENGINE, AUTOREGULATION, ROSTER
       - Components: WorkoutItem, LogEntry, tooltips
   • APP COMPONENT .......... from `export default function App`
       - State + live clock/roster, NAV, then one block per tab:
         overview · calendar · program · erg · strength · mobility
         · recovery · log · journal
   KEY SYSTEMS:
   • Roster auto-switch: getRosterMode() — home/FIFO by date,
     anchored to ROSTER_ANCHOR (Tue 23 Jun 2026 = FIFO out).
   • Shared workout UI: WorkoutItem (one session/box) + daySessions().
   • Validate before deploy: esbuild + the each-tab render test.
   ═══════════════════════════════════════════════════════════════ */

// ── ERROR BOUNDARY (beta hardening) ───────────────────────────
// Isolates render failures so one bad tab doesn't white-screen the app.
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, msg: '' };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, msg: error?.message || 'Render error' };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: '24px',
            background: '#1a0d0d',
            border: '1px solid #ff2d5550',
            borderRadius: 6,
            color: '#ffaaaa',
            fontFamily: "'DM Mono',monospace",
            fontSize: 12,
            lineHeight: 1.6,
          }}
        >
          ⚠️ This section hit a render error and was isolated to protect the
          rest of the dashboard.
          <br />
          <span style={{ color: '#888', fontSize: 10 }}>{this.state.msg}</span>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── SESSION LOG (add entries here as block progresses) ──────────

const sessionLog = []; // retired — sessions now live in Supabase (migrated)

const strengthTrend = {
  'Back Squat': [
    { date: '6/3', e1rm: 109.7 },
    { date: '6/5', e1rm: 110.5 },
    { date: '6/9', e1rm: 118.0 },
  ],
  'Romanian Deadlift': [
    { date: '6/3', e1rm: 85.2 },
    { date: '6/5', e1rm: 89.2 },
    { date: '6/9', e1rm: 95.8 },
  ],
  'Bench Press': [
    { date: '6/3', e1rm: 63.4 },
    { date: '6/8', e1rm: 71.2 },
  ],
  'Incline Bench': [
    { date: '6/3', e1rm: 52.9 },
    { date: '6/7', e1rm: 55.8 },
    { date: '6/8', e1rm: 61.7 },
  ],
  'Cable Row': [
    { date: '5/31', e1rm: 62.3 },
    { date: '6/4', e1rm: 74.6 },
    { date: '6/8', e1rm: 98.0 },
  ],
  'Barbell Row': [
    { date: '5/31', e1rm: 53.8 },
    { date: '6/4', e1rm: 62.8 },
  ],
  'Lat Pulldown': [
    { date: '5/31', e1rm: 66.1 },
    { date: '6/4', e1rm: 74.6 },
  ],
  'Shoulder Press': [
    { date: '6/4', e1rm: 41.9 },
    { date: '6/7', e1rm: 46.2 },
  ],
};

const LIFT_COLOR = {
  'Back Squat': '#34d399',
  'Romanian Deadlift': '#34d399',
  'Bench Press': '#a78bfa',
  'Incline Bench': '#a78bfa',
  'Barbell Row': '#00d4ff',
  'Lat Pulldown': '#00d4ff',
  'Shoulder Press': '#f472b6',
};

// ── PROGRAM STRUCTURE ─────────────────────────────────────────
// Based on: polarized TID (Seiler 2010, Silva Oliveira et al. 2024),
// British Rowing training matrix, Pete Plan continuous improvement model

// ── 2-WEEK MICROCYCLE (roster-driven) ─────────────────────────
// 1-on/1-off FIFO roster used AS periodization. Home week = loading,
// FIFO week = auto-deload. Erg is priority; strength yields when scarce.

// ── TECHNIQUE & SKILL DEVELOPMENT ─────────────────────────────
// Coach-review gap: program was physiology-only. Technical efficiency
// is free speed — costs no recovery. Integrated into existing sessions.

// ── ERGZONE-COMPLIANT PRESCRIPTION STANDARD ───────────────────
// Every structured session is built in ErgZone-ready form: the fields
// map directly onto the app's interval builder. Build once → ErgZone
// paces it on the PM5 → logs to C2 logbook + Strava → I read it back.
// Same indirect pipe as Strava (no live connector); transcribes in seconds.
const ERGZONE_FORMAT = {
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
const INTENSITY_EVOLUTION = {
  base: 'HR-GOVERNED (now). HR130 anchor, watts land where they fall, ceiling 136. Goal: aerobic adaptation, minimal fatigue. HR cap keeps easy genuinely easy.',
  buildRace:
    'STROKE-RATE / WATTS-FIXED (Build 1+, Rojabo). Fix target watts per stroke rate, hold constant power, let HR rise naturally as in a race. Trains you to HOLD power under fatigue — race-specific.',
  powerGuide:
    'Personal POWER GUIDE — built after the CP test. A table of target watts at each stroke rate (r18/20/22/24/26/28). Feeds ErgZone targets + race-pace anchors. This is the bridge from CP test → fixed-watts-per-rate prescription.',
  why: "Both right for their phase. Don't switch now — HR-governing is correct for base. The shift happens when race-specific work begins.",
};

// First structured sessions entering at Build 1. Targets PROVISIONAL
// (pace bands off the 2k target ~1:56) until CP test + real 2k land.
const BUILD1_SESSIONS = [
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
const VOLUME_EXTRAS = {
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

const TECHNIQUE_WORK = [
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

const MOVEMENT_SCREEN = [
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

const MOBILITY_WARMUP = [
  'Hip hinge groove — 10 banded/bodyweight RDLs, slow',
  'T-spine rotation — 8/side (open books or thread-the-needle)',
  'Hip flexor + adductor — 60sec each (couch stretch / cossack holds)',
  'Ankle rocks — 10/side (knee over toe, heel down)',
];

// ── sRPE / SUBJECTIVE MONITORING ──────────────────────────────
// Research: subjective measures often outperform objective for catching
// overreaching. One number per session + daily feel. Logged with sessions.

// ── MOBILITY / YOGA — an integral training pillar ─────────────
// Not accessory afterthought. Given the left hamstring/glute rehab
// (physio), mobility is load-bearing for staying healthy enough to
// train. Three strands: soft-tissue (foam roll), pre-session drills
// (prime the body before erg/lift), and yoga flows (longer reset).
// MOBILITY_ROUTINES = the library (routines on hand). mobilityLog =
// the tracking (consistency as a visible pillar).
const MOBILITY_ROUTINES = [
  {
    id: 'foam',
    name: 'Foam Roll / Soft Tissue',
    icon: '🧻',
    color: '#00d4ff',
    when: 'Post-session or evening. Anytime tissue feels tight.',
    why: 'Manages tissue quality + tightness around the rowing posture (thoracic, lats, hips) and the rehab area. Down-regulates after hard sessions.',
    blocks: [
      {
        move: 'Thoracic spine — 60-90s',
        visual:
          'Lie on your back, roller across your mid-back (under the shoulder blades). Hands behind head, elbows in. Lift hips slightly and roll from mid-back up toward the shoulders — pause and breathe on tight spots. Can gently arch back over the roller at a sticky segment.',
      },
      {
        move: 'Lats — 45s/side',
        visual:
          'Lie on one side, arm overhead, roller in the armpit/upper-ribs area. Roll the line from armpit down toward the lower ribs. Rotate slightly front-to-back to find the lat. This is the reach/finish muscle in the stroke.',
      },
      {
        move: 'Glutes / piriformis — 60s/side',
        rehab: true,
        visual:
          'Sit on the roller (or a ball for more pressure). Cross one ankle over the opposite knee (figure-4), lean slightly toward the crossed side. Roll the meat of the glute slowly. Ball into the deepest spot and breathe. Key rehab tissue — give the left side time.',
      },
      {
        move: 'Hamstrings — 60s/side',
        rehab: true,
        visual:
          "Sit with the roller under one thigh, hands behind for support, leg straight. Roll from just under the sit-bone (origin) down toward the back of the knee. Turn the foot in/out to hit different parts. Extra time and care on the left — back off if it's sharp near the origin (rehab area).",
      },
      {
        move: 'Quads / IT band — 45-60s/side',
        visual:
          'Face-down (plank-ish) with the roller under the front of one thigh. Roll hip-to-knee. Rotate slightly to the outer thigh (ITB) — that side is often tender, keep pressure tolerable.',
      },
      {
        move: 'Calves — 45s/side',
        visual:
          'Seated, roller under one calf, other leg crossed over for extra load. Hands lift the hips. Roll ankle-to-knee, rotate the foot in/out to cover inner/outer calf.',
      },
    ],
    note: 'Slow. Breathe into tight spots. NOT a pain contest — discomfort ok, sharp pain no. Extra care + time on the left hamstring/glute.',
  },
  {
    id: 'prep',
    name: 'Pre-Session Mobility / Prime',
    icon: '🔑',
    color: '#34d399',
    when: "Before EVERY erg + every lift (the 'mobility first' in session notes).",
    why: 'Primes the body to move well before loading it. Cheap insurance — opens hips/t-spine/shoulders so the catch and the squat have range. Protects the rehab area by warming it before load.',
    blocks: [
      {
        move: 'Cat-cow — 8-10 slow reps',
        visual:
          'On hands and knees (hands under shoulders, knees under hips). Inhale: drop the belly, lift the chest and tailbone (cow). Exhale: round the spine up, tuck the chin and tailbone (cat). Move slowly, segment by segment, led by the breath.',
      },
      {
        move: 'Hip 90/90 transitions — 5/side',
        visual:
          'Sit on the floor, both legs bent at 90°: front shin across in front of you, back shin out to the side. Keeping chest tall, rotate both knees over to the other side so the legs swap front/back. Flow side to side. Opens internal/external hip rotation for the catch.',
      },
      {
        move: "World's greatest stretch — 4/side",
        visual:
          'From a lunge (right foot forward), left hand on the floor inside the front foot. Drive the right elbow down toward the floor near the right foot, then rotate and reach that same arm up to the ceiling, opening the chest. Return and repeat. Full-body opener — hip, t-spine, hamstring.',
      },
      {
        move: 'Leg swings, front-back + lateral — 10/side',
        rehab: true,
        visual:
          'Hold a wall/rack for balance. Swing one leg forward and back like a pendulum, relaxed, increasing range gradually — keep the torso still. Then swing the same leg side-to-side across the body. Dynamic hamstring/glute prep — controlled, never forced (rehab warm-up).',
      },
      {
        move: 'Thoracic open-books — 6/side',
        visual:
          'Lie on your side, knees bent and stacked, arms extended together in front at shoulder height. Keeping knees down, sweep the top arm up and over to the other side, opening the chest toward the ceiling, follow with your eyes. Return. Restores rotation lost to the rowing posture.',
      },
      {
        move: 'Band shoulder pass-throughs — 10',
        visual:
          "Hold a band (or stick) wide in both hands in front of you. Keeping arms straight, raise it overhead and back behind you as far as comfortable, then return — a big arc. Widen your grip if it's tight. Opens the shoulders for the catch and overhead.",
      },
      {
        move: 'Glute bridges — 12',
        rehab: true,
        visual:
          "Lie on your back, knees bent, feet flat hip-width. Push through the heels and lift the hips until knees-hips-shoulders form a line — squeeze the glutes hard at the top, don't arch the low back. Lower slowly. Fires the glutes before squat/erg (rehab activation — don't skip).",
      },
    ],
    note: "5-8min, dynamic not static (save long holds for post). The glute bridges + leg swings double as rehab activation — don't skip them.",
  },
  {
    id: 'yoga',
    name: 'Yoga Flow',
    icon: '🧘',
    color: '#a78bfa',
    when: 'Recovery slots (Thu AM), rest days, evenings. The longer reset.',
    why: 'Longer holds for genuine range + a parasympathetic down-shift (recovery, sleep, HRV). Counters the flexion-dominant rowing posture with extension + rotation.',
    blocks: [
      {
        move: 'Down dog → forward fold — 1-2min',
        visual:
          'From hands and knees, tuck toes and lift hips up and back into an inverted-V (down dog) — heels reaching toward the floor, spine long, pedal the feet. Then walk hands back to the feet and hang into a forward fold, knees soft, head heavy. Settles the whole posterior chain.',
      },
      {
        move: 'Low lunge + half-split — 1min/side',
        rehab: true,
        visual:
          'Step into a low lunge (right foot forward, left knee down), sink the hips forward to stretch the back hip flexor. Then shift the hips back, straightening the front leg with toes up, folding gently over it (half-split) for the hamstring. Gentle on the left — physio-comfortable range only (rehab).',
      },
      {
        move: 'Pigeon — 1-2min/side',
        rehab: true,
        visual:
          'From down dog or hands-and-knees, bring the right shin forward and across, angled under your torso, left leg extended straight back. Square the hips and fold forward over the front shin, breathing into the deep glute. Ease into the left side slowly — no sharp stretch (rehab area).',
      },
      {
        move: 'Thread-the-needle — 1min/side',
        visual:
          'On hands and knees, slide the right arm underneath the body and across to the left, shoulder and temple coming toward the floor, palm up. Rest there and breathe into the upper-back rotation. Return and switch. T-spine release.',
      },
      {
        move: 'Cobra / sphinx — 1min',
        visual:
          'Lie face-down. Sphinx: prop on the forearms, elbows under shoulders, gently lifting the chest with a long low back. Cobra: hands by the ribs, press the chest higher, shoulders down away from the ears. Spinal extension — the direct antidote to rowing flexion.',
      },
      {
        move: 'Supine twist — 1min/side',
        visual:
          'Lie on your back, hug both knees in, then let them drop to one side while you extend the opposite arm out and turn the head away. Keep both shoulders grounded. Breathe into the low-back and hip rotation. Switch sides.',
      },
      {
        move: 'Legs-up-wall + breath — 3-5min',
        visual:
          'Sit side-on to a wall, then swing the legs up it as you lie back, hips close to or a few inches from the wall, arms relaxed. Just breathe slowly — long exhales. The down-regulation finish: shifts you into recovery (parasympathetic) mode.',
      },
    ],
    note: 'Breath-led, never force. Pigeon + half-split touch the rehab area — back off to physio-comfortable range, no sharp stretch. Great on poor-sleep days (the down-shift helps).',
  },
];

const MOBILITY_STREAK_NOTE =
  "Consistency is the metric here, not intensity. The prep work especially — it's rehab activation disguised as a warm-up. Dropping it is the flag, not a quiet skip.";

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

const TECHNOGYM_CONVERSION = {
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

const ATHLETE_BACKGROUND = {
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

const RACE_TARGET = {
  name: 'World Rowing Virtual Indoor Champs',
  when: '~late Feb 2027 (provisional)',
  formats: '1-min · 1000m · 5000m',
  note: 'Virtual — raced from your own erg, ErgData auto-verifies. No roster/travel clash.',
};

// ── ORGANISATIONS TO FOLLOW ───────────────────────────────────
const ORGS = [
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
const EVENT_PATHWAY = [
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

const ANNUAL_ARC = [
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

// ── STRENGTH GUIDELINES ───────────────────────────────────────
// Concurrent training: heavy/low-rep compounds minimise interference
// effect (Wilson et al. 2012) while maximising force transfer to
// rowing drive & pedal stroke. Pump work isolated to low-cost muscles.

// ── LOG ENTRY COMPONENT ───────────────────────────────────────

// ── SHARED WORKOUT ITEM ───────────────────────────────────────
// ONE component for every workout display (calendar, microcycle,
// today-strip detail). Self-contained expand/collapse with note +
// fuel. Pass the day object (am/pm/note/fuel) + accent color + an

// ── CUSTOM CHART TOOLTIP ──────────────────────────────────────

// ── TRAINING LOAD DATA ────────────────────────────────────────
// TSS per day. Erg: (duration_sec/3600) × (avg_watts/FTP)² × 100
// Strength: time-based estimates (upper ~50, lower ~55, combined ~55)
// FTP estimated at 190W — update after threshold session.

// ── NUTRITION LOG ─────────────────────────────────────────────
// dayType: "two-a-day" | "training" | "rest"
// Targets from bottom-up expenditure model: BMR 1,887 (93.5kg, 187.5cm,
// M40s) + NEAT + TEF + training. Weekly maintenance ~3,140 kcal.
// Calibration phase: eat at maintenance ~2 weeks, then 0.3kg/week deficit.
// Protein 2g/kg = ~187g held constant. Carbs high. Fat moderate floor.

// ── LOG SESSION FORM — writes a strength session to Supabase ───
// Proof-of-concept write path. Strength only for now (erg pulls from
// Strava). On submit: insert into the `sessions` table, then call
// onSaved() so the parent re-fetches and the new entry appears.
// ── MAIN APP ──────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState('overview');
  const [activeLift, setActiveLift] = useState('Back Squat');
  const [expanded, setExpanded] = useState(null);
  const [ftp, setFtp] = useState(190);
  const [progTab, setProgTab] = useState('phases'); // phases | week | year
  const [nowTick, setNowTick] = useState(new Date()); // for date-awareness (day rollover)
  const [mobOpen, setMobOpen] = useState(null); // which mobility routine is expanded
  const [vw, setVw] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  ); // viewport width → responsive layout
  useEffect(() => {
    const t = setInterval(() => setNowTick(new Date()), 60000); // once a minute is plenty
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => setVw(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  // Responsive breakpoints: wider container on desktop, multi-column where it helps.
  const isWide = vw >= 900; // desktop — use the extra width
  const isMid = vw >= 600; // tablet
  const containerMax = isWide ? 1100 : 680;

  // ── DATABASE SESSIONS (Supabase) — MERGED with hardcoded history ─
  // Fetch sessions saved to the database on load. These MERGE with the
  // hardcoded `sessionLog` seed: db sessions first (newest), then the
  // baked-in history. The app never loses the seed history even if the
  // DB is empty or unreachable — it just shows the seed alone.
  const [dbSessions, setDbSessions] = useState([]);
  const [dbStatus, setDbStatus] = useState('loading'); // loading | ok | error
  const fetchSessions = () => {
    supabase
      .from('sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          setDbStatus('error');
          return;
        }
        const mapped = (data || [])
          .filter((r) => r.type !== 'Test')
          .map((r) => {
            const raw = (r.type || '').toLowerCase();
            return {
              date: r.date,
              type: normType(r.type, r.label),
              label: r.label,
              duration: r.duration,
              srpe: r.srpe,
              prs: r.prs,
              exercises: r.exercises || undefined,
              coachNote: r.coach_note || undefined,
              // status drives planned-vs-actual reconciliation. null legacy rows
              // are treated as actual (completed history) everywhere downstream.
              status: r.status || null,
              // flat erg metrics (the `splits` field was removed from the schema)
              distance_m: r.distance_m,
              avg_watts: r.avg_watts,
              avg_hr: r.avg_hr,
              // raw-type flags survive normType so the renderer can branch reliably
              _isErg: raw === 'erg',
              _isCycling: raw === 'cycling' || raw === 'bike' || raw === 'ride',
              _fromDb: true,
              _id: r.id,
            };
          });
        setDbSessions(mapped);
        setDbStatus('ok');
      });
  };
  useEffect(() => {
    fetchSessions();
  }, []);
  // The merged list every display + helper uses. DB sessions are newest,
  // so they go first; the hardcoded seed follows.
  const allSessions = [...dbSessions, ...sessionLog];

  // ── PLANNED vs LOGGED SPLIT (reconciliation) ──────────────────
  // Planned rows are forward-looking prescriptions and must NOT appear in the
  // completed Log, the calendar's done-state, recent sessions, or analytics.
  // null-status legacy rows count as actual/completed history.
  const loggedSessions = allSessions.filter((e) => e.status !== 'planned');
  const plannedSessions = allSessions.filter((e) => e.status === 'planned');
  // A planned row is reconciled ("done") once an actual exists for the same
  // date + type. v1 matches on normalized type + date (a planned_id link can
  // come later). Keyed off loggedSessions only.
  const loggedKeys = new Set(loggedSessions.map((e) => `${e.date}|${e.type}`));

  const loadData = calcTrainingLoad(DAILY_TSS);
  const latest = loadData[loadData.length - 1];
  const tsbColor =
    latest.tsb > 10
      ? '#34d399'
      : latest.tsb > -10
        ? '#ffd700'
        : latest.tsb > -30
          ? '#ff6b35'
          : '#ff2d55';

  const ergSessions = loggedSessions.filter((e) => e._isErg);
  const strengthSessions = loggedSessions.filter((e) => e.exercises);
  const latestErg = ergSessions[0]; // dbSessions are newest-first
  const totalErgDist = 55000; // metres, from logged sessions
  const latestSquat = strengthTrend['Back Squat'].slice(-1)[0];
  const totalSessions = loggedSessions.length;

  const liftColor = LIFT_COLOR[activeLift] || '#00d4ff';

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#08080d',
        color: '#e8e8f0',
        fontFamily: "'DM Mono','Courier New',monospace",
        paddingBottom: 60,
        overflowX: 'hidden',
        maxWidth: '100vw',
        boxSizing: 'border-box',
      }}
    >
      {/* HEADER */}
      <div
        style={{
          background: 'linear-gradient(180deg,#1e1e30 0%,#08080d 100%)',
          borderBottom: '1px solid #4a4a68',
          padding: '24px 14px 18px',
          boxSizing: 'border-box',
          width: '100%',
        }}
      >
        <div
          style={{
            maxWidth: containerMax,
            margin: '0 auto',
            boxSizing: 'border-box',
            width: '100%',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              gap: 8,
            }}
          >
            <div
              style={{
                fontSize: 9,
                letterSpacing: 3,
                color: '#00d4ff',
                marginBottom: 4,
                minWidth: 0,
              }}
            >
              ERG + STRENGTH · BASE
            </div>
            <div
              style={{
                fontSize: 8,
                letterSpacing: 1,
                color: '#6c6c88',
                flexShrink: 0,
              }}
            >
              v1.2 beta
            </div>
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: '#fff',
              letterSpacing: -1,
            }}
          >
            SPLITIQ
          </div>
        </div>
      </div>

      <div
        style={{
          maxWidth: containerMax,
          margin: '0 auto',
          padding: isWide ? '0 24px' : '0 14px',
          boxSizing: 'border-box',
          width: '100%',
        }}
      >
        {/* NAV */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 5,
            margin: '18px 0 16px',
          }}
        >
          {[
            ['overview', 'Overview'],
            ['calendar', 'Calendar'],
            ['program', 'Program'],
            ['plan', 'Plan'],
            ['live', 'Live'],
            ['erg', 'Erg'],
            ['strength', 'Strength'],
            ['logger', 'Logger'],
            ['mobility', 'Mobility'],
            ['recovery', 'Recovery'],
            ['log', 'Log'],
            ['journal', 'Journal'],
            ['coach', 'Coach'],
          ].map(([v, label]) => (
            <button
              key={v}
              onClick={() => {
                setView(v);
                setExpanded(null);
              }}
              style={{
                flex: '1 1 auto',
                minWidth: 0,
                background: view === v ? '#4a4a68' : 'transparent',
                border: view === v ? '1px solid #00d4ff' : '1px solid #4a4a68',
                color: view === v ? '#00d4ff' : '#7e7e9a',
                borderRadius: 6,
                padding: '8px 6px',
                fontSize: 9,
                letterSpacing: 0.5,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontFamily: "'DM Mono',monospace",
              }}
            >
              {label.toUpperCase()}
            </button>
          ))}
        </div>

        <ErrorBoundary>
          {/* ── STRENGTH LOGGER VIEW (live set/rep logging → sessions) ── */}
          {view === 'logger' && <StrengthLogger />}

          {/* ── LIVE ERG VIEW (Bluetooth PM5 → real-time metrics → session save) ── */}
          {view === 'live' && (
            <ErgLiveView
              plannedSessions={plannedSessions}
              onSessionSaved={() => {
                setView('log');
                fetchSessions();
              }}
            />
          )}

          {/* ── PLAN VIEW (today + future prescriptions from status='planned') ── */}
          {view === 'plan' &&
            (() => {
              // session dates are "M/D/YY" → Date for sorting/today-filtering
              const parsePlanDate = (k) => {
                const [m, d, y] = (k || '').split('/').map(Number);
                return new Date(2000 + (y || 0), (m || 1) - 1, d || 1);
              };
              const now = new Date();
              const today0 = new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate()
              );
              const items = plannedSessions
                .map((e) => ({
                  e,
                  dt: parsePlanDate(e.date),
                  done: loggedKeys.has(`${e.date}|${e.type}`),
                }))
                .filter((x) => x.dt >= today0)
                .sort((a, b) => a.dt - b.dt);
              return (
                <>
                  <div
                    style={{
                      background: '#2a2a48',
                      border: '1px solid #4a4a68',
                      borderLeft: '3px dashed #00d4ff',
                      borderRadius: 6,
                      padding: '11px 14px',
                      marginBottom: 14,
                      fontSize: 11,
                      color: '#aaaacc',
                      lineHeight: 1.6,
                    }}
                  >
                    <span style={{ color: '#00d4ff', fontWeight: 700 }}>
                      THE PLAN.{' '}
                    </span>
                    Upcoming prescriptions from Coach (today forward). A dashed
                    border marks a planned session; tap any card for the
                    targets. Cards mark ✓ done once you log the matching
                    session.
                  </div>
                  {items.length === 0 ? (
                    <div
                      style={{
                        background: '#2a2a48',
                        border: '1px solid #4a4a68',
                        borderRadius: 6,
                        padding: '18px 16px',
                        fontSize: 11,
                        color: '#7e7e9a',
                        textAlign: 'center',
                      }}
                    >
                      No upcoming planned sessions.
                    </div>
                  ) : (
                    <div
                      style={{
                        display: isWide ? 'grid' : 'flex',
                        gridTemplateColumns: isWide ? '1fr 1fr' : undefined,
                        flexDirection: 'column',
                        gap: 6,
                        alignItems: isWide ? 'start' : undefined,
                      }}
                    >
                      {items.map(({ e, done }, i) => (
                        <LogEntry
                          key={`plan-${e.date}-${e.label}-${i}`}
                          entry={e}
                          done={done}
                        />
                      ))}
                    </div>
                  )}
                </>
              );
            })()}

          {/* ── CALENDAR VIEW ── */}
          {view === 'calendar' &&
            (() => {
              const dayNames = [
                'Sun',
                'Mon',
                'Tue',
                'Wed',
                'Thu',
                'Fri',
                'Sat',
              ];
              const monthNames = [
                'Jan',
                'Feb',
                'Mar',
                'Apr',
                'May',
                'Jun',
                'Jul',
                'Aug',
                'Sep',
                'Oct',
                'Nov',
                'Dec',
              ];
              const now = new Date();
              const today0 = new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate()
              );
              // Window: 3 days back (to show recent completed work) → 14 forward.
              // Each day carries its own roster mode + completion status.
              const BACK = 3,
                FWD = 14;
              const days = [];
              let sawSwitch = false,
                firstMode = getRosterMode(today0);
              for (let i = -BACK; i < FWD; i++) {
                const d = new Date(today0);
                d.setDate(today0.getDate() + i);
                const dow = dayNames[d.getDay()];
                const mode = getRosterMode(d);
                if (i >= 0 && mode !== firstMode) sawSwitch = true;
                const sess = resolveDay(d); // override-aware
                const status = dayStatus(d, today0, loggedSessions); // done / today / upcoming / missed
                days.push({
                  date: d,
                  dow,
                  sess,
                  isToday: i === 0,
                  isPast: i < 0,
                  mode,
                  isOverride: !!(sess && sess.override),
                  status,
                });
              }
              const todayMode = firstMode;
              const todayCycle = MICROCYCLE[todayMode] || MICROCYCLE.home;
              return (
                <>
                  <div
                    style={{
                      background: '#2a2a48',
                      border: '1px solid #4a4a68',
                      borderLeft: '3px solid #00d4ff',
                      borderRadius: 6,
                      padding: '11px 14px',
                      marginBottom: 14,
                      fontSize: 11,
                      color: '#aaaacc',
                      lineHeight: 1.6,
                    }}
                  >
                    <span style={{ color: '#00d4ff', fontWeight: 700 }}>
                      YOUR WEEKS ·{' '}
                    </span>
                    {todayCycle.label.split('—')[0].trim()} ·{' '}
                    {PHASE_CONTEXT.phaseLabel}.{' '}
                    <span style={{ color: '#34d399' }}>✓ done</span> ·{' '}
                    <span style={{ color: '#00d4ff' }}>● today</span> ·
                    upcoming.
                    {sawSwitch ? ' Roster switches mid-view (home↔FIFO).' : ''}
                  </div>
                  <div
                    style={{
                      display: isWide ? 'grid' : 'flex',
                      gridTemplateColumns: isWide ? '1fr 1fr' : undefined,
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    {days.map((d, i) => {
                      const sessions = daySessions(d.sess);
                      const railObj = {
                        top: d.dow.toUpperCase(),
                        big: d.date.getDate(),
                        bottom: monthNames[d.date.getMonth()],
                      };
                      const st = d.status.state;
                      const statusColor =
                        st === 'done'
                          ? '#34d399'
                          : st === 'today'
                            ? '#00d4ff'
                            : st === 'missed'
                              ? '#7e7e9a'
                              : '#6c6c88';
                      const statusLabel =
                        st === 'done'
                          ? `✓ DONE${d.status.logged.length > 1 ? ' ×' + d.status.logged.length : ''}`
                          : st === 'today'
                            ? '● TODAY'
                            : st === 'missed'
                              ? '— not logged'
                              : 'UPCOMING';
                      return (
                        <div
                          key={i}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 3,
                            opacity:
                              st === 'missed'
                                ? 0.5
                                : st === 'done' && d.isPast
                                  ? 0.85
                                  : 1,
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              paddingLeft: 54,
                              marginBottom: 1,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 7,
                                color: statusColor,
                                letterSpacing: 2,
                                fontWeight: 700,
                              }}
                            >
                              {statusLabel}
                            </span>
                            {d.isOverride && (
                              <span
                                style={{
                                  fontSize: 7,
                                  color: '#ff6b35',
                                  letterSpacing: 2,
                                }}
                              >
                                ⇄ SWAPPED
                              </span>
                            )}
                          </div>
                          {sessions.length === 0 ? (
                            <WorkoutItem
                              session={null}
                              rail={railObj}
                              highlight={d.isToday}
                              showRail={true}
                            />
                          ) : (
                            sessions.map((s, j) => (
                              <WorkoutItem
                                key={j}
                                session={{ ...s, done: st === 'done' }}
                                rail={railObj}
                                highlight={d.isToday && j === 0}
                                showRail={j === 0}
                              />
                            ))
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Upcoming events from the ladder */}
                  <div
                    style={{
                      background: 'linear-gradient(135deg,#ffd70010,#1e1e30)',
                      border: '1px solid #ffd70030',
                      borderLeft: '3px solid #ffd700',
                      borderRadius: 6,
                      padding: '12px 14px',
                      marginTop: 14,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 9,
                        letterSpacing: 2,
                        color: '#ffd700',
                        marginBottom: 8,
                      }}
                    >
                      UPCOMING EVENTS · SEASON 1 LADDER
                    </div>
                    {EVENT_LADDER.slice(0, 5).map((e, i) => {
                      const col =
                        e.kind === 'TARGET'
                          ? '#ff2d55'
                          : e.kind === 'competition'
                            ? '#ff6b35'
                            : e.kind === 'optional'
                              ? '#a78bfa'
                              : '#00d4ff';
                      return (
                        <div
                          key={i}
                          style={{
                            display: 'flex',
                            gap: 10,
                            marginBottom: 6,
                            paddingBottom: 6,
                            borderBottom: i < 4 ? '1px solid #3e3e5a' : 'none',
                          }}
                        >
                          <div
                            style={{
                              width: 78,
                              flexShrink: 0,
                              fontSize: 9,
                              fontWeight: 700,
                              color: col,
                            }}
                          >
                            {e.date}
                          </div>
                          <div
                            style={{
                              flex: 1,
                              fontSize: 10,
                              color: '#aaaacc',
                              lineHeight: 1.4,
                            }}
                          >
                            {e.name}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()}

          {/* ── PROGRAM VIEW ── */}
          {view === 'program' && (
            <>
              {/* Sub-nav */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                {[
                  ['phases', 'Phases'],
                  ['week', '2-Wk Cycle'],
                  ['year', 'Annual'],
                ].map(([v, label]) => (
                  <button
                    key={v}
                    onClick={() => setProgTab(v)}
                    style={{
                      flex: 1,
                      background: progTab === v ? '#4a4a68' : 'transparent',
                      border:
                        progTab === v
                          ? '1px solid #00d4ff'
                          : '1px solid #4a4a68',
                      color: progTab === v ? '#00d4ff' : '#7e7e9a',
                      borderRadius: 6,
                      padding: '8px 4px',
                      fontSize: 9,
                      letterSpacing: 1,
                      cursor: 'pointer',
                      fontFamily: "'DM Mono',monospace",
                    }}
                  >
                    {label.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* ─── 2-WEEK MICROCYCLE ─── */}
              {progTab === 'week' && (
                <>
                  <div
                    style={{
                      background: '#1e1e30',
                      border: '1px solid #4a4a68',
                      borderLeft: '3px solid #f472b6',
                      borderRadius: 6,
                      padding: '12px 14px',
                      marginBottom: 14,
                      fontSize: 11,
                      color: '#aaaacc',
                      lineHeight: 1.6,
                    }}
                  >
                    <span style={{ color: '#f472b6', fontWeight: 700 }}>
                      ROSTER = PERIODIZATION:{' '}
                    </span>
                    Your 1-on/1-off FIFO roster is the load/recovery wave. Home
                    week loads, FIFO week auto-deloads. Erg is protected;
                    strength yields when scarce. This repeats as your base
                    microcycle all year.
                  </div>
                  {[MICROCYCLE.home, MICROCYCLE.fifo].map((wk) => (
                    <div key={wk.label} style={{ marginBottom: 16 }}>
                      <div
                        style={{
                          background: '#2a2a48',
                          border: `1px solid ${wk.color}30`,
                          borderLeft: `3px solid ${wk.color}`,
                          borderRadius: 6,
                          padding: '11px 14px',
                          marginBottom: 8,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: wk.color,
                          }}
                        >
                          {wk.label}
                        </div>
                        <div
                          style={{
                            fontSize: 10,
                            color: '#7e7e9a',
                            marginTop: 2,
                          }}
                        >
                          {wk.sub}
                        </div>
                        {wk.machineNote && (
                          <div
                            style={{
                              fontSize: 9,
                              color: '#a78bfa',
                              marginTop: 6,
                              lineHeight: 1.5,
                              borderTop: '1px solid #3e3e5a',
                              paddingTop: 6,
                            }}
                          >
                            🚣 {wk.machineNote}
                          </div>
                        )}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8,
                        }}
                      >
                        {wk.days.map((d) => {
                          const sessions = daySessions(d);
                          const railObj = { top: d.day.toUpperCase() };
                          return (
                            <div
                              key={d.day}
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 3,
                              }}
                            >
                              {sessions.length === 0 ? (
                                <WorkoutItem
                                  session={null}
                                  rail={railObj}
                                  showRail={true}
                                />
                              ) : (
                                sessions.map((s, j) => (
                                  <WorkoutItem
                                    key={j}
                                    session={s}
                                    rail={railObj}
                                    showRail={j === 0}
                                  />
                                ))
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  <div
                    style={{
                      background: '#1e1e30',
                      border: '1px solid #ffd70030',
                      borderLeft: '3px solid #ffd700',
                      borderRadius: 6,
                      padding: '11px 14px',
                      fontSize: 11,
                      color: '#888860',
                      lineHeight: 1.6,
                    }}
                  >
                    ⚠️ FIFO week is maintenance, not failure. Missing a session
                    on a 12-hour-shift day is the correct call. The home week is
                    where you build; the work swing is where you recover. Sleep
                    above all during the swing — it's already compressed by the
                    roster.
                  </div>
                  <div
                    style={{
                      background: '#1e1e30',
                      border: '1px solid #a78bfa30',
                      borderLeft: '3px solid #a78bfa',
                      borderRadius: 6,
                      padding: '11px 14px',
                      marginTop: 8,
                      fontSize: 11,
                      color: '#aaaacc',
                      lineHeight: 1.6,
                    }}
                  >
                    🔬{' '}
                    <span style={{ color: '#a78bfa', fontWeight: 700 }}>
                      Technogym ↔ Concept2 conversion (auto-building from
                      Strava):{' '}
                    </span>
                    {TECHNOGYM_CONVERSION.status}{' '}
                    <span style={{ color: '#888860' }}>
                      {TECHNOGYM_CONVERSION.method}
                    </span>{' '}
                    Once enough paired HR130 points land, this yields real watt
                    targets for the camp machine.{' '}
                    <span style={{ color: '#7e7e9a' }}>
                      {TECHNOGYM_CONVERSION.caveats}
                    </span>
                  </div>
                  <div
                    style={{
                      background: '#1e1e30',
                      border: '1px solid #00d4ff30',
                      borderLeft: '3px solid #00d4ff',
                      borderRadius: 6,
                      padding: '11px 14px',
                      marginTop: 8,
                      fontSize: 11,
                      color: '#aaaacc',
                      lineHeight: 1.6,
                    }}
                  >
                    📅{' '}
                    <span style={{ color: '#00d4ff', fontWeight: 700 }}>
                      Next two cycles — PUSH then RECOVER:{' '}
                    </span>
                    This home week is a genuine loading week — push volume while
                    fresh (the trained cyclist's engine can absorb it). Then
                    FIFO next week is the consolidation deload that banks the
                    gains. Push/recover built into the roster. Critical: push
                    THIS week, don't fight the FIFO deload next week —
                    adaptation happens during recovery. "Push" in base = more
                    volume, longer long row, progressed strength, the rate
                    ladder — NOT intensity (threshold/VO2 belong in Build 1,
                    Sept+). Governor: family stress is real load — if HRV drops
                    or sRPE climbs mid-week, ease off. Data leads.
                  </div>
                </>
              )}

              {/* ─── ANNUAL ARC ─── */}
              {progTab === 'year' && (
                <>
                  {/* Race target banner */}
                  <div
                    style={{
                      background: 'linear-gradient(135deg,#ff2d5520,#1e1e30)',
                      border: '1px solid #ff2d5550',
                      borderRadius: 6,
                      padding: '14px 16px',
                      marginBottom: 12,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 9,
                        letterSpacing: 3,
                        color: '#ff2d55',
                        marginBottom: 6,
                      }}
                    >
                      🎯 SEASON TARGET
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: '#fff',
                        marginBottom: 3,
                      }}
                    >
                      {RACE_TARGET.name}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: '#ff8fa8',
                        marginBottom: 6,
                      }}
                    >
                      {RACE_TARGET.when} · {RACE_TARGET.formats}
                    </div>
                    <div
                      style={{ fontSize: 10, color: '#888', lineHeight: 1.5 }}
                    >
                      {RACE_TARGET.note}
                    </div>
                  </div>
                  <div
                    style={{
                      background: '#1e1e30',
                      border: '1px solid #4a4a68',
                      borderLeft: '3px solid #00d4ff',
                      borderRadius: 6,
                      padding: '12px 14px',
                      marginBottom: 14,
                      fontSize: 11,
                      color: '#aaaacc',
                      lineHeight: 1.6,
                    }}
                  >
                    <span style={{ color: '#00d4ff', fontWeight: 700 }}>
                      ANNUAL ARC:{' '}
                    </span>
                    Periodised to peak for the Feb 2027 champs across all 3
                    formats. Base → threshold → power → sharpen. Plans firm up
                    at each block boundary; detail beyond the current block is
                    directional.
                  </div>
                  <div
                    style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
                  >
                    {ANNUAL_ARC.map((b, i) => (
                      <div
                        key={i}
                        style={{
                          background: b.current ? '#2a2a48' : '#1e1e30',
                          border: `1px solid ${b.current ? '#00d4ff40' : '#4a4a68'}`,
                          borderLeft: `3px solid ${b.current ? '#00d4ff' : b.test.includes('2k') ? '#ff2d55' : '#5a5a74'}`,
                          borderRadius: 6,
                          padding: '12px 14px',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'baseline',
                            marginBottom: 4,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: b.current ? '#00d4ff' : '#e8e8f0',
                            }}
                          >
                            {b.current && '▶ '}
                            {b.block}
                          </span>
                          <span style={{ fontSize: 9, color: '#7e7e9a' }}>
                            {b.months} · {b.weeks}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: 10,
                            color: '#aaaacc',
                            lineHeight: 1.5,
                            marginBottom: 5,
                          }}
                        >
                          {b.focus}
                        </div>
                        <div
                          style={{
                            fontSize: 9,
                            color: b.test.includes('2k')
                              ? '#ff2d55'
                              : '#7e7e9a',
                            lineHeight: 1.4,
                          }}
                        >
                          ⏱️ {b.test}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div
                    style={{
                      marginTop: 12,
                      fontSize: 9,
                      color: '#6c6c88',
                      lineHeight: 1.5,
                      fontStyle: 'italic',
                    }}
                  >
                    Masters note: the 1:1 roster work-to-recovery ratio suits
                    reduced recovery capacity well and prevents the chronic
                    fatigue that derails year-long plans. Confirm the 2027
                    champs date when World Rowing announces it, then we lock the
                    taper. Re-evaluate the arc at each block boundary.
                  </div>

                  {/* Season banner */}
                  <div
                    style={{
                      background: 'linear-gradient(135deg,#ff2d5518,#1e1e30)',
                      border: '1px solid #ff2d5540',
                      borderRadius: 6,
                      padding: '14px 16px',
                      marginTop: 14,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        marginBottom: 6,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: '#ff2d55',
                          letterSpacing: 1,
                        }}
                      >
                        🏆 {SEASON.label}
                      </div>
                      <div style={{ fontSize: 9, color: '#888' }}>
                        {SEASON.span}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: '#aaaacc',
                        lineHeight: 1.6,
                        marginBottom: 8,
                      }}
                    >
                      {SEASON.goal}
                    </div>
                    <div
                      style={{
                        fontSize: 9,
                        color: '#888860',
                        lineHeight: 1.5,
                        marginBottom: 6,
                      }}
                    >
                      {SEASON.arc}
                    </div>
                    <div
                      style={{
                        fontSize: 9,
                        color: '#666',
                        lineHeight: 1.5,
                        fontStyle: 'italic',
                        borderTop: '1px solid #3e3e5a',
                        paddingTop: 7,
                      }}
                    >
                      {SEASON.principle} → {SEASON.next}
                    </div>
                  </div>

                  {/* Event ladder */}
                  <div
                    style={{
                      background: 'linear-gradient(135deg,#ffd70012,#1e1e30)',
                      border: '1px solid #ffd70040',
                      borderLeft: '3px solid #ffd700',
                      borderRadius: 6,
                      padding: '14px 16px',
                      marginTop: 14,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 9,
                        letterSpacing: 3,
                        color: '#ffd700',
                        marginBottom: 8,
                      }}
                    >
                      SEASON 1 · EVENT LADDER → WORLDS FINALE
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: '#aaaacc',
                        lineHeight: 1.5,
                        marginBottom: 10,
                      }}
                    >
                      Each event serves the Feb-27 target. Benchmarks = pure
                      data, no peak. Competitions = stepping stones. Only Worlds
                      is a true peak.
                    </div>
                    {EVENT_LADDER.map((e, i) => {
                      const col =
                        e.kind === 'TARGET'
                          ? '#ff2d55'
                          : e.kind === 'competition'
                            ? '#ff6b35'
                            : e.kind === 'optional'
                              ? '#a78bfa'
                              : '#00d4ff';
                      const tag =
                        e.kind === 'TARGET'
                          ? '🎯 TARGET'
                          : e.kind === 'competition'
                            ? 'COMP'
                            : e.kind === 'optional'
                              ? 'OPTIONAL'
                              : 'TEST';
                      return (
                        <div
                          key={i}
                          style={{
                            display: 'flex',
                            gap: 10,
                            marginBottom: 8,
                            paddingBottom: 8,
                            borderBottom:
                              i < EVENT_LADDER.length - 1
                                ? '1px solid #3e3e5a'
                                : 'none',
                          }}
                        >
                          <div style={{ width: 88, flexShrink: 0 }}>
                            <div
                              style={{
                                fontSize: 9,
                                fontWeight: 700,
                                color: '#e8e8f0',
                              }}
                            >
                              {e.date}
                            </div>
                            <div
                              style={{
                                fontSize: 7,
                                color: col,
                                letterSpacing: 1,
                                marginTop: 1,
                              }}
                            >
                              {tag} · {e.phase}
                            </div>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: col,
                                marginBottom: 2,
                              }}
                            >
                              {e.name}
                            </div>
                            <div
                              style={{
                                fontSize: 9,
                                color: '#888',
                                lineHeight: 1.5,
                              }}
                            >
                              {e.serves}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div
                      style={{
                        fontSize: 8,
                        color: '#7e7e9a',
                        lineHeight: 1.5,
                        marginTop: 4,
                        fontStyle: 'italic',
                      }}
                    >
                      Benchmarks every ~6-8wk track progress + inform the next
                      phase. Each event feeds the next: CP→pacing, 5k→base
                      built, Sep→power, Nov→edge, Jan 2k→fitness, tune-ups→race
                      pace, Worlds, March→season close. Confirm external event
                      dates when calendars publish.
                    </div>
                  </div>

                  {/* Volume progression — serious-competitor arc */}
                  <div
                    style={{
                      background: 'linear-gradient(135deg,#34d39915,#1e1e30)',
                      border: '1px solid #34d39940',
                      borderLeft: '3px solid #34d399',
                      borderRadius: 6,
                      padding: '14px 16px',
                      marginTop: 14,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 9,
                        letterSpacing: 3,
                        color: '#34d399',
                        marginBottom: 6,
                      }}
                    >
                      VOLUME PROGRESSION · THE SERIOUS-COMPETITOR ARC
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: '#e8e8f0',
                        fontWeight: 700,
                        lineHeight: 1.5,
                        marginBottom: 8,
                      }}
                    >
                      {VOLUME_PROGRESSION.ambition}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: '#aaaacc',
                        lineHeight: 1.5,
                        marginBottom: 10,
                      }}
                    >
                      <span style={{ color: '#34d399' }}>Principle: </span>
                      {VOLUME_PROGRESSION.principle}
                    </div>

                    {VOLUME_PROGRESSION.trajectory.map((t, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          gap: 10,
                          alignItems: 'baseline',
                          marginBottom: 6,
                          paddingBottom: 6,
                          borderBottom: i < 3 ? '1px solid #3e3e5a' : 'none',
                        }}
                      >
                        <div style={{ width: 96, flexShrink: 0 }}>
                          <div
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              color: '#e8e8f0',
                            }}
                          >
                            {t.phase}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: '#34d399',
                            }}
                          >
                            {t.target}
                          </div>
                        </div>
                        <div
                          style={{
                            fontSize: 9,
                            color: '#888',
                            lineHeight: 1.5,
                          }}
                        >
                          {t.note}
                        </div>
                      </div>
                    ))}

                    <div
                      style={{
                        fontSize: 10,
                        color: '#ffd700',
                        lineHeight: 1.6,
                        marginTop: 8,
                        background: '#08080d',
                        borderRadius: 4,
                        padding: '9px 11px',
                      }}
                    >
                      🔑 <span style={{ fontWeight: 700 }}>The unlock: </span>
                      {VOLUME_PROGRESSION.unlock}
                    </div>
                    <div
                      style={{
                        fontSize: 9,
                        color: '#7e7e9a',
                        lineHeight: 1.5,
                        marginTop: 8,
                        fontStyle: 'italic',
                      }}
                    >
                      ⚠️ {VOLUME_PROGRESSION.caveat}
                    </div>
                    <div
                      style={{
                        fontSize: 9,
                        color: '#6c6c88',
                        lineHeight: 1.5,
                        marginTop: 6,
                      }}
                    >
                      Now: {VOLUME_PROGRESSION.current}
                    </div>
                  </div>

                  {/* Season 2 sketch */}
                  <div
                    style={{
                      background: 'linear-gradient(135deg,#a78bfa15,#1e1e30)',
                      border: '1px solid #a78bfa40',
                      borderLeft: '3px solid #a78bfa',
                      borderRadius: 6,
                      padding: '14px 16px',
                      marginTop: 14,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        marginBottom: 6,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: '#a78bfa',
                          letterSpacing: 1,
                        }}
                      >
                        🏆 {SEASON_2.label}{' '}
                        <span style={{ fontSize: 8, color: '#666' }}>
                          (sketch)
                        </span>
                      </div>
                      <div style={{ fontSize: 9, color: '#888' }}>
                        {SEASON_2.span}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: '#aaaacc',
                        lineHeight: 1.6,
                        marginBottom: 8,
                      }}
                    >
                      {SEASON_2.theme}
                    </div>
                    <div
                      style={{
                        fontSize: 9,
                        color: '#ffd700',
                        lineHeight: 1.6,
                        marginBottom: 10,
                        background: '#08080d',
                        borderRadius: 4,
                        padding: '9px 11px',
                      }}
                    >
                      ⚡ {SEASON_2.fork}
                    </div>

                    {SEASON_2.phases.map((p, i) => {
                      const col =
                        p.kind === 'TARGET'
                          ? '#ff2d55'
                          : p.kind === 'aspirational'
                            ? '#a78bfa'
                            : p.kind === 'competition'
                              ? '#ff6b35'
                              : p.kind === 'recover'
                                ? '#3a3a4a'
                                : p.kind === 'optional'
                                  ? '#34d399'
                                  : '#00d4ff';
                      return (
                        <div
                          key={i}
                          style={{
                            display: 'flex',
                            gap: 10,
                            marginBottom: 7,
                            paddingBottom: 7,
                            borderBottom:
                              i < SEASON_2.phases.length - 1
                                ? '1px solid #3e3e5a'
                                : 'none',
                          }}
                        >
                          <div
                            style={{
                              width: 92,
                              flexShrink: 0,
                              fontSize: 9,
                              fontWeight: 700,
                              color: col,
                            }}
                          >
                            {p.phase}
                          </div>
                          <div
                            style={{
                              flex: 1,
                              fontSize: 9,
                              color: '#aaaacc',
                              lineHeight: 1.5,
                            }}
                          >
                            {p.events}
                          </div>
                        </div>
                      );
                    })}

                    <div
                      style={{
                        fontSize: 9,
                        letterSpacing: 2,
                        color: '#a78bfa',
                        marginTop: 10,
                        marginBottom: 8,
                      }}
                    >
                      🌟 ASPIRATIONAL TARGETS · INVESTIGATE + CHASE
                    </div>
                    {SEASON_2.aspirational.map((a, i) => (
                      <div
                        key={i}
                        style={{
                          background: '#08080d',
                          borderLeft: '2px solid #a78bfa',
                          borderRadius: 4,
                          padding: '9px 11px',
                          marginBottom: 6,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: '#e8e8f0',
                            marginBottom: 2,
                          }}
                        >
                          {a.name}
                        </div>
                        <div
                          style={{
                            fontSize: 9,
                            color: '#888',
                            lineHeight: 1.5,
                            marginBottom: 3,
                          }}
                        >
                          {a.what}
                        </div>
                        <div
                          style={{
                            fontSize: 9,
                            color: '#a78bfa',
                            lineHeight: 1.5,
                          }}
                        >
                          → {a.chase}
                        </div>
                      </div>
                    ))}
                    <div
                      style={{
                        fontSize: 8,
                        color: '#7e7e9a',
                        lineHeight: 1.5,
                        marginTop: 6,
                        fontStyle: 'italic',
                      }}
                    >
                      Sketch — recurring events reliable, aspirational dates
                      UNCONFIRMED. Confirm specifics when 2027-28 calendars
                      publish. The in-person fork is the key S2 decision.
                    </div>
                  </div>

                  {/* Athlete background */}
                  <div
                    style={{
                      background: '#2a2a48',
                      border: '1px solid #f472b630',
                      borderLeft: '3px solid #f472b6',
                      borderRadius: 6,
                      padding: '14px 16px',
                      marginTop: 14,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 9,
                        letterSpacing: 3,
                        color: '#f472b6',
                        marginBottom: 6,
                      }}
                    >
                      ATHLETE BACKGROUND · ENGINE HISTORY
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: '#e8e8f0',
                        fontWeight: 700,
                        lineHeight: 1.5,
                        marginBottom: 10,
                      }}
                    >
                      {ATHLETE_BACKGROUND.headline}
                    </div>

                    <div
                      style={{
                        fontSize: 8,
                        letterSpacing: 2,
                        color: '#00d4ff',
                        marginBottom: 5,
                      }}
                    >
                      🚴 CYCLING (TO JAN 2026)
                    </div>
                    {ATHLETE_BACKGROUND.cycling.map((c, i) => (
                      <div
                        key={i}
                        style={{
                          fontSize: 10,
                          color: '#aaaacc',
                          lineHeight: 1.5,
                          marginBottom: 3,
                          paddingLeft: 4,
                        }}
                      >
                        · {c}
                      </div>
                    ))}

                    <div
                      style={{
                        fontSize: 8,
                        letterSpacing: 2,
                        color: '#34d399',
                        margin: '10px 0 5px',
                      }}
                    >
                      🏋 STRENGTH AGE
                    </div>
                    {ATHLETE_BACKGROUND.strength.map((s, i) => (
                      <div
                        key={i}
                        style={{
                          fontSize: 10,
                          color: '#aaaacc',
                          lineHeight: 1.5,
                          marginBottom: 3,
                          paddingLeft: 4,
                        }}
                      >
                        · {s}
                      </div>
                    ))}

                    <div
                      style={{
                        fontSize: 8,
                        letterSpacing: 2,
                        color: '#ffd700',
                        margin: '10px 0 5px',
                      }}
                    >
                      ⚡ WHAT IT MEANS FOR THE MODEL
                    </div>
                    {ATHLETE_BACKGROUND.implications.map((m, i) => (
                      <div
                        key={i}
                        style={{
                          fontSize: 10,
                          color: '#aaaacc',
                          lineHeight: 1.5,
                          marginBottom: 3,
                          paddingLeft: 4,
                        }}
                      >
                        · {m}
                      </div>
                    ))}
                  </div>

                  {/* Event progression pathway */}
                  <div
                    style={{
                      fontSize: 9,
                      letterSpacing: 3,
                      color: '#00d4ff',
                      margin: '20px 0 8px',
                    }}
                  >
                    EVENT PATHWAY · HOME ERG → INTERNATIONAL
                  </div>
                  <div
                    style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
                  >
                    {EVENT_PATHWAY.map((e) => (
                      <div
                        key={e.step}
                        style={{
                          background: '#2a2a48',
                          border: '1px solid #4a4a68',
                          borderRadius: 6,
                          padding: '11px 14px',
                          display: 'flex',
                          gap: 12,
                        }}
                      >
                        <div
                          style={{
                            flexShrink: 0,
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            background: '#4a4a68',
                            color: '#00d4ff',
                            fontSize: 11,
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {e.step}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'baseline',
                              marginBottom: 2,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 700,
                                color: '#e8e8f0',
                              }}
                            >
                              {e.event}
                            </span>
                            <span
                              style={{
                                fontSize: 8,
                                color:
                                  e.type === 'Virtual'
                                    ? '#00d4ff'
                                    : e.type === 'International'
                                      ? '#ff2d55'
                                      : '#34d399',
                                letterSpacing: 1,
                              }}
                            >
                              {e.type.toUpperCase()}
                            </span>
                          </div>
                          <div
                            style={{
                              fontSize: 9,
                              color: '#7e7e9a',
                              marginBottom: 3,
                            }}
                          >
                            {e.when}
                          </div>
                          <div
                            style={{
                              fontSize: 10,
                              color: '#aaaacc',
                              lineHeight: 1.4,
                            }}
                          >
                            {e.why}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Organisations */}
                  <div
                    style={{
                      fontSize: 9,
                      letterSpacing: 3,
                      color: '#ffd700',
                      margin: '20px 0 8px',
                    }}
                  >
                    ORGANISATIONS TO FOLLOW
                  </div>
                  <div
                    style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
                  >
                    {ORGS.map((o) => (
                      <div
                        key={o.name}
                        style={{
                          background: '#2a2a48',
                          border: '1px solid #4a4a68',
                          borderLeft: `3px solid ${o.color}`,
                          borderRadius: 6,
                          padding: '11px 14px',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'baseline',
                            marginBottom: 3,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: '#fff',
                            }}
                          >
                            {o.name}
                          </span>
                          <span
                            style={{
                              fontSize: 8,
                              color: o.color,
                              letterSpacing: 1,
                            }}
                          >
                            {o.tier}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: 9,
                            color: '#00d4ff',
                            marginBottom: 4,
                          }}
                        >
                          {o.site}
                        </div>
                        <div
                          style={{
                            fontSize: 10,
                            color: '#aaaacc',
                            lineHeight: 1.4,
                          }}
                        >
                          {o.note}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Monitoring note */}
                  <div
                    style={{
                      marginTop: 12,
                      background: '#1e1e30',
                      border: '1px solid #ffd70030',
                      borderLeft: '3px solid #ffd700',
                      borderRadius: 6,
                      padding: '11px 14px',
                      fontSize: 10,
                      color: '#888860',
                      lineHeight: 1.6,
                    }}
                  >
                    📅 Event suggestions: I'll check for current/upcoming events
                    when we talk — flag it at Sunday reviews and I'll search for
                    dated targets. Known on-water in WA: Australian Masters
                    Rowing Champs were at Champion Lakes, Perth (May). Indoor WA
                    state dates publish closer to the winter season — we'll
                    catch them as they're announced.
                  </div>
                </>
              )}

              {/* ─── PHASES (existing detail) ─── */}
              {progTab === 'phases' && (
                <>
                  {/* Phase selector */}
                  <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                    {PHASES.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setExpanded(p.id)}
                        style={{
                          flex: 1,
                          background:
                            expanded === p.id ? '#4a4a68' : 'transparent',
                          border:
                            expanded === p.id
                              ? `1px solid ${p.current ? '#00d4ff' : '#5a5a74'}`
                              : '1px solid #4a4a68',
                          color:
                            expanded === p.id
                              ? p.current
                                ? '#00d4ff'
                                : '#aaaacc'
                              : '#6c6c88',
                          borderRadius: 6,
                          padding: '9px 6px',
                          cursor: 'pointer',
                          textAlign: 'center',
                          fontFamily: "'DM Mono',monospace",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 8,
                            letterSpacing: 2,
                            marginBottom: 2,
                            color: p.current ? '#00d4ff' : '#6c6c88',
                          }}
                        >
                          {p.status}
                        </div>
                        <div style={{ fontSize: 9 }}>
                          {p.name.split('—')[1].trim()}
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Phase detail */}
                  {PHASES.map(
                    (phase) =>
                      expanded === phase.id && (
                        <div key={phase.id}>
                          {/* Phase header */}
                          <div
                            style={{
                              background: '#2a2a48',
                              border: `1px solid ${phase.current ? '#00d4ff30' : '#4a4a68'}`,
                              borderLeft: `3px solid ${phase.current ? '#00d4ff' : '#5a5a74'}`,
                              borderRadius: 6,
                              padding: '13px 16px',
                              marginBottom: 10,
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'baseline',
                                marginBottom: 6,
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 13,
                                  fontWeight: 700,
                                  color: '#fff',
                                }}
                              >
                                {phase.name}
                              </div>
                              <div
                                style={{
                                  fontSize: 9,
                                  color: '#7e7e9a',
                                  letterSpacing: 2,
                                }}
                              >
                                {phase.duration}
                              </div>
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                color: '#aaaacc',
                                lineHeight: 1.7,
                                marginBottom: 8,
                              }}
                            >
                              {phase.principle}
                            </div>
                            <div
                              style={{
                                fontSize: 10,
                                color: '#555568',
                                lineHeight: 1.6,
                                borderTop: '1px solid #4a4a68',
                                paddingTop: 8,
                              }}
                            >
                              📚 {phase.science}
                            </div>
                            {phase.test && (
                              <div
                                style={{
                                  fontSize: 10,
                                  color:
                                    phase.id === 'peak' ? '#ff2d55' : '#00d4ff',
                                  lineHeight: 1.6,
                                  borderTop: '1px solid #4a4a68',
                                  paddingTop: 8,
                                  marginTop: 8,
                                }}
                              >
                                ⏱️{' '}
                                <span style={{ fontWeight: 700 }}>TEST: </span>
                                {phase.test}
                              </div>
                            )}
                          </div>

                          {/* Weekly template */}
                          <div
                            style={{
                              fontSize: 9,
                              letterSpacing: 3,
                              color: '#7e7e9a',
                              marginBottom: 8,
                            }}
                          >
                            WEEKLY TEMPLATE
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 6,
                              marginBottom: 14,
                            }}
                          >
                            {phase.weekly.map((s, i) => {
                              const color = C[s.type] || '#888';
                              const isRest = s.type === 'Rest';
                              return (
                                <div
                                  key={i}
                                  onClick={() =>
                                    setExpanded(
                                      expanded === `${phase.id}-${i}`
                                        ? phase.id
                                        : `${phase.id}-${i}`
                                    )
                                  }
                                  style={{
                                    background:
                                      expanded === `${phase.id}-${i}`
                                        ? `${color}12`
                                        : '#2a2a48',
                                    border: `1px solid ${expanded === `${phase.id}-${i}` ? color + '50' : '#4a4a68'}`,
                                    borderLeft: `3px solid ${color}`,
                                    borderRadius: 6,
                                    padding: '11px 14px',
                                    cursor: isRest ? 'default' : 'pointer',
                                    opacity: isRest ? 0.45 : 1,
                                  }}
                                >
                                  <div
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 12,
                                      }}
                                    >
                                      <div
                                        style={{
                                          width: 28,
                                          fontSize: 9,
                                          fontWeight: 700,
                                          color,
                                          letterSpacing: 1,
                                        }}
                                      >
                                        {s.day}
                                      </div>
                                      <div style={{ fontSize: 14 }}>
                                        {ICON[s.type] || '•'}
                                      </div>
                                      <div>
                                        <div
                                          style={{
                                            fontSize: 12,
                                            fontWeight: 700,
                                            color: '#fff',
                                          }}
                                        >
                                          {s.label}
                                        </div>
                                        <div
                                          style={{
                                            fontSize: 10,
                                            color: '#7e7e9a',
                                          }}
                                        >
                                          {s.detail}
                                        </div>
                                      </div>
                                    </div>
                                    {s.hr !== '—' && (
                                      <div
                                        style={{
                                          textAlign: 'right',
                                          flexShrink: 0,
                                        }}
                                      >
                                        <div
                                          style={{
                                            fontSize: 11,
                                            color,
                                            fontWeight: 600,
                                          }}
                                        >
                                          {s.hr}
                                        </div>
                                        <div
                                          style={{
                                            fontSize: 9,
                                            color: '#6c6c88',
                                          }}
                                        >
                                          {s.zone}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  {expanded === `${phase.id}-${i}` &&
                                    !isRest && (
                                      <div
                                        style={{
                                          marginTop: 10,
                                          background: '#08080d',
                                          borderRadius: 4,
                                          padding: '9px 11px',
                                          fontSize: 11,
                                          color: '#aaaacc',
                                          lineHeight: 1.7,
                                        }}
                                      >
                                        📋 {s.notes}
                                      </div>
                                    )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )
                  )}

                  {/* Default state — no phase selected */}
                  {!PHASES.some((p) => expanded === p.id) && (
                    <div
                      style={{
                        textAlign: 'center',
                        padding: '30px 0',
                        color: '#5a5a74',
                        fontSize: 12,
                      }}
                    >
                      Select a phase above to view the weekly template
                    </div>
                  )}

                  {/* ErgZone-compliant Build-1 sessions (queued) */}
                  <div
                    style={{
                      background: '#2a2a48',
                      border: '1px solid #00d4ff30',
                      borderLeft: '3px solid #00d4ff',
                      borderRadius: 6,
                      padding: '14px 16px',
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        marginBottom: 6,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 9,
                          letterSpacing: 3,
                          color: '#00d4ff',
                        }}
                      >
                        ERGZONE SESSIONS · QUEUED FOR BUILD 1
                      </div>
                      <div style={{ fontSize: 8, color: '#6c6c88' }}>Sept+</div>
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: '#aaaacc',
                        lineHeight: 1.5,
                        marginBottom: 4,
                      }}
                    >
                      {ERGZONE_FORMAT.note}
                    </div>
                    <div
                      style={{
                        fontSize: 9,
                        color: '#888860',
                        lineHeight: 1.5,
                        marginBottom: 10,
                      }}
                    >
                      🔓 {ERGZONE_FORMAT.unlock}
                    </div>
                    {BUILD1_SESSIONS.map((s, i) => (
                      <div
                        key={i}
                        style={{
                          background: '#08080d',
                          borderLeft: `2px solid ${s.color}`,
                          borderRadius: 4,
                          padding: '10px 12px',
                          marginBottom: 6,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'baseline',
                            marginBottom: 3,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: '#e8e8f0',
                            }}
                          >
                            {s.name}
                          </span>
                          <span
                            style={{
                              fontSize: 8,
                              color: s.color,
                              letterSpacing: 1,
                            }}
                          >
                            {s.serves}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: 9,
                            color: '#888',
                            lineHeight: 1.5,
                            marginBottom: 6,
                          }}
                        >
                          {s.purpose}
                        </div>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'auto 1fr',
                            gap: '2px 8px',
                            fontSize: 9,
                          }}
                        >
                          <span style={{ color: '#7e7e9a' }}>Type</span>
                          <span style={{ color: '#aaaacc' }}>{s.type}</span>
                          <span style={{ color: '#7e7e9a' }}>Work</span>
                          <span style={{ color: '#e8e8f0', fontWeight: 600 }}>
                            {s.work}
                          </span>
                          <span style={{ color: '#7e7e9a' }}>Rest</span>
                          <span style={{ color: '#aaaacc' }}>{s.rest}</span>
                          <span style={{ color: '#7e7e9a' }}>Target</span>
                          <span style={{ color: s.color }}>{s.target}</span>
                          <span style={{ color: '#7e7e9a' }}>Rate</span>
                          <span style={{ color: '#aaaacc' }}>{s.rate}</span>
                          <span style={{ color: '#7e7e9a' }}>Warmup</span>
                          <span style={{ color: '#aaaacc' }}>{s.warmup}</span>
                        </div>
                      </div>
                    ))}
                    <div
                      style={{
                        fontSize: 8,
                        color: '#6c6c88',
                        lineHeight: 1.5,
                        marginTop: 4,
                        fontStyle: 'italic',
                      }}
                    >
                      {ERGZONE_FORMAT.status}
                    </div>
                  </div>

                  {/* Intensity model evolution — Rojabo */}
                  <div
                    style={{
                      background: '#2a2a48',
                      border: '1px solid #ff6b3530',
                      borderLeft: '3px solid #ff6b35',
                      borderRadius: 6,
                      padding: '14px 16px',
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 9,
                        letterSpacing: 3,
                        color: '#ff6b35',
                        marginBottom: 8,
                      }}
                    >
                      INTENSITY MODEL · EVOLVES BY PHASE
                    </div>
                    <div
                      style={{
                        background: '#08080d',
                        borderRadius: 4,
                        padding: '9px 11px',
                        marginBottom: 6,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          color: '#00d4ff',
                          marginBottom: 2,
                        }}
                      >
                        BASE (NOW) · HR-GOVERNED
                      </div>
                      <div
                        style={{
                          fontSize: 9,
                          color: '#aaaacc',
                          lineHeight: 1.5,
                        }}
                      >
                        {INTENSITY_EVOLUTION.base}
                      </div>
                    </div>
                    <div
                      style={{
                        background: '#08080d',
                        borderRadius: 4,
                        padding: '9px 11px',
                        marginBottom: 6,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          color: '#ff6b35',
                          marginBottom: 2,
                        }}
                      >
                        BUILD / RACE · STROKE-RATE / WATTS-FIXED
                      </div>
                      <div
                        style={{
                          fontSize: 9,
                          color: '#aaaacc',
                          lineHeight: 1.5,
                        }}
                      >
                        {INTENSITY_EVOLUTION.buildRace}
                      </div>
                    </div>
                    <div
                      style={{
                        background: '#08080d',
                        borderRadius: 4,
                        padding: '9px 11px',
                        marginBottom: 6,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          color: '#ffd700',
                          marginBottom: 2,
                        }}
                      >
                        🎯 POWER GUIDE · POST-CP-TEST
                      </div>
                      <div
                        style={{
                          fontSize: 9,
                          color: '#aaaacc',
                          lineHeight: 1.5,
                        }}
                      >
                        {INTENSITY_EVOLUTION.powerGuide}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 8,
                        color: '#7e7e9a',
                        lineHeight: 1.5,
                        fontStyle: 'italic',
                      }}
                    >
                      Rojabo (Danish National Team method).{' '}
                      {INTENSITY_EVOLUTION.why}
                    </div>
                  </div>

                  {/* Optional volume extras */}
                  <div
                    style={{
                      background: '#2a2a48',
                      border: '1px solid #34d39930',
                      borderLeft: '3px solid #34d399',
                      borderRadius: 6,
                      padding: '14px 16px',
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 9,
                        letterSpacing: 3,
                        color: '#34d399',
                        marginBottom: 6,
                      }}
                    >
                      OPTIONAL VOLUME EXTRAS · AFTERNOON ADD-ONS
                    </div>
                    <div
                      style={{
                        fontSize: 9,
                        color: '#888860',
                        lineHeight: 1.5,
                        marginBottom: 10,
                      }}
                    >
                      ⚠️ {VOLUME_EXTRAS.rules}
                    </div>
                    {VOLUME_EXTRAS.templates.map((t, i) => (
                      <div
                        key={i}
                        style={{
                          background: '#08080d',
                          borderLeft: `2px solid ${t.color}`,
                          borderRadius: 4,
                          padding: '10px 12px',
                          marginBottom: 6,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'baseline',
                            marginBottom: 4,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: t.color,
                            }}
                          >
                            {t.name}
                          </span>
                          <span
                            style={{
                              fontSize: 8,
                              color: '#7e7e9a',
                              letterSpacing: 1,
                            }}
                          >
                            {t.focus}
                          </span>
                        </div>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'auto 1fr',
                            gap: '2px 8px',
                            fontSize: 9,
                            marginBottom: 5,
                          }}
                        >
                          <span style={{ color: '#7e7e9a' }}>Build</span>
                          <span style={{ color: '#aaaacc' }}>
                            {t.type} · {t.work}
                          </span>
                          <span style={{ color: '#7e7e9a' }}>Target</span>
                          <span style={{ color: t.color }}>{t.target}</span>
                          <span style={{ color: '#7e7e9a' }}>Rate</span>
                          <span style={{ color: '#aaaacc' }}>{t.rate}</span>
                          <span style={{ color: '#7e7e9a' }}>Warmup</span>
                          <span style={{ color: '#aaaacc' }}>{t.warmup}</span>
                        </div>
                        <div
                          style={{
                            fontSize: 9,
                            color: '#888',
                            lineHeight: 1.5,
                            borderTop: '1px solid #3e3e5a',
                            paddingTop: 5,
                          }}
                        >
                          🎯 {t.cues}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* HR Zones */}
                  <div
                    style={{
                      background: '#2a2a48',
                      border: '1px solid #4a4a68',
                      borderRadius: 6,
                      padding: '14px 16px',
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        marginBottom: 10,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 9,
                          letterSpacing: 3,
                          color: '#ff6b35',
                        }}
                      >
                        HEART RATE ZONES
                      </div>
                      <div style={{ fontSize: 9, color: '#6c6c88' }}>
                        Est. MHR {EST_MHR} bpm · confirm when tested
                      </div>
                    </div>
                    {HR_ZONES.map((z) => (
                      <div
                        key={z.zone}
                        style={{
                          display: 'flex',
                          gap: 10,
                          marginBottom: 8,
                          alignItems: 'flex-start',
                        }}
                      >
                        <div
                          style={{
                            width: 28,
                            flexShrink: 0,
                            fontSize: 9,
                            fontWeight: 700,
                            color: z.color,
                            letterSpacing: 1,
                            paddingTop: 1,
                          }}
                        >
                          {z.zone}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              display: 'flex',
                              gap: 8,
                              alignItems: 'baseline',
                              marginBottom: 2,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 11,
                                color: '#fff',
                                fontWeight: 600,
                              }}
                            >
                              {z.bpm} bpm
                            </span>
                            <span style={{ fontSize: 9, color: '#6c6c88' }}>
                              {z.pct} MHR · {z.lactate}
                            </span>
                          </div>
                          <div
                            style={{
                              fontSize: 10,
                              color: '#7e7e9a',
                              lineHeight: 1.5,
                            }}
                          >
                            {z.desc}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Grey zone warning */}
                  <div
                    style={{
                      background: '#1e1e30',
                      border: '1px solid #ffd70030',
                      borderLeft: '3px solid #ffd700',
                      borderRadius: 6,
                      padding: '11px 14px',
                      fontSize: 11,
                      color: '#888860',
                      lineHeight: 1.6,
                    }}
                  >
                    ⚠️ Avoid the grey zone (UT1 upper → AT, ~136–148 bpm). Most
                    recreational athletes spend too much time here. It's taxing
                    enough to accumulate fatigue but not intense enough to drive
                    VO₂ adaptation. Your natural negative-split pacing pattern
                    drifts into this zone — use HR to stay below 136 on Z2 days.
                  </div>

                  {/* ── STRENGTH GUIDELINES ── */}
                  <div
                    style={{
                      fontSize: 9,
                      letterSpacing: 3,
                      color: '#34d399',
                      margin: '20px 0 8px',
                    }}
                  >
                    STRENGTH FOR PERFORMANCE
                  </div>

                  {/* Rep schemes */}
                  <div
                    style={{
                      background: '#2a2a48',
                      border: '1px solid #4a4a68',
                      borderRadius: 6,
                      padding: '14px 16px',
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 9,
                        letterSpacing: 2,
                        color: '#7e7e9a',
                        marginBottom: 12,
                      }}
                    >
                      REP SCHEMES BY MOVEMENT TIER
                    </div>
                    {REP_SCHEMES.map((r) => (
                      <div
                        key={r.tier}
                        style={{
                          marginBottom: 14,
                          paddingBottom: 14,
                          borderBottom: '1px solid #3e3e5a',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'baseline',
                            marginBottom: 4,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: r.color,
                            }}
                          >
                            {r.tier}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              color: '#fff',
                              fontWeight: 600,
                            }}
                          >
                            {r.reps} reps{' '}
                            <span style={{ color: '#7e7e9a', fontWeight: 400 }}>
                              · {r.rest}
                            </span>
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: 10,
                            color: '#aaaacc',
                            marginBottom: 4,
                          }}
                        >
                          {r.lifts}
                        </div>
                        <div
                          style={{
                            fontSize: 10,
                            color: '#7e7e9a',
                            lineHeight: 1.5,
                          }}
                        >
                          {r.why}
                        </div>
                      </div>
                    ))}
                    <div
                      style={{
                        fontSize: 9,
                        color: '#6c6c88',
                        lineHeight: 1.5,
                        fontStyle: 'italic',
                      }}
                    >
                      Heavy low-rep compounds transfer best to the drive/pedal
                      and interfere least with aerobic adaptation. Pump work
                      stays on small muscles where fatigue cost is trivial.
                    </div>
                  </div>

                  {/* Lower day differentiation */}
                  <div
                    style={{
                      background: '#2a2a48',
                      border: '1px solid #34d39930',
                      borderLeft: '3px solid #34d399',
                      borderRadius: 6,
                      padding: '14px 16px',
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 9,
                        letterSpacing: 2,
                        color: '#34d399',
                        marginBottom: 4,
                      }}
                    >
                      LOWER DAY DIFFERENTIATION
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: '#7e7e9a',
                        marginBottom: 12,
                        lineHeight: 1.5,
                      }}
                    >
                      Daily undulating periodization — train legs twice without
                      max CNS load both times. Protects recovery.
                    </div>
                    {LOWER_DIFFERENTIATION.map((d) => (
                      <div key={d.day} style={{ marginBottom: 10 }}>
                        <div
                          style={{
                            display: 'flex',
                            gap: 8,
                            alignItems: 'baseline',
                            marginBottom: 3,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: '#fff',
                            }}
                          >
                            {d.day}
                          </span>
                          <span style={{ fontSize: 10, color: '#34d399' }}>
                            {d.focus}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: 10,
                            color: '#aaaacc',
                            lineHeight: 1.6,
                          }}
                        >
                          {d.detail}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Strength principles */}
                  <div
                    style={{
                      background: '#2a2a48',
                      border: '1px solid #4a4a68',
                      borderRadius: 6,
                      padding: '14px 16px',
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 9,
                        letterSpacing: 2,
                        color: '#7e7e9a',
                        marginBottom: 10,
                      }}
                    >
                      KEY PRINCIPLES
                    </div>
                    {STRENGTH_PRINCIPLES.map(([icon, text]) => (
                      <div
                        key={text}
                        style={{
                          display: 'flex',
                          gap: 10,
                          marginBottom: 9,
                          fontSize: 11,
                          color: '#aaaacc',
                          lineHeight: 1.5,
                        }}
                      >
                        <span style={{ flexShrink: 0 }}>{icon}</span>
                        <span>{text}</span>
                      </div>
                    ))}
                  </div>

                  {/* Goal hierarchy note */}
                  <div
                    style={{
                      background: '#1e1e30',
                      border: '1px solid #f472b630',
                      borderLeft: '3px solid #f472b6',
                      borderRadius: 6,
                      padding: '11px 14px',
                      fontSize: 11,
                      color: '#aaaacc',
                      lineHeight: 1.6,
                    }}
                  >
                    <span style={{ color: '#f472b6', fontWeight: 700 }}>
                      GOAL HIERARCHY:{' '}
                    </span>
                    Lower body + pulling serve performance AND aesthetics —
                    prioritise. Pressing & arms are aesthetic-only (antagonist
                    to the rowing stroke). Keep them for the shirt-off goal, but
                    know they don't buy rowing or cycling performance.
                    Concurrent endurance + strength means each progresses at
                    ~80% of its isolated potential — an accepted trade for
                    training both.
                  </div>

                  {/* ── TECHNIQUE & SKILL ── */}
                  <div
                    style={{
                      fontSize: 9,
                      letterSpacing: 3,
                      color: '#00d4ff',
                      margin: '20px 0 8px',
                    }}
                  >
                    TECHNIQUE, SKILL & RECOVERY
                  </div>
                  <div
                    style={{
                      background: '#1e1e30',
                      border: '1px solid #00d4ff30',
                      borderLeft: '3px solid #00d4ff',
                      borderRadius: 6,
                      padding: '11px 14px',
                      marginBottom: 10,
                      fontSize: 11,
                      color: '#aaaacc',
                      lineHeight: 1.6,
                    }}
                  >
                    Technical efficiency gains cost zero recovery — a 2–3%
                    stroke improvement is free speed at every intensity. These
                    integrate into existing sessions; nothing added to the
                    schedule.
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      marginBottom: 10,
                    }}
                  >
                    {TECHNIQUE_WORK.map((t) => (
                      <div
                        key={t.name}
                        style={{
                          background: '#2a2a48',
                          border: '1px solid #4a4a68',
                          borderLeft: `3px solid ${t.color}`,
                          borderRadius: 6,
                          padding: '12px 14px',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'baseline',
                            marginBottom: 4,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: t.color,
                            }}
                          >
                            {t.name}
                          </span>
                          <span style={{ fontSize: 9, color: '#7e7e9a' }}>
                            {t.freq}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: 10,
                            color: '#aaaacc',
                            lineHeight: 1.6,
                            marginBottom: 5,
                          }}
                        >
                          {t.how}
                        </div>
                        <div
                          style={{
                            fontSize: 9,
                            color: '#7e7e9a',
                            fontStyle: 'italic',
                          }}
                        >
                          {t.why}
                        </div>
                      </div>
                    ))}

                    {/* Yoga & Foam Rolling */}
                    <div
                      style={{
                        background: '#2a2a48',
                        border: '1px solid #4a4a68',
                        borderLeft: '3px solid #f472b6',
                        borderRadius: 6,
                        padding: '12px 14px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'baseline',
                          marginBottom: 4,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: '#f472b6',
                          }}
                        >
                          Foam Roll + Yoga
                        </span>
                        <span style={{ fontSize: 9, color: '#7e7e9a' }}>
                          Rest days · 15+20 min
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: '#aaaacc',
                          lineHeight: 1.6,
                          marginBottom: 5,
                        }}
                      >
                        Foam roll first (t-spine, lats, glutes, hamstrings,
                        calves — 30–60s on tight spots, not fast rolling). Then
                        yoga. British Rowing study: lack of flexibility is the
                        primary limiter for masters rowers. This directly
                        addresses it.
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: '#aaaacc',
                          lineHeight: 1.5,
                          marginBottom: 8,
                        }}
                      >
                        <span style={{ color: '#f472b6' }}>Resource: </span>Yoga
                        with Kara — yoga4rowers.com (Masters Toolkit). Free
                        trial. Also on YouTube (search "Yoga with Kara athletes
                        recovery"). Optional: British Rowing's 3-stretch
                        before-bed sequence on two-a-day nights.
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: '#aaaacc',
                          lineHeight: 1.5,
                        }}
                      >
                        <span style={{ color: '#f472b6' }}>
                          Pay attention to:{' '}
                        </span>
                        hip flexors (lunge poses), hamstring length (forward
                        folds), t-spine rotation, child's pose hip depth. Note
                        L/R differences — asymmetries show up first in yoga and
                        show up later as injury.
                      </div>
                    </div>
                  </div>

                  {/* ── sRPE ── */}
                  <div
                    style={{
                      background: '#2a2a48',
                      border: '1px solid #ffd70030',
                      borderLeft: '3px solid #ffd700',
                      borderRadius: 6,
                      padding: '13px 16px',
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 9,
                        letterSpacing: 3,
                        color: '#ffd700',
                        marginBottom: 8,
                      }}
                    >
                      sRPE · SUBJECTIVE MONITORING
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: '#aaaacc',
                        lineHeight: 1.7,
                      }}
                    >
                      {SRPE_SCALE}
                    </div>
                    <div
                      style={{
                        fontSize: 9,
                        color: '#7e7e9a',
                        marginTop: 8,
                        fontStyle: 'italic',
                      }}
                    >
                      Subjective measures often catch overreaching before HRV
                      does. Report the number with each session — it gets logged
                      alongside the data.
                    </div>
                  </div>

                  {/* ── MOVEMENT SCREEN ── */}
                  <div
                    style={{
                      background: '#2a2a48',
                      border: '1px solid #4a4a68',
                      borderRadius: 6,
                      padding: '14px 16px',
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 9,
                        letterSpacing: 3,
                        color: '#34d399',
                        marginBottom: 4,
                      }}
                    >
                      MOVEMENT SCREEN · MONTHLY (~10 MIN)
                    </div>
                    <div
                      style={{
                        fontSize: 9,
                        color: '#7e7e9a',
                        marginBottom: 12,
                        lineHeight: 1.5,
                      }}
                    >
                      Run on a rest Sunday. Log anything flagged — asymmetries
                      and restrictions affect both injury risk and stroke
                      length.
                    </div>
                    {MOVEMENT_SCREEN.map((m) => (
                      <div
                        key={m.test}
                        style={{
                          marginBottom: 10,
                          paddingBottom: 10,
                          borderBottom: '1px solid #3e3e5a',
                        }}
                      >
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: '#e8e8f0',
                            marginBottom: 3,
                          }}
                        >
                          {m.test}
                        </div>
                        <div
                          style={{
                            fontSize: 10,
                            color: '#aaaacc',
                            lineHeight: 1.5,
                          }}
                        >
                          {m.look}
                        </div>
                        <div
                          style={{
                            fontSize: 9,
                            color: '#ff6b35',
                            marginTop: 3,
                          }}
                        >
                          ⚑ {m.flag}
                        </div>
                      </div>
                    ))}
                    <div
                      style={{
                        fontSize: 9,
                        letterSpacing: 2,
                        color: '#7e7e9a',
                        margin: '10px 0 8px',
                      }}
                    >
                      PRE-LIFT MOBILITY (5–10 MIN, EVERY STRENGTH SESSION)
                    </div>
                    {MOBILITY_WARMUP.map((m) => (
                      <div
                        key={m}
                        style={{
                          fontSize: 10,
                          color: '#aaaacc',
                          lineHeight: 1.7,
                          paddingLeft: 4,
                        }}
                      >
                        · {m}
                      </div>
                    ))}
                  </div>

                  {/* ── NUTRITION ── */}
                  <div
                    style={{
                      fontSize: 9,
                      letterSpacing: 3,
                      color: '#ff2d55',
                      margin: '20px 0 8px',
                    }}
                  >
                    NUTRITION · RECOMP
                  </div>

                  {/* Recomp framing */}
                  <div
                    style={{
                      background: '#1e1e30',
                      border: '1px solid #ff2d5530',
                      borderLeft: '3px solid #ff2d55',
                      borderRadius: 6,
                      padding: '11px 14px',
                      marginBottom: 10,
                      fontSize: 11,
                      color: '#aaaacc',
                      lineHeight: 1.6,
                    }}
                  >
                    <span style={{ color: '#ff2d55', fontWeight: 700 }}>
                      THE WINDOW:{' '}
                    </span>
                    Simultaneous fat loss + muscle gain is hardest for lean,
                    trained lifters — but your rapid strength PRs signal a
                    return-to-training phase, exactly when recomp works best.
                    Ride it while it lasts. Logged in MacroFactor — its adaptive
                    expenditure suits variable training load.{' '}
                    <span style={{ color: '#7e7e9a' }}>
                      Not dietitian advice — general framework.
                    </span>
                  </div>

                  {/* Macro targets */}
                  <div
                    style={{
                      background: '#2a2a48',
                      border: '1px solid #4a4a68',
                      borderRadius: 6,
                      padding: '14px 16px',
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 9,
                        letterSpacing: 2,
                        color: '#7e7e9a',
                        marginBottom: 12,
                      }}
                    >
                      DAILY MACRO TARGETS · ~94KG
                    </div>
                    {MACRO_TARGETS.map((m) => (
                      <div
                        key={m.macro}
                        style={{
                          marginBottom: 12,
                          paddingBottom: 12,
                          borderBottom: '1px solid #3e3e5a',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'baseline',
                            marginBottom: 4,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: m.color,
                            }}
                          >
                            {m.macro}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              color: '#fff',
                              fontWeight: 600,
                            }}
                          >
                            {m.target}{' '}
                            <span style={{ color: '#7e7e9a', fontWeight: 400 }}>
                              · {m.rule}
                            </span>
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: 10,
                            color: '#7e7e9a',
                            lineHeight: 1.5,
                          }}
                        >
                          {m.note}
                        </div>
                      </div>
                    ))}
                    <div
                      style={{
                        fontSize: 9,
                        color: '#6c6c88',
                        lineHeight: 1.5,
                        fontStyle: 'italic',
                      }}
                    >
                      Currently MAINTENANCE (avg ~3,030/day) until clean TDEE
                      confirms. Deficit (0.3kg/wk) starts after. Protein → carbs
                      → fat priority.
                    </div>
                  </div>

                  {/* Live MacroFactor periodized program */}
                  <div
                    style={{
                      background: '#2a2a48',
                      border: '1px solid #34d39930',
                      borderLeft: '3px solid #34d399',
                      borderRadius: 6,
                      padding: '14px 16px',
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        marginBottom: 8,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 9,
                          letterSpacing: 2,
                          color: '#34d399',
                        }}
                      >
                        LIVE PROGRAM · PERIODIZED (MacroFactor)
                      </div>
                      <div style={{ fontSize: 8, color: '#6c6c88' }}>
                        avg ~3,030 · maintenance
                      </div>
                    </div>
                    <table
                      style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: 10,
                      }}
                    >
                      <thead>
                        <tr style={{ borderBottom: '1px solid #4a4a68' }}>
                          {['Day', 'Training', 'Cal', 'P', 'C', 'F'].map(
                            (h) => (
                              <td
                                key={h}
                                style={{
                                  padding: '4px 5px',
                                  color: '#7e7e9a',
                                  fontSize: 8,
                                  letterSpacing: 1,
                                  textAlign:
                                    h === 'Day' || h === 'Training'
                                      ? 'left'
                                      : 'right',
                                }}
                              >
                                {h}
                              </td>
                            )
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {MF_PROGRAM.map((d, i) => {
                          const hot = d.cal >= 3200;
                          return (
                            <tr
                              key={i}
                              style={{ borderBottom: '1px solid #1e1e30' }}
                            >
                              <td
                                style={{
                                  padding: '5px 5px',
                                  color: '#e8e8f0',
                                  fontWeight: 700,
                                }}
                              >
                                {d.day}
                              </td>
                              <td style={{ padding: '5px 5px', color: '#888' }}>
                                {d.train}
                              </td>
                              <td
                                style={{
                                  padding: '5px 5px',
                                  color: hot ? '#34d399' : '#aaaacc',
                                  fontWeight: hot ? 700 : 400,
                                  textAlign: 'right',
                                }}
                              >
                                {d.cal}
                              </td>
                              <td
                                style={{
                                  padding: '5px 5px',
                                  color: '#ff2d55',
                                  textAlign: 'right',
                                }}
                              >
                                {d.p}
                              </td>
                              <td
                                style={{
                                  padding: '5px 5px',
                                  color: '#00d4ff',
                                  textAlign: 'right',
                                }}
                              >
                                {d.c}
                              </td>
                              <td
                                style={{
                                  padding: '5px 5px',
                                  color: '#ffd700',
                                  textAlign: 'right',
                                }}
                              >
                                {d.f}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <div
                      style={{
                        fontSize: 8,
                        color: '#7e7e9a',
                        lineHeight: 1.5,
                        marginTop: 8,
                        fontStyle: 'italic',
                      }}
                    >
                      Protein locked 200g all days. Carbs periodized to load
                      (395 on two-a-day/long-row, 280 rest). MacroFactor's own
                      expenditure est. lags at 2,136 (near RMR) — hold ~3,030
                      via Collaborative override; weight trend settles it.
                    </div>
                  </div>

                  {/* Queued deficit program */}
                  <div
                    style={{
                      background: 'linear-gradient(135deg,#ff6b3512,#1e1e30)',
                      border: '1px solid #ff6b3540',
                      borderLeft: '3px solid #ff6b35',
                      borderRadius: 6,
                      padding: '14px 16px',
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        marginBottom: 6,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 9,
                          letterSpacing: 2,
                          color: '#ff6b35',
                        }}
                      >
                        QUEUED · DEFICIT PROGRAM (LEAN PHASE)
                      </div>
                      <div style={{ fontSize: 8, color: '#6c6c88' }}>
                        ~0.25kg/wk
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 9,
                        color: '#ffd700',
                        lineHeight: 1.5,
                        marginBottom: 8,
                      }}
                    >
                      🔒 {DEFICIT_PROGRAM.trigger}
                    </div>
                    <table
                      style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: 10,
                      }}
                    >
                      <thead>
                        <tr style={{ borderBottom: '1px solid #4a4a68' }}>
                          {['Day', 'Cal', 'P', 'C', 'F', 'vs maint'].map(
                            (h) => (
                              <td
                                key={h}
                                style={{
                                  padding: '4px 5px',
                                  color: '#7e7e9a',
                                  fontSize: 8,
                                  letterSpacing: 1,
                                  textAlign:
                                    h === 'Day'
                                      ? 'left'
                                      : h === 'vs maint'
                                        ? 'right'
                                        : 'right',
                                }}
                              >
                                {h}
                              </td>
                            )
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {DEFICIT_PROGRAM.days.map((d, i) => (
                          <tr
                            key={i}
                            style={{ borderBottom: '1px solid #1e1e30' }}
                          >
                            <td
                              style={{
                                padding: '5px',
                                color: '#e8e8f0',
                                fontWeight: 700,
                              }}
                            >
                              {d.day}
                            </td>
                            <td
                              style={{
                                padding: '5px',
                                color: '#aaaacc',
                                textAlign: 'right',
                              }}
                            >
                              {d.cal}
                            </td>
                            <td
                              style={{
                                padding: '5px',
                                color: '#ff2d55',
                                textAlign: 'right',
                              }}
                            >
                              {d.p}
                            </td>
                            <td
                              style={{
                                padding: '5px',
                                color: '#00d4ff',
                                textAlign: 'right',
                              }}
                            >
                              {d.c}
                            </td>
                            <td
                              style={{
                                padding: '5px',
                                color: '#ffd700',
                                textAlign: 'right',
                              }}
                            >
                              {d.f}
                            </td>
                            <td
                              style={{
                                padding: '5px',
                                color: '#888',
                                textAlign: 'right',
                                fontSize: 8,
                              }}
                            >
                              {d.cut}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div
                      style={{
                        fontSize: 9,
                        letterSpacing: 2,
                        color: '#ff6b35',
                        marginTop: 10,
                        marginBottom: 6,
                      }}
                    >
                      GUARDRAILS
                    </div>
                    {DEFICIT_PROGRAM.guardrails.map((g, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          gap: 8,
                          marginBottom: 5,
                          fontSize: 9,
                          color: '#aaaacc',
                          lineHeight: 1.5,
                        }}
                      >
                        <span style={{ color: '#ff6b35', flexShrink: 0 }}>
                          ·
                        </span>
                        <span>{g}</span>
                      </div>
                    ))}
                    <div
                      style={{
                        fontSize: 9,
                        color: '#888860',
                        lineHeight: 1.5,
                        marginTop: 8,
                      }}
                    >
                      📍 {DEFICIT_PROGRAM.phase}
                    </div>
                    <div
                      style={{
                        fontSize: 9,
                        color: '#34d399',
                        lineHeight: 1.5,
                        marginTop: 6,
                        fontStyle: 'italic',
                      }}
                    >
                      💡 {DEFICIT_PROGRAM.note}
                    </div>
                  </div>

                  {/* Nutrition principles */}
                  <div
                    style={{
                      background: '#2a2a48',
                      border: '1px solid #4a4a68',
                      borderRadius: 6,
                      padding: '14px 16px',
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 9,
                        letterSpacing: 2,
                        color: '#7e7e9a',
                        marginBottom: 10,
                      }}
                    >
                      KEY PRINCIPLES
                    </div>
                    {NUTRITION_PRINCIPLES.map(([icon, text]) => (
                      <div
                        key={text}
                        style={{
                          display: 'flex',
                          gap: 10,
                          marginBottom: 9,
                          fontSize: 11,
                          color: '#aaaacc',
                          lineHeight: 1.5,
                        }}
                      >
                        <span style={{ flexShrink: 0 }}>{icon}</span>
                        <span>{text}</span>
                      </div>
                    ))}
                  </div>

                  {/* Fuelling by session type */}
                  <div
                    style={{
                      background: '#2a2a48',
                      border: '1px solid #f472b630',
                      borderLeft: '3px solid #f472b6',
                      borderRadius: 6,
                      padding: '14px 16px',
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 9,
                        letterSpacing: 2,
                        color: '#f472b6',
                        marginBottom: 10,
                      }}
                    >
                      FUELLING BY SESSION TYPE
                    </div>
                    {FUELLING.byType.map((f, i) => (
                      <div
                        key={i}
                        style={{
                          background: '#08080d',
                          borderLeft: `2px solid ${f.color}`,
                          borderRadius: 4,
                          padding: '9px 11px',
                          marginBottom: 6,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: f.color,
                            marginBottom: 3,
                          }}
                        >
                          {f.type}
                        </div>
                        <div
                          style={{
                            fontSize: 10,
                            color: '#aaaacc',
                            lineHeight: 1.5,
                          }}
                        >
                          {f.guide}
                        </div>
                      </div>
                    ))}
                    <div
                      style={{
                        fontSize: 9,
                        color: '#888860',
                        lineHeight: 1.5,
                        marginTop: 4,
                      }}
                    >
                      🥩 {FUELLING.protein}
                    </div>
                  </div>

                  {/* Hydration */}
                  <div
                    style={{
                      background: '#2a2a48',
                      border: '1px solid #00d4ff30',
                      borderLeft: '3px solid #00d4ff',
                      borderRadius: 6,
                      padding: '14px 16px',
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 9,
                        letterSpacing: 2,
                        color: '#00d4ff',
                        marginBottom: 10,
                      }}
                    >
                      💧 HYDRATION · WA HEAT
                    </div>
                    {FUELLING.hydration.map((h, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          gap: 10,
                          marginBottom: 7,
                          fontSize: 10,
                          color: '#aaaacc',
                          lineHeight: 1.5,
                        }}
                      >
                        <span style={{ color: '#00d4ff', flexShrink: 0 }}>
                          ·
                        </span>
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {/* ── OVERVIEW ── */}
          {view === 'overview' && (
            <>
              {/* ── CONDENSED TODAY STATUS STRIP (live, mobile-first) ── */}
              {(() => {
                const t = getToday(getRosterMode(nowTick)); // roster auto-switches home/FIFO by date
                const todayRec = recoveryLog[recoveryLog.length - 1];
                const lastSrpe = (() => {
                  for (let i = 0; i < loggedSessions.length; i++) {
                    if (loggedSessions[i].srpe != null)
                      return loggedSessions[i].srpe;
                  }
                  return null;
                })();
                const fired = evaluateRules(todayRec, lastSrpe, latest.tsb);
                const readiness = calcReadiness(todayRec, latest.tsb);
                const sig = autoregulate(latest.tsb, readiness, fired);
                const upcoming = getUpcomingSessions(nowTick, loggedSessions);
                return (
                  <div
                    style={{
                      background: 'linear-gradient(135deg,#1e1e30,#2a2a48)',
                      border: `1px solid ${sig.color}50`,
                      borderRadius: 8,
                      padding: '14px 16px',
                      marginBottom: 14,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 10,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: '#fff',
                          }}
                        >
                          {t.dateStr}
                        </div>
                        <div
                          style={{
                            fontSize: 9,
                            color: '#7e7e9a',
                            letterSpacing: 1,
                            marginTop: 1,
                          }}
                        >
                          {PHASE_CONTEXT.phaseLabel} · wk{' '}
                          {PHASE_CONTEXT.weeksIn}/{PHASE_CONTEXT.weeksTotal} ·{' '}
                          {t.cycleLabel.split('—')[0].trim()}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div
                          style={{
                            fontSize: 18,
                            fontWeight: 700,
                            color: sig.color,
                          }}
                        >
                          ● {sig.signal}
                        </div>
                        <div style={{ fontSize: 9, color: '#7e7e9a' }}>
                          readiness{' '}
                          {readiness && readiness.score != null
                            ? readiness.score
                            : '—'}
                        </div>
                      </div>
                    </div>
                    {t.today &&
                      (() => {
                        const todaySessions = daySessions(t.today);
                        const todayLogged = logEntriesForDate(
                          new Date(),
                          loggedSessions
                        );
                        const isDone = todayLogged.length > 0;
                        return (
                          <div style={{ marginBottom: 8 }}>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 7,
                                marginBottom: 5,
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 8,
                                  color: t.cycleColor,
                                  letterSpacing: 2,
                                }}
                              >
                                TODAY · {t.todayKey}
                              </span>
                              {isDone && (
                                <span
                                  style={{
                                    fontSize: 8,
                                    color: '#34d399',
                                    letterSpacing: 1,
                                    fontWeight: 700,
                                  }}
                                >
                                  ✓ {todayLogged.length} LOGGED
                                </span>
                              )}
                            </div>
                            {todaySessions.length === 0 ? (
                              <div
                                style={{
                                  background: '#08080d',
                                  borderRadius: 5,
                                  padding: '10px 12px',
                                  fontSize: 11,
                                  color: '#6c6c88',
                                }}
                              >
                                Rest day — no scheduled session.
                              </div>
                            ) : (
                              <div
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: 4,
                                }}
                              >
                                {todaySessions.map((s, j) => (
                                  <WorkoutItem
                                    key={j}
                                    session={{ ...s, done: isDone }}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    <div
                      style={{
                        fontSize: 8,
                        color: '#7e7e9a',
                        letterSpacing: 2,
                        marginBottom: 5,
                      }}
                    >
                      UPCOMING
                    </div>
                    {upcoming.length === 0 ? (
                      <div style={{ fontSize: 10, color: '#6c6c88' }}>
                        No more scheduled sessions in the next 3 days.
                      </div>
                    ) : (
                      upcoming.map((u, i) => {
                        const dayDiff = Math.round(
                          (new Date(
                            u.when.getFullYear(),
                            u.when.getMonth(),
                            u.when.getDate()
                          ) -
                            new Date(
                              nowTick.getFullYear(),
                              nowTick.getMonth(),
                              nowTick.getDate()
                            )) /
                            86400000
                        );
                        const whenLabel =
                          dayDiff === 0
                            ? 'Today'
                            : dayDiff === 1
                              ? 'Tomorrow'
                              : u.dow;
                        const slotColor = i === 0 ? '#00d4ff' : '#888';
                        return (
                          <div
                            key={i}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '5px 0',
                              borderTop: i > 0 ? '1px solid #3e3e5a' : 'none',
                            }}
                          >
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div
                                style={{
                                  fontSize: 10,
                                  color: '#aaaacc',
                                  lineHeight: 1.3,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {u.label}
                              </div>
                              <div style={{ fontSize: 8, color: '#6c6c88' }}>
                                {u.slot}
                              </div>
                            </div>
                            <div
                              style={{
                                textAlign: 'right',
                                flexShrink: 0,
                                marginLeft: 10,
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 12,
                                  fontWeight: 700,
                                  color: slotColor,
                                }}
                              >
                                {whenLabel}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}

                    {/* Recently completed — last few logged sessions at a glance */}
                    {(() => {
                      const recent = loggedSessions.slice(0, 4);
                      if (recent.length === 0) return null;
                      return (
                        <>
                          <div
                            style={{
                              fontSize: 8,
                              color: '#34d399',
                              letterSpacing: 2,
                              margin: '12px 0 5px',
                            }}
                          >
                            RECENTLY COMPLETED
                          </div>
                          {recent.map((e, i) => (
                            <div
                              key={i}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '4px 0',
                                borderTop: i > 0 ? '1px solid #3e3e5a' : 'none',
                              }}
                            >
                              <div
                                style={{
                                  minWidth: 0,
                                  flex: 1,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6,
                                }}
                              >
                                <span
                                  style={{
                                    color: '#34d399',
                                    fontSize: 10,
                                    flexShrink: 0,
                                  }}
                                >
                                  ✓
                                </span>
                                <span
                                  style={{
                                    fontSize: 10,
                                    color: '#7a9a8a',
                                    lineHeight: 1.3,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {e.label}
                                </span>
                              </div>
                              <div
                                style={{
                                  textAlign: 'right',
                                  flexShrink: 0,
                                  marginLeft: 10,
                                  display: 'flex',
                                  gap: 6,
                                  alignItems: 'center',
                                }}
                              >
                                {e.srpe && (
                                  <span
                                    style={{ fontSize: 8, color: '#7e7e9a' }}
                                  >
                                    sRPE {e.srpe}
                                  </span>
                                )}
                                {e.prs > 0 && (
                                  <span
                                    style={{ fontSize: 8, color: '#ffd700' }}
                                  >
                                    🏆{e.prs}
                                  </span>
                                )}
                                <span style={{ fontSize: 9, color: '#7e7e9a' }}>
                                  {e.date.slice(0, -3)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </>
                      );
                    })()}
                  </div>
                );
              })()}

              {/* Phase context — where you are in the arc */}
              <div
                style={{
                  background: 'linear-gradient(135deg,#00d4ff15,#1e1e30)',
                  border: '1px solid #00d4ff40',
                  borderRadius: 6,
                  padding: '13px 16px',
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginBottom: 8,
                  }}
                >
                  <span
                    style={{ fontSize: 13, fontWeight: 700, color: '#00d4ff' }}
                  >
                    {PHASE_CONTEXT.phaseLabel}
                  </span>
                  <span style={{ fontSize: 9, color: '#7e7e9a' }}>
                    wk {PHASE_CONTEXT.weeksIn}/{PHASE_CONTEXT.weeksTotal} ·{' '}
                    {PHASE_CONTEXT.window}
                  </span>
                </div>
                {/* Arc strip */}
                <div style={{ display: 'flex', gap: 3, marginBottom: 8 }}>
                  {PHASE_CONTEXT.arc.map((p) => (
                    <div
                      key={p.phase}
                      style={{
                        flex: p.phase === 'RACE' ? 1.3 : 1,
                        background: p.active ? '#00d4ff' : '#2a2a48',
                        border: `1px solid ${p.active ? '#00d4ff' : '#4a4a68'}`,
                        borderRadius: 3,
                        padding: '5px 4px',
                        textAlign: 'center',
                      }}
                    >
                      <div
                        style={{
                          fontSize: 7,
                          fontWeight: 700,
                          color: p.active ? '#08080d' : '#7e7e9a',
                          letterSpacing: 0.5,
                        }}
                      >
                        {p.phase}
                      </div>
                      <div
                        style={{
                          fontSize: 6,
                          color: p.active ? '#08080d99' : '#6c6c88',
                        }}
                      >
                        {p.window}
                      </div>
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: '#aaaacc',
                    lineHeight: 1.5,
                    marginBottom: 5,
                  }}
                >
                  <span style={{ color: '#00d4ff' }}>Doing: </span>
                  {PHASE_CONTEXT.doing}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: '#aaaacc',
                    lineHeight: 1.5,
                    marginBottom: 5,
                  }}
                >
                  <span style={{ color: '#00d4ff' }}>Why now: </span>
                  {PHASE_CONTEXT.why}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: '#888860',
                    lineHeight: 1.5,
                    marginBottom: 5,
                  }}
                >
                  ⏸ {PHASE_CONTEXT.notYet}
                </div>
                <div
                  style={{
                    fontSize: 9,
                    color: '#7e7e9a',
                    lineHeight: 1.5,
                    borderTop: '1px solid #3e3e5a',
                    paddingTop: 6,
                  }}
                >
                  Next gate: {PHASE_CONTEXT.nextGate}
                </div>
              </div>

              {/* Stats */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${isWide ? 4 : 2},1fr)`,
                  gap: 8,
                  marginBottom: 16,
                }}
              >
                {[
                  ['SESSIONS LOGGED', totalSessions, 'erg + strength'],
                  [
                    'ERG DISTANCE',
                    `${(totalErgDist / 1000).toFixed(0)}km`,
                    'logged total',
                  ],
                  [
                    'LATEST WATTS',
                    latestErg?.avg_watts ? `${latestErg.avg_watts}W` : '—',
                    'working avg power',
                  ],
                  [
                    'SQUAT e1RM',
                    `${latestSquat.e1rm}kg`,
                    `as of ${latestSquat.date}`,
                  ],
                ].map(([k, v, sub]) => (
                  <div
                    key={k}
                    style={{
                      background: '#2a2a48',
                      border: '1px solid #4a4a68',
                      borderRadius: 6,
                      padding: '11px 13px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 8,
                        color: '#7e7e9a',
                        letterSpacing: 3,
                        marginBottom: 4,
                      }}
                    >
                      {k}
                    </div>
                    <div
                      style={{
                        fontSize: 20,
                        fontWeight: 700,
                        color: '#fff',
                        letterSpacing: -0.5,
                      }}
                    >
                      {v}
                    </div>
                    <div
                      style={{ fontSize: 9, color: '#6c6c88', marginTop: 2 }}
                    >
                      {sub}
                    </div>
                  </div>
                ))}
              </div>

              {/* Adaptive Decision Engine */}
              {(() => {
                const todayRec = recoveryLog[recoveryLog.length - 1];
                const lastSrpe = (() => {
                  for (let i = 0; i < loggedSessions.length; i++) {
                    if (loggedSessions[i].srpe != null)
                      return loggedSessions[i].srpe;
                  }
                  return null;
                })();
                const fired = evaluateRules(todayRec, lastSrpe, latest.tsb);
                const consistency = checkConsistency(fired, false);
                return (
                  <div
                    style={{
                      background: 'linear-gradient(135deg,#a78bfa12,#1e1e30)',
                      border: '1px solid #a78bfa40',
                      borderRadius: 6,
                      padding: '14px 16px',
                      marginBottom: 16,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        marginBottom: 4,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 9,
                          letterSpacing: 3,
                          color: '#a78bfa',
                        }}
                      >
                        ⚙️ ADAPTIVE ENGINE
                      </div>
                      <div style={{ fontSize: 8, color: '#7e7e9a' }}>
                        {ADAPTIVE_RULES.length} rules · evolving
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 9,
                        color: '#7e7e9a',
                        marginBottom: 10,
                        lineHeight: 1.5,
                      }}
                    >
                      Codified decision rules from our work. Transparent — every
                      flag traces to a rule + its origin. Reads current data;
                      surfaces what's firing now.
                    </div>

                    {/* Currently firing */}
                    <div
                      style={{
                        fontSize: 8,
                        letterSpacing: 2,
                        color: fired.length ? '#ff6b35' : '#34d399',
                        marginBottom: 6,
                      }}
                    >
                      {fired.length
                        ? `⚑ ${fired.length} FLAG${fired.length > 1 ? 'S' : ''} FIRING NOW`
                        : '✅ NOTHING FLAGGED — CLEAR TO TRAIN AS PLANNED'}
                    </div>
                    {fired.map((f, i) => (
                      <div
                        key={`${f.id}-${i}`}
                        style={{
                          background: '#08080d',
                          borderLeft: '2px solid #ff6b35',
                          borderRadius: 3,
                          padding: '7px 10px',
                          marginBottom: 4,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 9,
                            color: '#ff6b35',
                            fontWeight: 700,
                          }}
                        >
                          {f.id}{' '}
                        </span>
                        <span style={{ fontSize: 10, color: '#aaaacc' }}>
                          {f.msg}
                        </span>
                      </div>
                    ))}

                    {consistency.conflict && (
                      <div
                        style={{
                          background: '#1a0d0d',
                          border: '1px solid #ff2d5550',
                          borderRadius: 3,
                          padding: '7px 10px',
                          marginBottom: 4,
                          fontSize: 10,
                          color: '#ffaaaa',
                        }}
                      >
                        {consistency.msg}
                      </div>
                    )}

                    {/* Ruleset (collapsed summary) */}
                    <details style={{ marginTop: 10 }}>
                      <summary
                        style={{
                          fontSize: 9,
                          color: '#a78bfa',
                          cursor: 'pointer',
                          letterSpacing: 1,
                        }}
                      >
                        VIEW FULL RULESET ({ADAPTIVE_RULES.length})
                      </summary>
                      <div style={{ marginTop: 8 }}>
                        {ADAPTIVE_RULES.map((r) => (
                          <div
                            key={r.id}
                            style={{
                              background: '#08080d',
                              borderRadius: 3,
                              padding: '8px 10px',
                              marginBottom: 4,
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'baseline',
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  color: '#e8e8f0',
                                }}
                              >
                                {r.id} · {r.domain}
                              </span>
                              <span
                                style={{
                                  fontSize: 8,
                                  color: r.tier === 1 ? '#34d399' : '#ffd700',
                                }}
                              >
                                T{r.tier}
                              </span>
                            </div>
                            <div
                              style={{
                                fontSize: 9,
                                color: '#aaaacc',
                                lineHeight: 1.5,
                                marginTop: 2,
                              }}
                            >
                              {r.rule}
                            </div>
                            <div
                              style={{
                                fontSize: 9,
                                color: '#888860',
                                lineHeight: 1.5,
                                marginTop: 2,
                              }}
                            >
                              → {r.action}
                            </div>
                            <div
                              style={{
                                fontSize: 8,
                                color: '#6c6c88',
                                lineHeight: 1.4,
                                marginTop: 2,
                                fontStyle: 'italic',
                              }}
                            >
                              origin: {r.origin}
                            </div>
                          </div>
                        ))}
                        <div
                          style={{
                            fontSize: 8,
                            letterSpacing: 2,
                            color: '#7e7e9a',
                            margin: '10px 0 5px',
                          }}
                        >
                          RULESET EVOLUTION
                        </div>
                        {RULE_EVOLUTION.map((e, i) => (
                          <div
                            key={i}
                            style={{
                              fontSize: 9,
                              color: '#7e7e9a',
                              lineHeight: 1.5,
                              marginBottom: 3,
                              paddingLeft: 4,
                            }}
                          >
                            <span style={{ color: '#a78bfa' }}>{e.date}</span> ·{' '}
                            {e.change}
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                );
              })()}

              {/* Today's Prescription — live targets + autoregulation */}
              {(() => {
                const todayRec = recoveryLog[recoveryLog.length - 1];
                const lastSrpe = (() => {
                  for (let i = 0; i < loggedSessions.length; i++) {
                    if (loggedSessions[i].srpe != null)
                      return loggedSessions[i].srpe;
                  }
                  return null;
                })();
                const fired = evaluateRules(todayRec, lastSrpe, latest.tsb);
                const readiness = calcReadiness(todayRec, latest.tsb);
                const auto = autoregulate(latest.tsb, readiness, fired);
                const t = deriveTargets(HR130_POWER);
                return (
                  <div
                    style={{
                      background: `linear-gradient(135deg,${auto.color}12,#1e1e30)`,
                      border: `1px solid ${auto.color}50`,
                      borderRadius: 6,
                      padding: '14px 16px',
                      marginBottom: 16,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 8,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 9,
                          letterSpacing: 3,
                          color: auto.color,
                        }}
                      >
                        TODAY'S PRESCRIPTION · AUTOREGULATED
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: auto.color,
                          letterSpacing: 1,
                        }}
                      >
                        ● {auto.signal}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: '#aaaacc',
                        lineHeight: 1.6,
                        marginBottom: 10,
                      }}
                    >
                      {auto.guidance}
                    </div>

                    {/* Live-computed targets */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2,1fr)',
                        gap: 8,
                        marginBottom: 8,
                      }}
                    >
                      <div
                        style={{
                          background: '#08080d',
                          borderRadius: 4,
                          padding: '9px 11px',
                        }}
                      >
                        <div
                          style={{
                            fontSize: 8,
                            color: '#7e7e9a',
                            letterSpacing: 2,
                            marginBottom: 2,
                          }}
                        >
                          UT1 TARGET (LIVE)
                        </div>
                        <div
                          style={{
                            fontSize: 15,
                            fontWeight: 700,
                            color: '#00d4ff',
                          }}
                        >
                          {t.ut1Low}–{t.ut1High}W
                        </div>
                        <div
                          style={{
                            fontSize: 8,
                            color: '#6c6c88',
                            marginTop: 1,
                          }}
                        >
                          pacer cue {t.pacerCue}W · HR 130
                        </div>
                      </div>
                      <div
                        style={{
                          background: '#08080d',
                          borderRadius: 4,
                          padding: '9px 11px',
                        }}
                      >
                        <div
                          style={{
                            fontSize: 8,
                            color: '#7e7e9a',
                            letterSpacing: 2,
                            marginBottom: 2,
                          }}
                        >
                          UT2 TARGET (LIVE)
                        </div>
                        <div
                          style={{
                            fontSize: 15,
                            fontWeight: 700,
                            color: '#34d399',
                          }}
                        >
                          {t.ut2Low}–{t.ut2High}W
                        </div>
                        <div
                          style={{
                            fontSize: 8,
                            color: '#6c6c88',
                            marginTop: 1,
                          }}
                        >
                          easy · HR &lt;125
                        </div>
                      </div>
                    </div>
                    <div
                      style={{ fontSize: 8, color: '#6c6c88', lineHeight: 1.5 }}
                    >
                      Targets computed from {t.source}. Recompute automatically
                      as new HR130 points land. ● {auto.signal} fuses TSB (
                      {latest.tsb > 0 ? '+' : ''}
                      {latest.tsb}), readiness, and fired rules.{' '}
                      <span style={{ color: '#7e7e9a' }}>
                        TSB rests on estimated CP until the test — direction
                        meaningful, absolute soft.
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Training Load Chart */}
              <div
                style={{
                  background: '#2a2a48',
                  border: '1px solid #4a4a68',
                  borderRadius: 6,
                  padding: '14px 16px',
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginBottom: 4,
                  }}
                >
                  <div
                    style={{ fontSize: 9, letterSpacing: 3, color: '#ff6b35' }}
                  >
                    TRAINING LOAD
                  </div>
                  <div style={{ fontSize: 9, color: '#6c6c88' }}>
                    Est. FTP {ftp}W · update after threshold test
                  </div>
                </div>

                {/* Current values */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3,1fr)',
                    gap: 6,
                    marginBottom: 12,
                    marginTop: 8,
                  }}
                >
                  {[
                    ['CTL', 'Fitness', latest.ctl, '#00d4ff'],
                    ['ATL', 'Fatigue', latest.atl, '#ff6b35'],
                    [
                      'TSB',
                      'Form',
                      (latest.tsb > 0 ? '+' : '') + latest.tsb,
                      tsbColor,
                    ],
                  ].map(([k, sub, v, c]) => (
                    <div
                      key={k}
                      style={{
                        background: '#08080d',
                        borderRadius: 4,
                        padding: '8px 10px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: 8,
                          color: '#7e7e9a',
                          letterSpacing: 2,
                        }}
                      >
                        {k} <span style={{ color: '#5a5a74' }}>{sub}</span>
                      </div>
                      <div
                        style={{
                          fontSize: 18,
                          fontWeight: 700,
                          color: c,
                          marginTop: 2,
                        }}
                      >
                        {v}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Chart */}
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart
                    data={loadData}
                    margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                  >
                    <XAxis
                      dataKey="date"
                      tick={{
                        fontSize: 8,
                        fill: '#7e7e9a',
                        fontFamily: "'DM Mono',monospace",
                      }}
                      axisLine={false}
                      tickLine={false}
                      interval={Math.floor(loadData.length / 5)}
                    />
                    <YAxis
                      tick={{
                        fontSize: 8,
                        fill: '#7e7e9a',
                        fontFamily: "'DM Mono',monospace",
                      }}
                      axisLine={false}
                      tickLine={false}
                      width={28}
                    />
                    <Tooltip content={<LoadTooltip />} />
                    <ReferenceLine
                      y={0}
                      stroke="#4a4a68"
                      strokeDasharray="2 2"
                    />
                    <Line
                      type="monotone"
                      dataKey="ctl"
                      stroke="#00d4ff"
                      strokeWidth={2}
                      dot={false}
                      name="CTL"
                    />
                    <Line
                      type="monotone"
                      dataKey="atl"
                      stroke="#ff6b35"
                      strokeWidth={2}
                      dot={false}
                      name="ATL"
                    />
                    <Line
                      type="monotone"
                      dataKey="tsb"
                      stroke={tsbColor}
                      strokeWidth={1.5}
                      dot={false}
                      strokeDasharray="4 2"
                      name="TSB"
                    />
                  </LineChart>
                </ResponsiveContainer>

                {/* TSB status */}
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 10,
                    color: '#7e7e9a',
                    lineHeight: 1.5,
                  }}
                >
                  {latest.tsb > 10
                    ? '✅ Fresh — good form, ready for hard sessions'
                    : latest.tsb > -10
                      ? '⚡ Neutral — balanced load and recovery'
                      : latest.tsb > -30
                        ? '⚠️ Fatigued — normal mid-week training load. Protect Thursday rest.'
                        : "🔴 High fatigue — rest day is critical. Don't add sessions."}
                </div>
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 9,
                    color: '#5a5a74',
                    lineHeight: 1.5,
                  }}
                >
                  CTL builds over 42 days — values will be underestimated until
                  ~6 weeks of data. TSS calibrated to Est. FTP {ftp}W; update
                  after first threshold session for accuracy.
                </div>
              </div>

              {/* Nutrition Status */}
              <div
                style={{
                  background: '#2a2a48',
                  border: '1px solid #4a4a68',
                  borderRadius: 6,
                  padding: '14px 16px',
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginBottom: 10,
                  }}
                >
                  <div
                    style={{ fontSize: 9, letterSpacing: 3, color: '#ff2d55' }}
                  >
                    NUTRITION STATUS
                  </div>
                  <div style={{ fontSize: 9, color: '#6c6c88' }}>
                    Share MacroFactor screenshot to update
                  </div>
                </div>
                {nutritionLog
                  .slice(-2)
                  .reverse()
                  .map((day, i) => {
                    const t = NUTRITION_TARGETS[day.dayType];
                    const calS = assessMacro(day.cal, t.cal);
                    const proS = assessMacro(day.protein, t.protein);
                    const fatS = assessMacro(day.fat, t.fat);
                    const carS = assessMacro(day.carbs, t.carbs);
                    const isToday = i === 0;
                    return (
                      <div
                        key={day.date}
                        style={{
                          marginBottom: 8,
                          padding: '10px 12px',
                          background: isToday ? '#1e1e30' : '#08080d',
                          borderRadius: 4,
                          border: `1px solid ${isToday ? '#ff2d5530' : '#3e3e5a'}`,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: 8,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: '#fff',
                            }}
                          >
                            {day.date}
                          </span>
                          <span
                            style={{
                              fontSize: 9,
                              color: '#7e7e9a',
                              letterSpacing: 1,
                            }}
                          >
                            {day.dayType === 'two-a-day'
                              ? 'TWO-A-DAY'
                              : day.dayType === 'training'
                                ? 'TRAINING'
                                : 'REST'}
                          </span>
                        </div>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4,1fr)',
                            gap: 4,
                          }}
                        >
                          {[
                            ['CAL', day.cal, `${t.cal[0]}–${t.cal[1]}`, calS],
                            [
                              'PRO',
                              `${day.protein}g`,
                              `${t.protein[0]}–${t.protein[1]}g`,
                              proS,
                            ],
                            [
                              'FAT',
                              `${day.fat}g`,
                              `${t.fat[0]}–${t.fat[1]}g`,
                              fatS,
                            ],
                            [
                              'CARB',
                              `${day.carbs}g`,
                              `${t.carbs[0]}–${t.carbs[1]}g`,
                              carS,
                            ],
                          ].map(([label, val, target, status]) => (
                            <div
                              key={label}
                              style={{
                                background: '#2a2a48',
                                borderRadius: 3,
                                padding: '6px 6px',
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 8,
                                  color: '#7e7e9a',
                                  letterSpacing: 1,
                                  marginBottom: 2,
                                }}
                              >
                                {label}
                              </div>
                              <div
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: macroColor(status),
                                }}
                              >
                                {val}
                              </div>
                              <div
                                style={{
                                  fontSize: 8,
                                  color: '#5a5a74',
                                  marginTop: 1,
                                }}
                              >
                                {target}
                              </div>
                              <div style={{ fontSize: 10, marginTop: 1 }}>
                                {status}
                              </div>
                            </div>
                          ))}
                        </div>
                        {day.burn &&
                          (() => {
                            const net = day.cal - day.burn;
                            const netColor =
                              Math.abs(net) <= 300
                                ? '#ffd700'
                                : net < 0
                                  ? '#34d399'
                                  : '#ff6b35';
                            return (
                              <div
                                style={{
                                  marginTop: 8,
                                  paddingTop: 8,
                                  borderTop: '1px solid #3e3e5a',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                }}
                              >
                                <span style={{ fontSize: 9, color: '#7e7e9a' }}>
                                  Intake {day.cal} − burn ~{day.burn} (±15%)
                                </span>
                                <span
                                  style={{
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color: netColor,
                                  }}
                                >
                                  {net > 0 ? '+' : ''}
                                  {net}{' '}
                                  <span
                                    style={{ fontSize: 9, color: '#7e7e9a' }}
                                  >
                                    {Math.abs(net) <= 300
                                      ? '~maintenance'
                                      : net < 0
                                        ? 'deficit'
                                        : 'surplus'}
                                  </span>
                                </span>
                              </div>
                            );
                          })()}
                      </div>
                    );
                  })}
                <div
                  style={{
                    fontSize: 10,
                    color: '#7e7e9a',
                    lineHeight: 1.6,
                    borderTop: '1px solid #3e3e5a',
                    paddingTop: 10,
                  }}
                >
                  ✅{' '}
                  <span style={{ color: '#34d399' }}>
                    Expenditure confirmed:
                  </span>{' '}
                  Fitbit device data (2,650–4,050/day) matches the bottom-up
                  model (~3,140 avg) — two independent methods agree.
                  MacroFactor's 1,948 estimate is ~1,200 kcal low. Eat at
                  maintenance during calibration, then 0.3kg/week deficit
                  (~2,800/day avg). Protein 190g constant.
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: '#7e7e9a',
                    lineHeight: 1.6,
                    borderTop: '1px solid #3e3e5a',
                    paddingTop: 10,
                    marginTop: 2,
                  }}
                >
                  📅 <span style={{ color: '#00d4ff' }}>Tracking cadence:</span>{' '}
                  Daily CSVs through calibration (~to Jun 24) while baselines
                  set — RHR, HRV, sleep, TDEE, Z2 power. After that, switch CSV
                  export to week-view and share weekly (Sun review prompt set).
                  Daily detail is for calibration, not forever.
                </div>
              </div>

              <div
                style={{
                  fontSize: 9,
                  letterSpacing: 3,
                  color: '#7e7e9a',
                  marginBottom: 8,
                }}
              >
                RECENT SESSIONS
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  marginBottom: 16,
                }}
              >
                {loggedSessions.slice(0, 4).map((entry, i) => (
                  <LogEntry
                    key={`${entry.date}-${entry.label}-${i}`}
                    entry={entry}
                  />
                ))}
              </div>

              {/* Sequencing rules */}
              <div
                style={{
                  background: '#2a2a48',
                  border: '1px solid #4a4a68',
                  borderRadius: 6,
                  padding: '14px 16px',
                }}
              >
                <div
                  style={{
                    fontSize: 9,
                    letterSpacing: 3,
                    color: '#34d399',
                    marginBottom: 10,
                  }}
                >
                  SEQUENCING RULES
                </div>
                {[
                  ['✅', 'Upper strength + any erg session — same day fine'],
                  ['✅', 'Z2 erg AM → lower strength PM (6hr gap)'],
                  ['⚠️', 'Lower strength → Z2 erg next morning — OK'],
                  ['❌', 'Hard erg + lower strength — same day'],
                  ['❌', 'Hard erg + lower strength — adjacent days'],
                  ['❌', 'Leg accessories in upper sessions'],
                  [
                    '📝',
                    'Report sRPE (1–10) with every session — UT2 should feel 3–4, UT1 5–6',
                  ],
                  [
                    '🚴',
                    'Occasional bike ride = valid UT2 substitute (variability protects against overuse)',
                  ],
                ].map(([icon, rule]) => (
                  <div
                    key={rule}
                    style={{
                      display: 'flex',
                      gap: 10,
                      marginBottom: 6,
                      fontSize: 11,
                      color: '#aaaacc',
                      lineHeight: 1.5,
                    }}
                  >
                    <span style={{ flexShrink: 0 }}>{icon}</span>
                    <span>{rule}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── ERG VIEW ── */}
          {view === 'erg' && (
            <ErgView tsbNow={latest.tsb} ctlNow={latest.ctl} />
          )}

          {/* ── STRENGTH VIEW ── */}
          {view === 'strength' && (
            <>
              {/* Lift selector */}
              <div
                style={{
                  display: 'flex',
                  gap: 4,
                  flexWrap: 'wrap',
                  marginBottom: 12,
                }}
              >
                {Object.keys(strengthTrend).map((lift) => (
                  <button
                    key={lift}
                    onClick={() => setActiveLift(lift)}
                    style={{
                      background:
                        activeLift === lift
                          ? `${LIFT_COLOR[lift]}20`
                          : 'transparent',
                      border:
                        activeLift === lift
                          ? `1px solid ${LIFT_COLOR[lift]}`
                          : '1px solid #4a4a68',
                      color: activeLift === lift ? LIFT_COLOR[lift] : '#7e7e9a',
                      borderRadius: 4,
                      padding: '5px 10px',
                      fontSize: 9,
                      letterSpacing: 0.5,
                      cursor: 'pointer',
                      fontFamily: "'DM Mono',monospace",
                    }}
                  >
                    {lift}
                  </button>
                ))}
              </div>

              {/* e1RM chart */}
              <div
                style={{
                  background: '#2a2a48',
                  border: '1px solid #4a4a68',
                  borderRadius: 6,
                  padding: '14px 16px',
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    fontSize: 9,
                    letterSpacing: 3,
                    color: liftColor,
                    marginBottom: 12,
                  }}
                >
                  {activeLift.toUpperCase()} · e1RM (kg)
                </div>
                {strengthTrend[activeLift].length > 1 ? (
                  <ResponsiveContainer width="100%" height={140}>
                    <LineChart
                      data={strengthTrend[activeLift]}
                      margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                    >
                      <XAxis
                        dataKey="date"
                        tick={{
                          fontSize: 9,
                          fill: '#7e7e9a',
                          fontFamily: "'DM Mono',monospace",
                        }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        domain={['auto', 'auto']}
                        tick={{
                          fontSize: 9,
                          fill: '#7e7e9a',
                          fontFamily: "'DM Mono',monospace",
                        }}
                        tickFormatter={(v) => `${v}kg`}
                        axisLine={false}
                        tickLine={false}
                        width={42}
                      />
                      <Tooltip content={<StrengthTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="e1rm"
                        stroke={liftColor}
                        strokeWidth={2}
                        dot={{
                          r: 4,
                          fill: liftColor,
                          stroke: '#08080d',
                          strokeWidth: 1,
                        }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div
                    style={{
                      padding: '20px 0',
                      textAlign: 'center',
                      color: '#5a5a74',
                      fontSize: 11,
                    }}
                  >
                    One data point — chart builds as sessions are logged
                  </div>
                )}
                {/* Latest e1rm callout */}
                <div
                  style={{
                    marginTop: 10,
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 8,
                  }}
                >
                  <span
                    style={{ fontSize: 22, fontWeight: 700, color: liftColor }}
                  >
                    {strengthTrend[activeLift].slice(-1)[0].e1rm}kg
                  </span>
                  <span style={{ fontSize: 10, color: '#7e7e9a' }}>
                    current e1RM · {strengthTrend[activeLift].slice(-1)[0].date}
                  </span>
                  {strengthTrend[activeLift].length > 1 &&
                    (() => {
                      const first = strengthTrend[activeLift][0].e1rm;
                      const last = strengthTrend[activeLift].slice(-1)[0].e1rm;
                      const diff = (last - first).toFixed(1);
                      return (
                        <span style={{ fontSize: 10, color: '#34d399' }}>
                          +{diff}kg
                        </span>
                      );
                    })()}
                </div>
              </div>

              {/* Strength session list */}
              {/* Saved Templates */}
              <div
                style={{
                  background: '#2a2a48',
                  border: '1px solid #4a4a68',
                  borderRadius: 6,
                  padding: '14px 16px',
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    fontSize: 9,
                    letterSpacing: 3,
                    color: '#a78bfa',
                    marginBottom: 4,
                  }}
                >
                  SAVED TEMPLATES · FITBOD
                </div>
                <div
                  style={{
                    fontSize: 9,
                    color: '#6c6c88',
                    marginBottom: 12,
                    lineHeight: 1.5,
                  }}
                >
                  Fixed workouts, low variability. Stops auto-generation
                  inserting leg accessories or dropping pulls. Fitbod still
                  suggests load progression.
                </div>
                {STRENGTH_TEMPLATES.map((t) => (
                  <div
                    key={t.name}
                    style={{
                      marginBottom: 12,
                      paddingBottom: 12,
                      borderBottom: '1px solid #3e3e5a',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        marginBottom: 6,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: t.color,
                        }}
                      >
                        {t.name}
                      </span>
                      <span style={{ fontSize: 9, color: '#7e7e9a' }}>
                        {t.focus}
                      </span>
                    </div>
                    {t.exercises.map((ex, i) => (
                      <div
                        key={i}
                        style={{
                          fontSize: 11,
                          color: '#aaaacc',
                          lineHeight: 1.7,
                          paddingLeft: 4,
                        }}
                      >
                        · {ex}
                      </div>
                    ))}
                  </div>
                ))}
                <div
                  style={{
                    fontSize: 9,
                    color: '#6c6c88',
                    lineHeight: 1.5,
                    fontStyle: 'italic',
                  }}
                >
                  Weekly: Upper 1 + Lower 1 + Upper 2 + Lower 2. Pull:press bias
                  maintained across the week. Squat heavy on Lower 1,
                  explosive/light on Lower 2 (daily undulating).
                </div>
                <div
                  style={{
                    fontSize: 9,
                    color: '#f472b6',
                    lineHeight: 1.6,
                    marginTop: 8,
                    borderTop: '1px solid #3e3e5a',
                    paddingTop: 8,
                  }}
                >
                  💗 Prehab + Shoulder: {PREHAB_NOTE}
                </div>
              </div>

              <div
                style={{
                  fontSize: 9,
                  letterSpacing: 3,
                  color: '#7e7e9a',
                  marginBottom: 8,
                }}
              >
                STRENGTH SESSIONS
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {strengthSessions
                  .slice()
                  .reverse()
                  .map((entry, i) => (
                    <LogEntry key={i} entry={entry} />
                  ))}
              </div>
            </>
          )}

          {/* ── MOBILITY VIEW ── */}
          {view === 'mobility' && (
            <>
              <div
                style={{
                  background: 'linear-gradient(135deg,#a78bfa15,#1e1e30)',
                  border: '1px solid #a78bfa40',
                  borderLeft: '3px solid #a78bfa',
                  borderRadius: 6,
                  padding: '13px 16px',
                  marginBottom: 14,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#a78bfa',
                    marginBottom: 5,
                  }}
                >
                  🧘 MOBILITY — a training pillar
                </div>
                <div
                  style={{ fontSize: 11, color: '#aaaacc', lineHeight: 1.6 }}
                >
                  Not accessory work. With the left hamstring/glute rehab,
                  mobility is load-bearing for staying healthy enough to train.
                  The pre-session prime especially — it's rehab activation
                  disguised as a warm-up.
                </div>
              </div>

              {/* Routines library */}
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: 3,
                  color: '#a78bfa',
                  marginBottom: 8,
                }}
              >
                ROUTINES · ON HAND
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  marginBottom: 18,
                }}
              >
                {MOBILITY_ROUTINES.map((r, i) => {
                  const isOpen = mobOpen === r.id;
                  return (
                    <div
                      key={r.id}
                      style={{
                        background: isOpen ? `${r.color}10` : '#2a2a48',
                        border: `1px solid ${isOpen ? r.color + '50' : '#4a4a68'}`,
                        borderLeft: `3px solid ${r.color}`,
                        borderRadius: 6,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        onClick={() => setMobOpen(isOpen ? null : r.id)}
                        style={{
                          padding: '12px 14px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 11,
                          }}
                        >
                          <span style={{ fontSize: 16 }}>{r.icon}</span>
                          <div>
                            <div
                              style={{
                                fontSize: 13,
                                fontWeight: 700,
                                color: '#fff',
                              }}
                            >
                              {r.name}
                            </div>
                            <div
                              style={{
                                fontSize: 9,
                                color: '#7e7e9a',
                                marginTop: 1,
                              }}
                            >
                              {r.when}
                            </div>
                          </div>
                        </div>
                        <span style={{ fontSize: 10, color: '#7e7e9a' }}>
                          {isOpen ? '▲' : '▼'}
                        </span>
                      </div>
                      {isOpen && (
                        <div style={{ padding: '0 14px 14px' }}>
                          <div
                            style={{
                              fontSize: 10,
                              color: '#888',
                              lineHeight: 1.6,
                              marginBottom: 10,
                              fontStyle: 'italic',
                            }}
                          >
                            {r.why}
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 6,
                              marginBottom: 10,
                            }}
                          >
                            {r.blocks.map((b, j) => (
                              <div
                                key={j}
                                style={{
                                  background: '#08080d',
                                  borderRadius: 5,
                                  padding: '9px 11px',
                                  borderLeft: b.rehab
                                    ? '2px solid #34d399'
                                    : '2px solid transparent',
                                }}
                              >
                                <div
                                  style={{
                                    display: 'flex',
                                    gap: 8,
                                    alignItems: 'baseline',
                                    marginBottom: 3,
                                  }}
                                >
                                  <span
                                    style={{
                                      color: r.color,
                                      flexShrink: 0,
                                      fontSize: 11,
                                      fontWeight: 700,
                                    }}
                                  >
                                    {j + 1}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: 11,
                                      color: '#e8e8f0',
                                      fontWeight: 600,
                                    }}
                                  >
                                    {b.move}
                                    {b.rehab && (
                                      <span
                                        style={{
                                          color: '#34d399',
                                          fontSize: 9,
                                          fontWeight: 700,
                                        }}
                                      >
                                        {' '}
                                        · REHAB
                                      </span>
                                    )}
                                  </span>
                                </div>
                                <div
                                  style={{
                                    fontSize: 10,
                                    color: '#888',
                                    lineHeight: 1.6,
                                    paddingLeft: 19,
                                  }}
                                >
                                  {b.visual}
                                </div>
                              </div>
                            ))}
                          </div>
                          <div
                            style={{
                              background: '#08080d',
                              borderLeft: `2px solid ${r.color}`,
                              borderRadius: 4,
                              padding: '9px 11px',
                              fontSize: 10,
                              color: '#aaaacc',
                              lineHeight: 1.6,
                            }}
                          >
                            📋 {r.note}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Tracking log */}
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: 3,
                  color: '#a78bfa',
                  marginBottom: 8,
                }}
              >
                RECENT · TRACKED
              </div>
              <div
                style={{
                  background: '#1e1e30',
                  border: '1px solid #a78bfa30',
                  borderLeft: '3px solid #a78bfa',
                  borderRadius: 6,
                  padding: '10px 13px',
                  marginBottom: 10,
                  fontSize: 10,
                  color: '#888',
                  lineHeight: 1.6,
                }}
              >
                {MOBILITY_STREAK_NOTE}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {mobilityLog.map((m, i) => {
                  const r = MOBILITY_ROUTINES.find((x) => x.id === m.type);
                  const col = r ? r.color : '#888';
                  return (
                    <div
                      key={i}
                      style={{
                        background: '#2a2a48',
                        border: '1px solid #4a4a68',
                        borderLeft: `3px solid ${col}`,
                        borderRadius: 6,
                        padding: '11px 14px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: 4,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 9,
                          }}
                        >
                          <span style={{ fontSize: 14 }}>
                            {r ? r.icon : '•'}
                          </span>
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: '#fff',
                            }}
                          >
                            {m.label}
                          </div>
                        </div>
                        <div style={{ fontSize: 10, color: '#7e7e9a' }}>
                          {m.date} · {m.duration}
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: '#aaaacc',
                          lineHeight: 1.5,
                          paddingLeft: 23,
                        }}
                      >
                        {m.note}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div
                style={{
                  marginTop: 12,
                  background: '#1e1e30',
                  border: '1px solid #4a4a68',
                  borderRadius: 6,
                  padding: '11px 14px',
                  fontSize: 10,
                  color: '#7e7e9a',
                  textAlign: 'center',
                  lineHeight: 1.6,
                }}
              >
                Report mobility sessions in chat to log them here. Pre-session
                prime + foam roll + yoga all count.
              </div>
            </>
          )}

          {/* ── RECOVERY VIEW ── */}
          {view === 'recovery' && (
            <RecoveryView latest={latest} isWide={isWide} />
          )}

          {/* ── LOG VIEW ── */}
          {view === 'log' && (
            <>
              <div
                style={{
                  background: '#2a2a48',
                  border: '1px solid #4a4a68',
                  borderLeft: '3px solid #ffd700',
                  borderRadius: 6,
                  padding: '11px 14px',
                  marginBottom: 14,
                  fontSize: 11,
                  color: '#aaaacc',
                  lineHeight: 1.6,
                }}
              >
                <span style={{ color: '#ffd700', fontWeight: 700 }}>
                  SESSION LOG:{' '}
                </span>
                Share Concept2 links or Fitbod screenshots to add sessions. sRPE
                captured every session.
              </div>

              {/* Interactive log form — writes to the database */}
              <LogSessionForm onSaved={fetchSessions} />

              {/* sRPE scale reference */}
              <div
                style={{
                  background: '#2a2a48',
                  border: '1px solid #4a4a68',
                  borderLeft: '3px solid #ff6b35',
                  borderRadius: 6,
                  padding: '12px 14px',
                  marginBottom: 14,
                }}
              >
                <div
                  style={{
                    fontSize: 9,
                    letterSpacing: 2,
                    color: '#ff6b35',
                    marginBottom: 8,
                  }}
                >
                  sRPE SCALE · TALK-TEST ANCHORED (asked every session)
                </div>
                {SRPE_GUIDE.map((s, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      gap: 10,
                      marginBottom: 6,
                      alignItems: 'baseline',
                    }}
                  >
                    <span
                      style={{
                        flexShrink: 0,
                        width: 30,
                        fontSize: 12,
                        fontWeight: 700,
                        color: s.color,
                      }}
                    >
                      {s.range}
                    </span>
                    <div style={{ flex: 1 }}>
                      <span
                        style={{
                          fontSize: 11,
                          color: '#e8e8f0',
                          fontWeight: 600,
                        }}
                      >
                        {s.label}
                      </span>
                      <span
                        style={{ fontSize: 10, color: '#888', marginLeft: 6 }}
                      >
                        — {s.anchor}
                      </span>
                    </div>
                  </div>
                ))}
                <div
                  style={{
                    fontSize: 8,
                    color: '#7e7e9a',
                    lineHeight: 1.5,
                    marginTop: 6,
                    fontStyle: 'italic',
                  }}
                >
                  Over-rating easy work is the common error — anchor to the talk
                  test. TRIANGULATION: sRPE (felt) + Strava RE (HR-dist) +
                  watts/HR (output) cross-checked every session. All agree =
                  confidence; diverge = early fatigue/stress signal.
                </div>
              </div>
              <div
                style={{
                  display: isWide ? 'grid' : 'flex',
                  gridTemplateColumns: isWide ? '1fr 1fr' : undefined,
                  flexDirection: 'column',
                  gap: 6,
                  alignItems: isWide ? 'start' : undefined,
                }}
              >
                {loggedSessions.map((entry, i) => (
                  <LogEntry
                    key={`${entry.date}-${entry.label}-${i}`}
                    entry={entry}
                  />
                ))}
              </div>
            </>
          )}

          {/* ── JOURNAL VIEW (longitudinal spine) ── */}
          {view === 'journal' && <JournalView />}
          {/* ── COACH VIEW (Claude fitness coach chat) ── */}
          {view === 'coach' && <CoachView />}
        </ErrorBoundary>

        <div
          style={{
            marginTop: 16,
            padding: '12px 16px',
            background: '#1e1e30',
            border: '1px solid #4a4a68',
            borderRadius: 6,
            fontSize: 10,
            color: '#5a5a74',
            textAlign: 'center',
            lineHeight: 1.7,
          }}
        >
          Tap any session to expand · Share Concept2 links or Fitbod screenshots
          to log sessions
        </div>
      </div>
    </div>
  );
}
