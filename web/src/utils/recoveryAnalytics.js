import { THEME } from '../constants/theme.js';
// Population fallbacks, used only until 14 days of personal data exist. Exported
// because evaluateRules needs the same numbers and must not keep a second copy.
export const RHR_DEFAULT = 57;
export const HRV_DEFAULT = 30;
export const SLEEP_TARGET = 7;

function trimmedMean(values, fraction = 0.1) {
  const sorted = [...values].sort((a, b) => a - b);
  const n = Math.max(1, Math.floor(sorted.length * fraction));
  const trimmed = sorted.slice(n, sorted.length - n);
  const source = trimmed.length ? trimmed : sorted;
  return source.reduce((s, v) => s + v, 0) / source.length;
}

export function computePersonalBaselines(rows, minSamples = 14) {
  const recent = (rows ?? []).slice(0, 28);
  const rhrVals = recent.filter((r) => r.rhr != null).map((r) => Number(r.rhr));
  const hrvVals = recent.filter((r) => r.hrv != null).map((r) => Number(r.hrv));
  // Reported per metric, not once for the set. RHR and HRV are captured by
  // different sensors and their coverage differs a lot in practice (17 of the
  // last 30 days carry RHR, 6 carry HRV), so a single hasPersonalBaselines flag
  // would let a view label the population default as "your avg".
  const rhrPersonal = rhrVals.length >= minSamples;
  const hrvPersonal = hrvVals.length >= minSamples;
  return {
    rhrBaseline: rhrPersonal
      ? Math.round(trimmedMean(rhrVals) * 10) / 10
      : RHR_DEFAULT,
    hrvBaseline: hrvPersonal
      ? Math.round(trimmedMean(hrvVals) * 10) / 10
      : HRV_DEFAULT,
    sleepTarget: SLEEP_TARGET,
    rhrPersonal,
    hrvPersonal,
  };
}

// The single readiness definition for the whole app. Was forked in two: this
// one (live rolling baselines, no TSB term) and calcReadiness in analysis.js
// (static baselines, TSB term, explicit NO DATA). They gave different answers
// for the same day, and the brief's Today hero is a readiness score — so the
// fork had to close before S4. This is the merge: live baselines from here, the
// TSB term and the NO DATA guard from there.
//
// Deductions off a 100 ceiling: RHR above baseline, HRV below it, sleep debt,
// and deep TSB fatigue. `tsb` is optional — callers without a load reading pass
// nothing and simply lose that term.
export function computeReadiness(latest, baselines = {}, tsb = null) {
  const rhrBaseline = baselines.rhrBaseline ?? RHR_DEFAULT;
  const hrvBaseline = baselines.hrvBaseline ?? HRV_DEFAULT;
  const sleepTarget = baselines.sleepTarget ?? SLEEP_TARGET;

  // Without an RHR there is nothing to score. Previously a missing row scored 0
  // FATIGUED and an all-null row scored 100 READY — a fabricated verdict in
  // either direction, and the 0 defeated CoachView's `!= null` guard so it
  // reached the Coach prompt as fact. Absent data is reported as absent.
  if (!latest || typeof latest.rhr !== 'number') {
    return {
      score: null,
      status: 'NO DATA',
      color: THEME.muted,
      partial: true,
    };
  }

  let score = 100;
  score -= Math.max(0, latest.rhr - rhrBaseline) * 4;
  if (latest.hrv != null) score -= Math.max(0, hrvBaseline - latest.hrv) * 1.5;
  if (latest.sleep != null && latest.sleep < sleepTarget)
    score -= (sleepTarget - latest.sleep) * 8;
  // Only meaningful since the load unit became classic TSS (#208); on the old
  // sRPE-hours scale TSB never got near -20 and this could not fire.
  if (tsb != null && tsb < -20) score -= (Math.abs(tsb) - 20) * 0.8;

  score = Math.round(Math.min(100, Math.max(0, score)));
  const status = score >= 80 ? 'READY' : score >= 60 ? 'CAUTION' : 'FATIGUED';
  const color =
    score >= 80 ? THEME.positive : score >= 60 ? THEME.caution : THEME.critical;
  // Scored on what was present — surfaced so a view can say so.
  const partial = latest.hrv == null || latest.sleep == null;
  return { score, status, color, partial };
}

export function computeReadinessHistory(rows, baselines = {}) {
  return (rows ?? [])
    .slice(0, 14)
    .reverse()
    .map((row) => ({
      date: row.date ? row.date.slice(5).replace('-', '/') : '',
      readinessScore: computeReadiness(row, baselines).score,
    }));
}

export function joinVitalsTsb(vitalsRows, loadData) {
  const tsbByDate = {};
  (loadData ?? []).forEach((d) => {
    tsbByDate[d.date] = d.tsb;
  });
  return (vitalsRows ?? [])
    .slice(0, 28)
    .reverse()
    .map((row) => {
      const chartDate = row.date ? row.date.slice(5).replace('-', '/') : '';
      return {
        date: chartDate,
        hrv: row.hrv ?? null,
        tsb: tsbByDate[chartDate] ?? null,
      };
    })
    .filter((d) => d.hrv != null && d.tsb != null);
}
