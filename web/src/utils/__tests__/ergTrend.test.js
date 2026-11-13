import { describe, it, expect, vi } from 'vitest';
import {
  MIN_TREND_POINTS,
  workingPowerSeries,
  efficiencySeries,
  fitTrend,
  zoneGuides,
} from '../ergTrend.js';
import { enrich } from '../../hooks/useErgSessions.js';
import { derivePaceZones } from '../../constants/trainingConfig.js';

// enrich lives beside the hook, whose module builds the Supabase client on
// import; CI has no VITE_SUPABASE_URL, so the client must not be constructed.
vi.mock('../../supabaseClient.js', () => ({ supabase: {} }));

const row = (date, avg_watts, avg_hr = null, extra = {}) =>
  enrich({ date, avg_watts, avg_hr, label: '30m', srpe: 4, ...extra }, 200);

describe('MIN_TREND_POINTS', () => {
  it('is three', () => {
    expect(MIN_TREND_POINTS).toBe(3);
  });
});

describe('workingPowerSeries', () => {
  it('returns rows oldest first across a year boundary and drops an unparseable date', () => {
    const series = workingPowerSeries([
      row('1/3/27', 150),
      row('not a date', 160),
      row('12/30/26', 140),
      row('11/2/26', 130),
    ]);
    expect(series.map((p) => p.date)).toEqual(['11/2', '12/30', '1/3']);
  });

  it('drops rows with no power logged', () => {
    const series = workingPowerSeries([
      row('11/3/26', null),
      row('11/2/26', 140),
    ]);
    expect(series).toHaveLength(1);
    expect(series[0].watts).toBe(140);
  });

  it('emits the shape ErgTooltip reads', () => {
    const [p] = workingPowerSeries([row('11/2/26', 140, null, { srpe: 8 })]);
    expect(p).toEqual({
      date: '11/2',
      watts: 140,
      pace: expect.any(Number),
      dist: '30m',
      hardPush: true,
    });
  });

  it('falls back to the raw date when a row is not enriched', () => {
    const [p] = workingPowerSeries([{ date: '11/2/26', avg_watts: 140 }]);
    expect(p.date).toBe('11/2/26');
  });

  it('tolerates no argument', () => {
    expect(workingPowerSeries()).toEqual([]);
  });
});

describe('efficiencySeries', () => {
  it('excludes a session with heart rate 0 or missing, or no power', () => {
    const series = efficiencySeries([
      row('11/4/26', 150, 0),
      row('11/3/26', 150, null),
      row('11/2/26', null, 130),
      row('11/1/26', 140, 140),
    ]);
    expect(series).toEqual([{ iso: '2026-11-01', date: '11/1', wpb: 1 }]);
  });

  it('sorts chronologically and drops an unparseable date', () => {
    const series = efficiencySeries([
      row('11/5/26', 150, 125),
      row('bad', 150, 125),
      row('11/1/26', 140, 140),
    ]);
    expect(series.map((p) => p.iso)).toEqual(['2026-11-01', '2026-11-05']);
    expect(series[1].wpb).toBeCloseTo(1.2);
  });

  it('tolerates no argument', () => {
    expect(efficiencySeries()).toEqual([]);
  });
});

describe('fitTrend', () => {
  it('returns null below the minimum point count', () => {
    expect(
      fitTrend([
        { iso: '2026-11-01', y: 1 },
        { iso: '2026-11-08', y: 1.1 },
      ])
    ).toBeNull();
    expect(fitTrend()).toBeNull();
  });

  it('reports a positive weekly slope on a rising series', () => {
    const fit = fitTrend([
      { iso: '2026-11-01', y: 1.0 },
      { iso: '2026-11-08', y: 1.1 },
      { iso: '2026-11-15', y: 1.2 },
    ]);
    expect(fit.slopePerWeek).toBeCloseTo(0.1);
    expect(fit.r2).toBeCloseTo(1);
    expect(fit.residSd).toBeCloseTo(0);
    expect(fit.nPoints).toBe(3);
    expect(fit.current).toBeCloseTo(1.2);
    expect(fit.spread).toBeCloseTo(0.1);
  });

  it('measures x from real dates across a year boundary', () => {
    const fit = fitTrend([
      { iso: '2026-12-25', y: 1.0 },
      { iso: '2027-01-01', y: 1.1 },
      { iso: '2027-01-08', y: 1.2 },
    ]);
    expect(fit.slopePerWeek).toBeCloseTo(0.1);
  });

  it('reads a flat series as zero slope and zero r²', () => {
    const fit = fitTrend([
      { iso: '2026-11-01', y: 1 },
      { iso: '2026-11-02', y: 1 },
      { iso: '2026-11-03', y: 1 },
    ]);
    expect(fit.slopePerWeek).toBe(0);
    expect(fit.r2).toBe(0);
  });

  it('does not divide by zero when every point shares a day', () => {
    const fit = fitTrend([
      { iso: '2026-11-01', y: 1 },
      { iso: '2026-11-01', y: 1.2 },
      { iso: '2026-11-01', y: 1.1 },
    ]);
    expect(fit.slopePerWeek).toBe(0);
    expect(Number.isFinite(fit.r2)).toBe(true);
  });

  it('returns no verdict string', () => {
    const fit = fitTrend([
      { iso: '2026-11-01', y: 1 },
      { iso: '2026-11-02', y: 1.1 },
      { iso: '2026-11-03', y: 1.3 },
    ]);
    expect(Object.values(fit).every((v) => typeof v === 'number')).toBe(true);
  });
});

describe('zoneGuides', () => {
  it('returns nothing without zones', () => {
    expect(zoneGuides([])).toEqual([]);
    expect(zoneGuides()).toEqual([]);
  });

  it('draws the UT2 floor and UT1 top from the derived bands', () => {
    const zones = derivePaceZones(205);
    const ut2 = zones.find((z) => z.zone === 'UT2');
    const ut1 = zones.find((z) => z.zone === 'UT1');
    expect(zoneGuides(zones)).toEqual([
      { y: ut2.wattsLow, label: 'UT2 floor' },
      { y: ut1.wattsHigh, label: 'UT1 top' },
    ]);
  });
});
