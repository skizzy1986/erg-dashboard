import { describe, it, expect } from 'vitest';
import { calcTrainingLoad } from '../trainingLoad.js';

const CTL_K = Math.exp(-1 / 42);
const ATL_K = Math.exp(-1 / 7);

const oneDay = (date, tss = 0, note = '') => [{ date, tss, note }];

describe('calcTrainingLoad', () => {
  describe('return shape', () => {
    it('returns an array', () => {
      expect(Array.isArray(calcTrainingLoad(oneDay('2026-06-13')))).toBe(true);
    });

    it('each entry has date, ctl, atl, tsb, tss, note', () => {
      const [entry] = calcTrainingLoad(oneDay('2026-06-13', 50, 'easy'));
      expect(entry).toMatchObject({
        date: expect.any(String),
        ctl: expect.any(Number),
        atl: expect.any(Number),
        tsb: expect.any(Number),
        tss: expect.any(Number),
        note: expect.any(String),
      });
    });
  });

  describe('date range', () => {
    it('first result date matches tssData start date (MM/DD)', () => {
      const result = calcTrainingLoad(oneDay('2026-06-10'));
      expect(result[0].date).toBe('06/10');
    });

    it('last result date is always 06/13 (hardcoded end)', () => {
      const result = calcTrainingLoad(oneDay('2026-06-10'));
      expect(result[result.length - 1].date).toBe('06/13');
    });

    it('produces the correct number of days inclusive', () => {
      // 2026-06-10 → 2026-06-13 = 4 days
      const result = calcTrainingLoad(oneDay('2026-06-10'));
      expect(result.length).toBe(4);
    });

    it('single-day input starting on the end date has length 1', () => {
      expect(calcTrainingLoad(oneDay('2026-06-13')).length).toBe(1);
    });

    it('formats dates as MM/DD', () => {
      const result = calcTrainingLoad(oneDay('2026-06-01'));
      expect(result[0].date).toBe('06/01');
    });
  });

  describe('zero TSS', () => {
    it('CTL is 0 when all days have TSS=0', () => {
      const [entry] = calcTrainingLoad(oneDay('2026-06-13', 0));
      expect(entry.ctl).toBe(0);
    });

    it('ATL is 0 when all days have TSS=0', () => {
      const [entry] = calcTrainingLoad(oneDay('2026-06-13', 0));
      expect(entry.atl).toBe(0);
    });

    it('TSB is 0 when CTL and ATL are both 0', () => {
      const [entry] = calcTrainingLoad(oneDay('2026-06-13', 0));
      expect(entry.tsb).toBe(0);
    });
  });

  describe('CTL / ATL math', () => {
    it('CTL after one TSS=100 day equals 100*(1-exp(-1/42)) rounded to 1dp', () => {
      const [entry] = calcTrainingLoad(oneDay('2026-06-13', 100));
      expect(entry.ctl).toBe(Math.round(100 * (1 - CTL_K) * 10) / 10);
    });

    it('ATL after one TSS=100 day equals 100*(1-exp(-1/7)) rounded to 1dp', () => {
      const [entry] = calcTrainingLoad(oneDay('2026-06-13', 100));
      expect(entry.atl).toBe(Math.round(100 * (1 - ATL_K) * 10) / 10);
    });

    it('TSB uses unrounded CTL/ATL before subtraction', () => {
      const [entry] = calcTrainingLoad(oneDay('2026-06-13', 100));
      const ctl_raw = 100 * (1 - CTL_K);
      const atl_raw = 100 * (1 - ATL_K);
      expect(entry.tsb).toBe(Math.round((ctl_raw - atl_raw) * 10) / 10);
    });

    it('ATL rises faster than CTL (ATL > CTL after first TSS day)', () => {
      const [entry] = calcTrainingLoad(oneDay('2026-06-13', 100));
      expect(entry.atl).toBeGreaterThan(entry.ctl);
    });

    it('TSB is negative early in training (ATL > CTL)', () => {
      const [entry] = calcTrainingLoad(oneDay('2026-06-13', 100));
      expect(entry.tsb).toBeLessThan(0);
    });

    it('CTL accumulates across consecutive days', () => {
      const result = calcTrainingLoad([
        { date: '2026-06-12', tss: 100, note: '' },
        { date: '2026-06-13', tss: 100, note: '' },
      ]);
      expect(result[1].ctl).toBeGreaterThan(result[0].ctl);
    });

    it('CTL decays more slowly than ATL after a loading day', () => {
      const result = calcTrainingLoad([
        { date: '2026-06-12', tss: 100, note: '' },
        { date: '2026-06-13', tss: 0, note: '' },
      ]);
      const ctlRatio = result[1].ctl / result[0].ctl;
      const atlRatio = result[1].atl / result[0].atl;
      expect(ctlRatio).toBeGreaterThan(atlRatio);
    });
  });

  describe('gap days (missing entries)', () => {
    it('gap days carry TSS=0 in the result', () => {
      const result = calcTrainingLoad([
        { date: '2026-06-11', tss: 100, note: 'hard' },
        { date: '2026-06-13', tss: 100, note: 'hard' },
      ]);
      expect(result[1].tss).toBe(0); // 2026-06-12 is the gap
    });

    it('gap days carry an empty note', () => {
      const result = calcTrainingLoad([
        { date: '2026-06-11', tss: 100, note: 'hard' },
        { date: '2026-06-13', tss: 100, note: 'hard' },
      ]);
      expect(result[1].note).toBe('');
    });

    it('a gap day reduces CTL vs a continuous training day', () => {
      const withGap = calcTrainingLoad([
        { date: '2026-06-11', tss: 100, note: '' },
        { date: '2026-06-13', tss: 100, note: '' },
      ]);
      const noGap = calcTrainingLoad([
        { date: '2026-06-11', tss: 100, note: '' },
        { date: '2026-06-12', tss: 100, note: '' },
        { date: '2026-06-13', tss: 100, note: '' },
      ]);
      expect(withGap[2].ctl).toBeLessThan(noGap[2].ctl);
    });
  });

  describe('note field', () => {
    it('note from input is passed through to result', () => {
      const [entry] = calcTrainingLoad(oneDay('2026-06-13', 50, 'easy row'));
      expect(entry.note).toBe('easy row');
    });

    it('note is empty string for days not in tssData', () => {
      const result = calcTrainingLoad([
        { date: '2026-06-11', tss: 0, note: 'first' },
        { date: '2026-06-13', tss: 0, note: 'last' },
      ]);
      expect(result[1].note).toBe('');
    });
  });

  describe('TSS passthrough', () => {
    it('TSS in result matches the input value', () => {
      const [entry] = calcTrainingLoad(oneDay('2026-06-13', 75));
      expect(entry.tss).toBe(75);
    });
  });

  describe('rounding', () => {
    it('CTL is rounded to at most 1 decimal place', () => {
      const [entry] = calcTrainingLoad(oneDay('2026-06-13', 100));
      const decimals = entry.ctl.toString().split('.')[1]?.length ?? 0;
      expect(decimals).toBeLessThanOrEqual(1);
    });

    it('ATL is rounded to at most 1 decimal place', () => {
      const [entry] = calcTrainingLoad(oneDay('2026-06-13', 100));
      const decimals = entry.atl.toString().split('.')[1]?.length ?? 0;
      expect(decimals).toBeLessThanOrEqual(1);
    });

    it('TSB is rounded to at most 1 decimal place', () => {
      const [entry] = calcTrainingLoad(oneDay('2026-06-13', 100));
      const decimals = entry.tsb.toString().split('.')[1]?.length ?? 0;
      expect(decimals).toBeLessThanOrEqual(1);
    });
  });
});
