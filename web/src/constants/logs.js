import { THEME } from './theme.js';
// Static reference data only. Athlete records — decisions, hypotheses, BP
// readings, intake, mobility sessions, injuries — live in Supabase (coach_log,
// bp_readings, vitals, sessions, anchors), never in git.

// ── RULE-FIRING HISTORY — for trend detection ─────────────────
export const RULE_FIRING_HISTORY = [
  { date: '6/9', fired: ['R5'] },
  { date: '6/10', fired: ['R3', 'R4'] },
  { date: '6/11', fired: ['R4'] },
  { date: '6/12', fired: [] },
  { date: '6/13', fired: [] },
];

// ── LIPID PANEL REFERENCE ─────────────────────────────────────
export const LIPID_REF = [
  {
    marker: 'Total Cholesterol',
    unit: 'mmol/L',
    target: '< 5.5',
    color: THEME.accent,
  },
  {
    marker: "LDL ('bad')",
    unit: 'mmol/L',
    target: '< 2.0',
    color: THEME.warning,
  },
  {
    marker: "HDL ('good')",
    unit: 'mmol/L',
    target: '> 1.0',
    color: THEME.positive,
  },
  {
    marker: 'Triglycerides',
    unit: 'mmol/L',
    target: '< 1.7',
    color: THEME.caution,
  },
];

// ── HORMONE PANEL (reference) ─────────────────────────────────
// Generic markers only. Request via a GP; interpretation is a clinician's call.
export const HORMONE_REF = [
  {
    marker: 'Total Testosterone',
    note: 'Core marker. Morning draw essential — peaks early AM.',
  },
  {
    marker: 'Free Testosterone',
    note: "The bioavailable fraction — what's actually usable.",
  },
  { marker: 'SHBG', note: 'Binds testosterone; affects free levels.' },
  {
    marker: 'LH / FSH',
    note: 'Pituitary signals — locate where any issue sits (primary vs central).',
  },
  {
    marker: 'Oestradiol',
    note: 'If indicated. Balance matters, not just testosterone.',
  },
];
