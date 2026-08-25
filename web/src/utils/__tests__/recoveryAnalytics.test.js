import { describe, it, expect } from 'vitest';
import {
  computePersonalBaselines,
  computeReadiness,
  computeReadinessHistory,
  joinVitalsTsb,
} from '../recoveryAnalytics.js';

import {
  RHR_DEFAULT,
  HRV_DEFAULT,
  SLEEP_TARGET,
} from '../recoveryAnalytics.js';
import { THEME } from '../../constants/theme.js';

function makeRows(n, overrides = {}) {
  return Array.from({ length: n }, (_, i) => ({
    date: `2026-06-${String(20 - i).padStart(2, '0')}`,
    rhr: 55,
    hrv: 32,
    sleep: 7.5,
    ...overrides,
  }));
}

describe('computePersonalBaselines', () => {
  it('returns defaults when rows is null', () => {
    expect(computePersonalBaselines(null)).toEqual({
      rhrBaseline: RHR_DEFAULT,
      hrvBaseline: HRV_DEFAULT,
      sleepTarget: SLEEP_TARGET,
      rhrPersonal: false,
      hrvPersonal: false,
    });
  });

  it('returns defaults when fewer than minSamples rows', () => {
    const r = computePersonalBaselines(makeRows(13));
    expect(r.rhrBaseline).toBe(RHR_DEFAULT);
    expect(r.hrvBaseline).toBe(HRV_DEFAULT);
  });

  it('returns computed baseline when minSamples rows present', () => {
    const r = computePersonalBaselines(makeRows(14, { rhr: 55, hrv: 35 }));
    expect(r.rhrBaseline).toBe(55);
    expect(r.hrvBaseline).toBe(35);
  });

  it('sleepTarget is always the fixed 7h health target', () => {
    const r = computePersonalBaselines(makeRows(14, { sleep: 9 }));
    expect(r.sleepTarget).toBe(SLEEP_TARGET);
  });

  it('trims outliers — single extreme RHR does not skew the mean', () => {
    const rows = [
      ...makeRows(27, { rhr: 55 }),
      { date: '2026-05-24', rhr: 120, hrv: 32, sleep: 7.5 },
    ];
    const r = computePersonalBaselines(rows);
    expect(r.rhrBaseline).toBeLessThan(60);
  });
});

describe('computePersonalBaselines provenance', () => {
  it('reports personal-vs-default per metric, not once for the set', () => {
    // Real shape of this athlete's data: RHR is captured most days, HRV rarely.
    // A single flag would let a view label the population default "your avg".
    const rows = makeRows(20).map((r, i) => ({
      ...r,
      hrv: i < 5 ? 40 : null,
    }));
    const b = computePersonalBaselines(rows);
    expect(b.rhrPersonal).toBe(true);
    expect(b.hrvPersonal).toBe(false);
    expect(b.hrvBaseline).toBe(HRV_DEFAULT);
  });
});

describe('computeReadiness', () => {
  const atBaseline = {
    rhr: RHR_DEFAULT,
    hrv: HRV_DEFAULT,
    sleep: SLEEP_TARGET,
  };

  it('reports NO DATA rather than inventing a verdict from absent data', () => {
    // Both directions used to be wrong: a missing row scored 0 FATIGUED, and a
    // row whose metrics were all null scored 100 READY.
    expect(computeReadiness(null)).toMatchObject({
      score: null,
      status: 'NO DATA',
      partial: true,
    });
    expect(
      computeReadiness({ rhr: null, hrv: null, sleep: null })
    ).toMatchObject({ score: null, status: 'NO DATA' });
    expect(computeReadiness({ rhr: 'x' }).status).toBe('NO DATA');
  });

  it('returns score 100 READY when all metrics are at baseline', () => {
    const r = computeReadiness(atBaseline);
    expect(r.score).toBe(100);
    expect(r.status).toBe('READY');
    expect(r.color).toBe(THEME.positive);
    expect(r.partial).toBe(false);
  });

  it('deducts 4 points per bpm above RHR baseline', () => {
    expect(computeReadiness({ ...atBaseline, rhr: 62 }).score).toBe(80);
  });

  it('deducts 1.5 points per ms below HRV baseline', () => {
    expect(computeReadiness({ ...atBaseline, hrv: 20 }).score).toBe(85);
  });

  it('deducts 8 points per hour of sleep debt', () => {
    expect(computeReadiness({ ...atBaseline, sleep: 5 }).score).toBe(84);
  });

  it('deducts for deep TSB fatigue — the term merged in from calcReadiness', () => {
    expect(computeReadiness(atBaseline, {}, -40).score).toBe(84);
    // Shallow or absent TSB leaves the score alone.
    expect(computeReadiness(atBaseline, {}, -10).score).toBe(100);
    expect(computeReadiness(atBaseline, {}, null).score).toBe(100);
  });

  it('uses personalized baselines when provided', () => {
    const baselines = { rhrBaseline: 60, hrvBaseline: 35, sleepTarget: 7 };
    expect(
      computeReadiness({ rhr: 60, hrv: 35, sleep: 7 }, baselines).score
    ).toBe(100);
  });

  it('reports the 80/60 bands', () => {
    expect(
      computeReadiness({ ...atBaseline, rhr: RHR_DEFAULT + 4 }).status
    ).toBe('READY');
    const caution = computeReadiness({ ...atBaseline, rhr: RHR_DEFAULT + 6 });
    expect(caution.score).toBe(76);
    expect(caution.status).toBe('CAUTION');
    expect(caution.color).toBe(THEME.caution);
    const fatigued = computeReadiness({ ...atBaseline, rhr: RHR_DEFAULT + 11 });
    expect(fatigued.status).toBe('FATIGUED');
    expect(fatigued.color).toBe(THEME.critical);
  });

  it('clamps score to 0 minimum', () => {
    expect(computeReadiness({ rhr: 100, hrv: 5, sleep: 3 }).score).toBe(0);
  });

  it('marks the score partial when HRV or sleep is absent', () => {
    expect(computeReadiness({ rhr: RHR_DEFAULT, sleep: 8 }).partial).toBe(true);
    expect(
      computeReadiness({ rhr: RHR_DEFAULT, hrv: HRV_DEFAULT }).partial
    ).toBe(true);
  });
});

describe('computeReadinessHistory', () => {
  it('returns empty array when rows is empty', () => {
    expect(computeReadinessHistory([])).toEqual([]);
  });

  it('returns correct length for 7 rows', () => {
    const rows = makeRows(7);
    expect(computeReadinessHistory(rows)).toHaveLength(7);
  });

  it('caps at 14 entries even when more rows provided', () => {
    const rows = makeRows(20);
    expect(computeReadinessHistory(rows)).toHaveLength(14);
  });

  it('returns rows in ascending date order', () => {
    const rows = [
      { date: '2026-06-20', rhr: 57, hrv: 30, sleep: 7 },
      { date: '2026-06-19', rhr: 57, hrv: 30, sleep: 7 },
    ];
    const result = computeReadinessHistory(rows);
    expect(result[0].date).toBe('06/19');
    expect(result[1].date).toBe('06/20');
  });

  it('each entry has date and readinessScore', () => {
    const [entry] = computeReadinessHistory(makeRows(1));
    expect(entry).toMatchObject({
      date: expect.any(String),
      readinessScore: expect.any(Number),
    });
  });
});

describe('joinVitalsTsb', () => {
  it('returns empty array when vitals is empty', () => {
    expect(joinVitalsTsb([], [{ date: '06/20', tsb: 5 }])).toEqual([]);
  });

  it('returns empty array when loadData is empty', () => {
    expect(joinVitalsTsb([{ date: '2026-06-20', hrv: 30 }], [])).toEqual([]);
  });

  it('joins correctly despite YYYY-MM-DD vs MM/DD date format difference', () => {
    const vitals = [{ date: '2026-06-20', hrv: 32 }];
    const load = [{ date: '06/20', tsb: 5 }];
    const result = joinVitalsTsb(vitals, load);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ date: '06/20', hrv: 32, tsb: 5 });
  });

  it('excludes rows where HRV is null', () => {
    const vitals = [
      { date: '2026-06-20', hrv: null },
      { date: '2026-06-19', hrv: 30 },
    ];
    const load = [
      { date: '06/20', tsb: 5 },
      { date: '06/19', tsb: 3 },
    ];
    const result = joinVitalsTsb(vitals, load);
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe('06/19');
  });

  it('excludes rows where no TSB match found', () => {
    const vitals = [{ date: '2026-06-20', hrv: 30 }];
    const load = [{ date: '06/15', tsb: 5 }];
    const result = joinVitalsTsb(vitals, load);
    expect(result).toHaveLength(0);
  });
});
