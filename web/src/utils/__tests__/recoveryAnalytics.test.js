import { describe, it, expect } from 'vitest';
import {
  computePersonalBaselines,
  computeReadiness,
  computeReadinessHistory,
  joinVitalsTsb,
} from '../recoveryAnalytics.js';

const RHR_DEFAULT = 57;
const HRV_DEFAULT = 30;
const SLEEP_TARGET = 7;

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

describe('computeReadiness', () => {
  it('returns FATIGUED with score 0 when latest is null', () => {
    expect(computeReadiness(null)).toEqual({
      readinessScore: 0,
      readinessLabel: 'FATIGUED',
    });
  });

  it('returns score 100 READY when all metrics are at baseline', () => {
    const r = computeReadiness({
      rhr: RHR_DEFAULT,
      hrv: HRV_DEFAULT,
      sleep: SLEEP_TARGET,
    });
    expect(r.readinessScore).toBe(100);
    expect(r.readinessLabel).toBe('READY');
  });

  it('deducts 4 points per bpm above RHR baseline', () => {
    const r = computeReadiness({
      rhr: 62,
      hrv: HRV_DEFAULT,
      sleep: SLEEP_TARGET,
    });
    expect(r.readinessScore).toBe(80);
  });

  it('deducts 1.5 points per ms below HRV baseline', () => {
    const r = computeReadiness({
      rhr: RHR_DEFAULT,
      hrv: 20,
      sleep: SLEEP_TARGET,
    });
    expect(r.readinessScore).toBe(85);
  });

  it('uses personalized baselines when provided', () => {
    const baselines = { rhrBaseline: 60, hrvBaseline: 35, sleepTarget: 7 };
    const r = computeReadiness({ rhr: 60, hrv: 35, sleep: 7 }, baselines);
    expect(r.readinessScore).toBe(100);
  });

  it('handles null metric fields without crashing', () => {
    expect(() =>
      computeReadiness({ rhr: null, hrv: null, sleep: null })
    ).not.toThrow();
    const r = computeReadiness({ rhr: null, hrv: null, sleep: null });
    expect(r.readinessScore).toBe(100);
  });

  it('clamps score to 0 minimum', () => {
    const r = computeReadiness({ rhr: 100, hrv: 5, sleep: 3 });
    expect(r.readinessScore).toBe(0);
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
