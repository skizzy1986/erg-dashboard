import { describe, it, expect } from 'vitest';
import {
  calcTrainingLoad,
  deriveTargets,
  sessionLoad,
} from '../trainingLoad.js';

const ANCHORS = { cp: 205, ftp: 250 };

describe('sessionLoad', () => {
  it('uses sRPE when it exists: an hour at sRPE 7 is 7', () => {
    expect(sessionLoad({ duration: '60:00', srpe: 7 }, ANCHORS)).toBe(7);
  });

  it('scales sRPE by duration', () => {
    expect(sessionLoad({ duration: '30:00', srpe: 8 }, ANCHORS)).toBe(4);
  });

  it('prefers sRPE over watts when a session carries both', () => {
    const both = { duration: '60:00', srpe: 7, type: 'erg', avg_watts: 150 };
    expect(sessionLoad(both, ANCHORS)).toBe(7);
    expect(sessionLoad({ ...both, srpe: null }, ANCHORS)).toBe(5);
  });

  it('falls back to power when sRPE is missing', () => {
    // (152/205)^2 * 10 = 5.50 for one hour
    expect(
      sessionLoad(
        { duration: '60:00', srpe: null, type: 'erg', avg_watts: 152 },
        ANCHORS
      )
    ).toBe(5);
  });

  it('puts an hour at threshold at 10 — the sRPE 10 equivalent', () => {
    expect(
      sessionLoad(
        { duration: '60:00', srpe: null, type: 'erg', avg_watts: 205 },
        ANCHORS
      )
    ).toBe(10);
  });

  it('reads an easy paddle as genuinely easy', () => {
    // 118 W recovery for 21:13 -> 0.354h * 3.31 = 1.2
    expect(
      sessionLoad(
        { duration: '21:13', srpe: null, type: 'erg', avg_watts: 118 },
        ANCHORS
      )
    ).toBe(1);
  });

  it('measures bike watts against FTP and rowing watts against CP', () => {
    const ride = { duration: '60:00', srpe: null, avg_watts: 196 };
    expect(sessionLoad({ ...ride, type: 'cycling' }, ANCHORS)).toBe(6);
    expect(sessionLoad({ ...ride, type: 'bike' }, ANCHORS)).toBe(6);
    // Same watts judged against the lower rowing CP would overstate the ride.
    expect(sessionLoad({ ...ride, type: 'erg' }, ANCHORS)).toBe(9);
  });

  it('gives strength sessions no power model', () => {
    expect(
      sessionLoad(
        { duration: '50:08', srpe: null, type: 'strength', avg_watts: 200 },
        ANCHORS
      )
    ).toBe(0);
  });

  it('degrades to zero when the anchor is missing rather than inventing one', () => {
    const s = { duration: '60:00', srpe: null, type: 'erg', avg_watts: 152 };
    expect(sessionLoad(s, { cp: null, ftp: 250 })).toBe(0);
    expect(sessionLoad(s, {})).toBe(0);
    expect(sessionLoad(s)).toBe(0);
  });

  it('returns zero for a session with neither signal', () => {
    expect(
      sessionLoad({ duration: '45:00', srpe: null, type: 'erg' }, ANCHORS)
    ).toBe(0);
    expect(
      sessionLoad(
        { duration: '45:00', srpe: null, type: 'erg', avg_watts: 0 },
        ANCHORS
      )
    ).toBe(0);
  });

  it('returns zero for an unparseable or absent duration', () => {
    expect(
      sessionLoad({ duration: 'garbage', srpe: 7, type: 'erg' }, ANCHORS)
    ).toBe(0);
    expect(sessionLoad({ srpe: 7 }, ANCHORS)).toBe(0);
    expect(sessionLoad(undefined, ANCHORS)).toBe(0);
  });
});

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
      const today = new Date().toISOString().split('T')[0];
      const result = calcTrainingLoad(oneDay(today));
      const [mm, dd] = today.slice(5).split('-');
      expect(result[0].date).toBe(`${mm}/${dd}`);
    });

    it('last result date is today when last entry is today', () => {
      const today = new Date().toISOString().split('T')[0];
      const result = calcTrainingLoad(oneDay(today));
      const [mm, dd] = today.slice(5).split('-');
      expect(result[result.length - 1].date).toBe(`${mm}/${dd}`);
    });

    it('single-day input for today has length 1', () => {
      const today = new Date().toISOString().split('T')[0];
      expect(calcTrainingLoad(oneDay(today)).length).toBe(1);
    });

    it('two consecutive days produce exactly 2 entries', () => {
      const d1 = new Date();
      d1.setDate(d1.getDate() - 1);
      const yesterday = d1.toISOString().split('T')[0];
      const today = new Date().toISOString().split('T')[0];
      const result = calcTrainingLoad([
        { date: yesterday, tss: 0, note: '' },
        { date: today, tss: 0, note: '' },
      ]);
      expect(result.length).toBe(2);
    });

    it('formats dates as MM/DD', () => {
      const today = new Date().toISOString().split('T')[0];
      const result = calcTrainingLoad(oneDay(today));
      expect(result[0].date).toMatch(/^\d{2}\/\d{2}$/);
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

  describe('same-day aggregation', () => {
    it('sums TSS from two entries on the same date into one result', () => {
      const result = calcTrainingLoad(
        [
          { date: '2026-06-13', tss: 30, note: 'AM erg' },
          { date: '2026-06-13', tss: 20, note: 'PM strength' },
        ],
        '2026-06-13'
      );
      expect(result.length).toBe(1);
      expect(result[0].tss).toBe(50);
    });

    it('concatenates same-day notes with "; "', () => {
      const result = calcTrainingLoad([
        { date: '2026-06-13', tss: 30, note: 'AM erg' },
        { date: '2026-06-13', tss: 20, note: 'PM strength' },
      ]);
      expect(result[0].note).toBe('AM erg; PM strength');
    });

    it('never emits the literal "undefined" when one same-day note is missing', () => {
      const result = calcTrainingLoad([
        { date: '2026-06-13', tss: 30, note: undefined },
        { date: '2026-06-13', tss: 20, note: 'PM strength' },
      ]);
      expect(result[0].note).toBe('PM strength');
      expect(result[0].note).not.toContain('undefined');
    });

    it('sums and concatenates notes for 3+ entries on the same date', () => {
      const result = calcTrainingLoad(
        [
          { date: '2026-06-13', tss: 30, note: 'AM erg' },
          { date: '2026-06-13', tss: 20, note: 'PM strength' },
          { date: '2026-06-13', tss: 10, note: 'evening mobility' },
        ],
        '2026-06-13'
      );
      expect(result.length).toBe(1);
      expect(result[0].tss).toBe(60);
      expect(result[0].note).toBe('AM erg; PM strength; evening mobility');
    });
  });

  describe('M/D/YY date normalization', () => {
    it('normalizes a single M/D/YY entry (not dropped or miskeyed)', () => {
      const result = calcTrainingLoad(
        [{ date: '7/1/26', tss: 50, note: 'test' }],
        '2026-07-01'
      );
      expect(result.length).toBe(1);
      expect(result[0].tss).toBe(50);
    });

    it('builds a correct range from out-of-lexical-order M/D/YY dates', () => {
      const result = calcTrainingLoad(
        [
          { date: '6/12/26', tss: 10, note: '' },
          { date: '6/2/26', tss: 20, note: '' },
        ],
        '2026-06-12'
      );
      expect(result.length).toBe(11);
      expect(result[0].date).toBe('06/02');
      expect(result[result.length - 1].date).toBe('06/12');
    });

    it('handles mixed ISO and M/D/YY input', () => {
      const result = calcTrainingLoad(
        [
          { date: '2026-06-01', tss: 10, note: 'a' },
          { date: '6/2/26', tss: 20, note: 'b' },
        ],
        '2026-06-02'
      );
      expect(result.length).toBe(2);
      expect(result[0].tss).toBe(10);
      expect(result[1].tss).toBe(20);
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

describe('deriveTargets', () => {
  it('anchors to the last clean actual point', () => {
    const t = deriveTargets([
      { type: 'actual', watts: 145 },
      { type: 'actual', watts: 151 },
    ]);
    expect(t.anchor).toBe(151);
    expect(t.ut1Low).toBe(Math.round(151 * 0.96));
    expect(t.source).toContain('2 clean HR130 points');
  });

  it('falls back to 150 when there are no clean points', () => {
    const t = deriveTargets([{ type: 'projected', watts: 200 }]);
    expect(t.anchor).toBe(150);
    expect(t.source).toBe('default (no clean points)');
  });
});
