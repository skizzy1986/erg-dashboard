import { RHR_BASELINE, HRV_BASELINE } from '../constants/trainingConfig.js';

// ── ADAPTIVE DECISION ENGINE ──────────────────────────────────
// The coaching brain: reads current recovery/load data, fires rules
// (R3–R5), cross-checks plan vs. body, and fuses everything into one
// autoregulation signal + a daily readiness score.

export function evaluateRules(recovery, recentSrpe, tsb) {
  const flags = [];
  if (!recovery) return flags;
  if (
    recovery.hrv != null &&
    recovery.hrv < HRV_BASELINE &&
    recovery.rhr > RHR_BASELINE
  ) {
    flags.push({
      id: 'R4',
      msg: 'HRV below baseline + RHR up — under-recovered. Soften next hard session.',
    });
  }
  if (recovery.sleep != null && recovery.sleep < 7) {
    flags.push({
      id: 'R5',
      msg: `Sleep ${recovery.sleep}h < 7h target. Protect bedtime tonight.`,
    });
  }
  if (recentSrpe != null && recentSrpe >= 7) {
    flags.push({
      id: 'R3',
      msg: `Last session sRPE ${recentSrpe} — above easy/aerobic target. Watch for a trend.`,
    });
  }
  if (tsb != null && tsb < -25) {
    flags.push({
      id: 'R4',
      msg: `TSB ${tsb} — meaningfully fatigued. Favour recovery.`,
    });
  }
  return flags;
}

// Consistency check — flags when the engine advises recovery but plan is hard.
export function checkConsistency(firedRules, plannedIsHard) {
  const recoveryFired = firedRules.some((f) => f.id === 'R4');
  if (recoveryFired && plannedIsHard) {
    return {
      conflict: true,
      msg: '⚠️ Engine flags under-recovery (R4) but a hard session is planned. Reconcile — favour the body.',
    };
  }
  return { conflict: false };
}

// ── AUTOREGULATION — TSB + readiness + rules → daily signal ───
// TrainingPeaks-style: fuse form (TSB), recovery (readiness), and
// fired rules into one GREEN/AMBER/RED call on today's session.
// Caveat: TSB rests on estimated CP until the test — direction is
// meaningful, absolute is soft. Readiness/sRPE cross-check it.
export function autoregulate(tsb, readiness, firedRules) {
  const hardFlag = firedRules.some((f) => f.id === 'R4');
  let signal, color, guidance;

  if (
    hardFlag ||
    (tsb != null && tsb < -25) ||
    (readiness && readiness.score != null && readiness.score < 50)
  ) {
    signal = 'RED';
    color = '#ff2d55';
    guidance =
      "Ease or swap to recovery. The body's signalling fatigue louder than the plan. Quality work won't land well today.";
  } else if (
    (tsb != null && tsb < -10) ||
    (readiness && readiness.score != null && readiness.score < 75) ||
    firedRules.some((f) => f.id === 'R5')
  ) {
    signal = 'AMBER';
    color = '#ffd700';
    guidance =
      "Proceed, but hold the easy end genuinely easy. Don't add intensity. Keep quality sessions controlled, not maximal.";
  } else {
    signal = 'GREEN';
    color = '#34d399';
    guidance =
      "Clear to train as planned. Form and recovery support it — if it's a quality day, you can commit to it.";
  }
  return { signal, color, guidance };
}

// ── DAILY READINESS — RHR/HRV/sleep/TSB → 0-100 score ─────────
// Deductions off a 100 ceiling: elevated RHR and suppressed HRV vs.
// baseline, sleep debt, and deep TSB fatigue. Null HRV/sleep mark the
// score partial (computed on what's present) rather than blocking it.
export function calcReadiness(day, tsb) {
  if (!day || typeof day.rhr !== 'number') {
    return { score: null, status: 'NO DATA', color: '#888', partial: true };
  }
  let score = 100;
  const rhrDelta = day.rhr - RHR_BASELINE;
  if (rhrDelta > 0) score -= rhrDelta * 4;
  if (day.hrv != null) {
    const hrvDelta = HRV_BASELINE - day.hrv;
    if (hrvDelta > 0) score -= hrvDelta * 1.5;
  }
  if (day.sleep != null && day.sleep < 7) score -= (7 - day.sleep) * 8;
  if (tsb < -20) score -= (Math.abs(tsb) - 20) * 0.8;
  score = Math.max(0, Math.min(100, Math.round(score)));
  const status = score >= 75 ? 'READY' : score >= 50 ? 'CAUTION' : 'REST';
  const color = score >= 75 ? '#34d399' : score >= 50 ? '#ffd700' : '#ff2d55';
  const partial = day.hrv == null || day.sleep == null;
  return { score, status, color, partial };
}
