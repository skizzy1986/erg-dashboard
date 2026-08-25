import { RHR_DEFAULT, HRV_DEFAULT } from './recoveryAnalytics.js';
import { THEME } from '../constants/theme.js';

// ── ADAPTIVE DECISION ENGINE ──────────────────────────────────
// The coaching brain: reads current recovery/load data, fires rules
// (R3–R5), cross-checks plan vs. body, and fuses everything into one
// autoregulation signal + a daily readiness score.

// `baselines` comes from computePersonalBaselines (a rolling trimmed mean of the
// last 28 days). It used to read two static constants, so the rule compared
// today against a number hand-set in June rather than against the athlete.
export function evaluateRules(recovery, recentSrpe, tsb, baselines = {}) {
  const rhrBaseline = baselines.rhrBaseline ?? RHR_DEFAULT;
  const hrvBaseline = baselines.hrvBaseline ?? HRV_DEFAULT;
  const flags = [];
  if (!recovery) return flags;
  if (
    recovery.hrv != null &&
    recovery.hrv < hrvBaseline &&
    recovery.rhr > rhrBaseline
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
    color = THEME.critical;
    guidance =
      "Ease or swap to recovery. The body's signalling fatigue louder than the plan. Quality work won't land well today.";
  } else if (
    (tsb != null && tsb < -10) ||
    (readiness && readiness.score != null && readiness.score < 75) ||
    firedRules.some((f) => f.id === 'R5')
  ) {
    signal = 'AMBER';
    color = THEME.caution;
    guidance =
      "Proceed, but hold the easy end genuinely easy. Don't add intensity. Keep quality sessions controlled, not maximal.";
  } else {
    signal = 'GREEN';
    color = THEME.positive;
    guidance =
      "Clear to train as planned. Form and recovery support it — if it's a quality day, you can commit to it.";
  }
  return { signal, color, guidance };
}
