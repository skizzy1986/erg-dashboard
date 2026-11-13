import { mean, sampleStdDev } from './stats.js';
import { toISODate } from './dateFormat.js';

export const MIN_TREND_POINTS = 3;

const DAY_MS = 86400000;

const chronological = (rows) =>
  rows
    .map((s) => ({ s, iso: toISODate(s.date) }))
    .filter(({ iso }) => iso !== '')
    .sort((a, b) => (a.iso < b.iso ? -1 : a.iso > b.iso ? 1 : 0));

export function workingPowerSeries(sessions = []) {
  return chronological(sessions.filter((s) => s.avg_watts != null)).map(
    ({ s }) => ({
      date: s.date_display ?? s.date,
      watts: s.avg_watts,
      pace: s.pace_500m,
      dist: s.label,
      hardPush: s.hardPush,
    })
  );
}

export function efficiencySeries(sessions = []) {
  return chronological(
    sessions.filter((s) => s.avg_watts > 0 && s.avg_hr > 0)
  ).map(({ s, iso }) => ({
    iso,
    date: s.date_display ?? s.date,
    wpb: s.avg_watts / s.avg_hr,
  }));
}

// Least-squares line through `[{ iso, y }]`, x in days from the first point.
export function fitTrend(points = []) {
  if (points.length < MIN_TREND_POINTS) return null;
  const epoch = new Date(points[0].iso + 'T00:00:00').getTime();
  const xs = points.map(
    (p) => (new Date(p.iso + 'T00:00:00').getTime() - epoch) / DAY_MS
  );
  const ys = points.map((p) => p.y);
  const n = xs.length;
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = my - slope * mx;
  const preds = xs.map((x) => slope * x + intercept);
  const ssRes = ys.reduce((s, y, i) => s + (y - preds[i]) ** 2, 0);
  const ssTot = ys.reduce((s, y) => s + (y - my) ** 2, 0);
  return {
    slopePerWeek: slope * 7,
    r2: ssTot === 0 ? 0 : 1 - ssRes / ssTot,
    residSd: Math.sqrt(ssRes / (n - 2)),
    spread: sampleStdDev(ys),
    nPoints: n,
    current: preds[n - 1],
  };
}

export function zoneGuides(paceZones = []) {
  const ut2 = paceZones.find((z) => z.zone === 'UT2');
  const ut1 = paceZones.find((z) => z.zone === 'UT1');
  if (!ut2 || !ut1) return [];
  return [
    { y: ut2.wattsLow, label: 'UT2 floor' },
    { y: ut1.wattsHigh, label: 'UT1 top' },
  ];
}
