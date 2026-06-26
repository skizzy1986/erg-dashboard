const RHR_DEFAULT = 57;
const HRV_DEFAULT = 30;
const SLEEP_TARGET = 7;

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
  return {
    rhrBaseline:
      rhrVals.length >= minSamples
        ? Math.round(trimmedMean(rhrVals) * 10) / 10
        : RHR_DEFAULT,
    hrvBaseline:
      hrvVals.length >= minSamples
        ? Math.round(trimmedMean(hrvVals) * 10) / 10
        : HRV_DEFAULT,
    sleepTarget: SLEEP_TARGET,
  };
}

export function computeReadiness(latest, baselines = {}) {
  const rhrBaseline = baselines.rhrBaseline ?? RHR_DEFAULT;
  const hrvBaseline = baselines.hrvBaseline ?? HRV_DEFAULT;
  const sleepTarget = baselines.sleepTarget ?? SLEEP_TARGET;
  if (!latest) return { readinessScore: 0, readinessLabel: 'FATIGUED' };
  let score = 100;
  if (latest.rhr != null) score -= Math.max(0, latest.rhr - rhrBaseline) * 4;
  if (latest.hrv != null) score -= Math.max(0, hrvBaseline - latest.hrv) * 1.5;
  if (latest.sleep != null)
    score -= latest.sleep < sleepTarget ? (sleepTarget - latest.sleep) * 8 : 0;
  const readinessScore = Math.round(Math.min(100, Math.max(0, score)));
  const readinessLabel =
    readinessScore >= 80
      ? 'READY'
      : readinessScore >= 60
        ? 'CAUTION'
        : 'FATIGUED';
  return { readinessScore, readinessLabel };
}

export function computeReadinessHistory(rows, baselines = {}) {
  return (rows ?? [])
    .slice(0, 14)
    .reverse()
    .map((row) => ({
      date: row.date ? row.date.slice(5).replace('-', '/') : '',
      readinessScore: computeReadiness(row, baselines).readinessScore,
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
