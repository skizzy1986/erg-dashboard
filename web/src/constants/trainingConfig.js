// Training science constants — update after CP test (1 Jul) or athlete baseline changes.

import { wattsToPace500 } from '../utils/pace.js';

export const SRPE_GUIDE = [
  {
    range: '1-2',
    label: 'Very easy',
    anchor: 'Could do all day. Full conversation, nose-breathing.',
    zone: 'Recovery',
    color: '#3a3a4a',
  },
  {
    range: '3-4',
    label: 'Easy (UT2)',
    anchor: 'Full conversation = 3. Comfortable, sustainable for hours.',
    zone: 'UT2',
    color: '#00d4ff',
  },
  {
    range: '5-6',
    label: 'Steady (UT1)',
    anchor:
      'Talking in sentences but aware of breathing. Working but controlled.',
    zone: 'UT1',
    color: '#34d399',
  },
  {
    range: '7-8',
    label: 'Hard (threshold)',
    anchor: 'Short phrases only. Genuinely taxing. Threshold/AT.',
    zone: 'AT/TR',
    color: '#ffd700',
  },
  {
    range: '9-10',
    label: 'Max',
    anchor: 'Words impossible. All-out. Race/test efforts only.',
    zone: 'Sprint',
    color: '#ff2d55',
  },
];

export const CALIBRATION_STATUS = [
  {
    metric: 'Power @ HR130',
    tier: 1,
    conf: 'Solid',
    color: '#34d399',
    basis: 'Chest strap, fixed DF, drag-independent',
    upgrade:
      'Log conditions (caffeine/cannabis/heat) for like-for-like — shift HR-power 3–8W',
  },
  {
    metric: 'RHR baseline (58)',
    tier: 1,
    conf: 'Solid',
    color: '#34d399',
    basis: '3 consecutive overnight readings',
    upgrade: '—',
  },
  {
    metric: 'Session data (W/pace/rate)',
    tier: 1,
    conf: 'Solid',
    color: '#34d399',
    basis: 'PM5 + strap + standardised DF125 + separate warmup',
    upgrade: '—',
  },
  {
    metric: 'Strava cross-check',
    tier: 1,
    conf: 'Independent 2nd source',
    color: '#34d399',
    basis:
      'Auto-syncs every erg session. Independent HR/watts + Relative Effort metric',
    upgrade:
      'Triangulates PM5 data — 6/13 showed HR 130.6 (Strava) vs 134 (C2), watts agreed 149/150',
  },
  {
    metric: 'TDEE (~3,140)',
    tier: 2,
    conf: 'Estimated',
    color: '#ffd700',
    basis: 'Two methods agree, both estimates',
    upgrade: 'Intake-vs-weight regression at end of calibration (~Jun 24)',
  },
  {
    metric: 'TSS / CTL / ATL / TSB',
    tier: 2,
    conf: 'Estimated',
    color: '#ffd700',
    basis:
      'CP/FTP est. 190W (untested), strength TSS ±30%, CTL needs 42d (have ~3wk)',
    upgrade: '4-min CP test (1 Jul) → real anchor recalibrates everything',
  },
  {
    metric: 'Daily net calories',
    tier: 2,
    conf: '±300 resolution',
    color: '#ffd700',
    basis: "Fitbit burn ±10–20% — don't judge ±100 swings",
    upgrade: 'Weekly avg vs weight trend, not daily',
  },
  {
    metric: 'HR zones (MHR 170)',
    tier: 2,
    conf: 'Conservative',
    color: '#ffd700',
    basis: 'Chosen 170 vs observed max 177–187 — deliberate for base',
    upgrade: 'Revisit before Build 1 — race-pace needs true-max anchoring',
  },
  {
    metric: 'HRV baseline (30)',
    tier: 3,
    conf: 'Fragile',
    color: '#ff6b35',
    basis: '2 readings, both in a fatigue trough — skewed LOW',
    upgrade: 'Rebuild over 10+ days incl. recovered days',
  },
  {
    metric: 'Readiness score',
    tier: 3,
    conf: 'Heuristic',
    color: '#ff6b35',
    basis: 'My weightings, not validated coefficients',
    upgrade: 'Cross-check with sRPE — no binary calls off the number',
  },
  {
    metric: '165–180W projection',
    tier: 3,
    conf: 'Hypothesis',
    color: '#ff6b35',
    basis: '3 points / 1 week, some gain is setup-settling',
    upgrade: 'End-of-base 5k benchmark replaces it',
  },
  {
    metric: '2k estimate (7:30–45)',
    tier: 3,
    conf: 'Unknown',
    color: '#ff6b35',
    basis: 'Zero threshold/anaerobic data yet',
    upgrade: 'First real test — ±20sec either way',
  },
];

export const CRITICAL_POWER = {
  cpEstimate: 190, // W — provisional (= current FTP placeholder). 30min test confirms.
  wPrime: null, // J — anaerobic reserve. Needs a short max effort (1-min) to model.
  northStar: '2k pace', // rowing's true benchmark — race-pace zones key off this
  status:
    'Awaiting test efforts — CP confirmed by 30min test, curve by format-specific maxes',
};

export const POWER_DURATION = [
  {
    format: '1-min',
    dur: '~60s',
    system: 'Anaerobic / sprint power',
    predW: '~330–380',
    actualW: null,
    feeds: "W' (anaerobic reserve)",
  },
  {
    format: '1000m',
    dur: '~3.3min',
    system: 'Anaerobic capacity + VO₂',
    predW: '~240–270',
    actualW: null,
    feeds: 'VO₂ / above-CP power',
  },
  {
    format: '2000m',
    dur: '~7.3min',
    system: 'VO₂max — the benchmark',
    predW: '~205–225',
    actualW: null,
    feeds: 'north-star reference',
  },
  {
    format: '5000m',
    dur: '~18min',
    system: 'Threshold / aerobic power',
    predW: '~185–200',
    actualW: null,
    feeds: '≈ Critical Power anchor',
  },
  {
    format: '30-min',
    dur: '30min',
    system: 'Critical Power test',
    predW: '~180–190',
    actualW: null,
    feeds: 'CP directly (~95% of 30min avg)',
  },
];

export const FTP_TEST = {
  when: '~2 weeks out — fresh day, ideal post-FIFO return (~Jun 24+)',
  protocol:
    '30min continuous at the hardest STEADY pace you can hold the full 30 (not a sprint). CP ≈ 95% of the 30min avg power. This is a Critical Power test in rowing terms. Or 4×8min progressive steps to map HR-power.',
  prereq:
    'Fresh, well-fuelled, chest strap, DF125, separate warmup, no caffeine/cannabis that morning.',
  unlocks:
    "Real CP → recalibrates load model (TSS/CTL/ATL/TSB), confirms zones, anchors the projection. Later format maxes (1-min, 1k, 5k) map the full power-duration curve and W'.",
};

export const HR_ZONES = [
  {
    zone: 'UT2',
    name: 'Aerobic Base',
    pct: '< 70%',
    bpm: '< 119',
    lactate: '< 2 mmol/L',
    color: '#00d4ff',
    desc: 'Long Z2 rows. Conversational. Fat metabolism. Primary base building zone.',
  },
  {
    zone: 'UT1',
    name: 'Aerobic Dev.',
    pct: '70–80%',
    bpm: '119–136',
    lactate: '2–3 mmol/L',
    color: '#34d399',
    desc: 'Upper aerobic. Sustainable for 45–60min. Z2 working target. Keep splits flat within this band.',
  },
  {
    zone: 'AT',
    name: 'Threshold',
    pct: '80–87%',
    bpm: '136–148',
    lactate: '3–5 mmol/L',
    color: '#ffd700',
    desc: 'Lactate threshold. Grey zone for base phase — avoid. Threshold reps added in Phase 2.',
  },
  {
    zone: 'TR',
    name: 'VO₂ / Transport',
    pct: '87–92%',
    bpm: '148–156',
    lactate: '5–8 mmol/L',
    color: '#ff6b35',
    desc: 'VO₂max zone. Short intervals (500m pieces). Phase 3 only.',
  },
  {
    zone: 'AN',
    name: 'Anaerobic',
    pct: '> 92%',
    bpm: '> 156',
    lactate: '> 8 mmol/L',
    color: '#ff2d55',
    desc: 'Race pace. 2k test finish. Not trained directly — emerges from race effort.',
  },
];

export const EST_MHR = 170; // Working training MHR — conservative calibration. True max may be higher (~177–187 observed) but 170 used as training ceiling for zone discipline during base phase.

export const SRPE_SCALE =
  'Rate each session 1–10 within 30min of finishing: 1–2 very easy · 3–4 easy (UT2 target) · 5–6 moderate (UT1 target) · 7–8 hard (threshold, Phase 2) · 9–10 maximal (race/test only). UT2 sessions scoring 5+ = going too hard. UT1 scoring 7+ = drifting. Trend matters: same session scoring harder week-on-week = fatigue accumulating, flag it.';

export const DAILY_TSS = [
  { date: '2026-05-22', tss: 14, note: '5k erg' },
  { date: '2026-05-24', tss: 15, note: '5k erg' },
  { date: '2026-05-25', tss: 55, note: '10k erg (hard push)' },
  { date: '2026-05-31', tss: 40, note: 'Upper strength' },
  { date: '2026-06-03', tss: 55, note: 'Combined strength' },
  { date: '2026-06-04', tss: 89, note: '10k erg + upper strength' },
  { date: '2026-06-05', tss: 121, note: '10k baseline + lower strength' },
  { date: '2026-06-06', tss: 35, note: '10k easy' },
  { date: '2026-06-07', tss: 50, note: 'Upper strength' },
  { date: '2026-06-08', tss: 100, note: '60min row + upper strength' },
  { date: '2026-06-09', tss: 87, note: '30min row + lower strength' },
  { date: '2026-06-10', tss: 98, note: '45min Z2 + Upper Day 2 (sRPE 8)' },
  {
    date: '2026-06-12',
    tss: 103,
    note: '45min UT1 + Lower Day 2 (both sRPE 6)',
  },
  {
    date: '2026-06-13',
    tss: 75,
    note: '60min UT1 long row (sRPE 6 — first full hour)',
  },
];

export const RHR_BASELINE = 57; // bpm — quietly trending DOWN 58→56 across the week (good)
export const HRV_BASELINE = 30; // ms  — sheet-accurate; trough 18 (6/12) → peak 37 (6/17) → 31 now

export const HR130_POWER = [
  // actual readings (HR-anchored sessions, chest strap)
  { date: '6/8', watts: 130, type: 'actual', setupArtifact: true }, // 60min, HR avg 123 — partly drag/strap settling, excluded from the fit
  { date: '6/10', watts: 145, type: 'actual' }, // 45min, HR 132
  { date: '6/12', watts: 151, type: 'actual' }, // 45min, HR 130 — clean anchor reading
  { date: '6/13', watts: 149, type: 'actual' }, // 60min, Strava-confirmed HR 130.6 — clean anchor
  { date: '6/15', watts: 149, type: 'actual' }, // 60min, HR130 locked all hour — clean anchor, on 5h24m sleep
];

const ZONE_POWER_PCT = [
  { zone: 'Recovery', pctLow: 0, pctHigh: 0.55 },
  { zone: 'UT2', pctLow: 0.55, pctHigh: 0.7 },
  { zone: 'UT1', pctLow: 0.7, pctHigh: 0.8 },
  { zone: 'AT', pctLow: 0.8, pctHigh: 0.9 },
  { zone: 'TR', pctLow: 0.9, pctHigh: 1.05 },
  { zone: 'AN', pctLow: 1.05, pctHigh: 1.3 },
];

export const PACE_ZONES = ZONE_POWER_PCT.map(({ zone, pctLow, pctHigh }) => {
  const cp = CRITICAL_POWER.cpEstimate;
  const hz = HR_ZONES.find((z) => z.zone === zone);
  const wattsLow = Math.round(cp * pctLow);
  const wattsHigh = Math.round(cp * pctHigh);
  return {
    zone,
    color: hz?.color ?? '#666',
    wattsLow,
    wattsHigh,
    paceFloor: pctHigh > 0 ? wattsToPace500(wattsHigh) : 300,
    paceCeil: pctLow > 0 ? wattsToPace500(wattsLow) : 300,
  };
});
