import { describe, it, expect } from 'vitest';
import {
  RHR_DEFAULT as RHR_BASELINE,
  HRV_DEFAULT as HRV_BASELINE,
} from '../recoveryAnalytics.js';
import { evaluateRules, checkConsistency, autoregulate } from '../analysis.js';
import { THEME } from '../../constants/theme.js';

const ids = (flags) => flags.map((f) => f.id);

describe('evaluateRules', () => {
  it('returns no flags when recovery is missing', () => {
    expect(evaluateRules(null, 5, 0)).toEqual([]);
    expect(evaluateRules(undefined, 8, -30)).toEqual([]);
  });

  it('fires R4 when HRV is below baseline AND RHR above baseline', () => {
    const flags = evaluateRules(
      { hrv: HRV_BASELINE - 5, rhr: RHR_BASELINE + 3, sleep: 8 },
      4,
      0
    );
    expect(ids(flags)).toContain('R4');
  });

  it('does NOT fire the HRV/RHR R4 unless BOTH conditions hold', () => {
    // HRV low but RHR not elevated
    expect(
      ids(
        evaluateRules(
          { hrv: HRV_BASELINE - 5, rhr: RHR_BASELINE, sleep: 8 },
          4,
          0
        )
      )
    ).not.toContain('R4');
    // null HRV → guard skips the rule
    expect(
      ids(evaluateRules({ hrv: null, rhr: RHR_BASELINE + 10, sleep: 8 }, 4, 0))
    ).not.toContain('R4');
  });

  it('fires R5 on sleep debt and skips it when sleep is null or adequate', () => {
    expect(ids(evaluateRules({ rhr: RHR_BASELINE, sleep: 6 }, 4, 0))).toContain(
      'R5'
    );
    expect(
      ids(evaluateRules({ rhr: RHR_BASELINE, sleep: 7 }, 4, 0))
    ).not.toContain('R5');
    expect(
      ids(evaluateRules({ rhr: RHR_BASELINE, sleep: null }, 4, 0))
    ).not.toContain('R5');
  });

  it('fires R3 when the last sRPE is hard (>=7) and not when easy or null', () => {
    expect(ids(evaluateRules({ rhr: RHR_BASELINE, sleep: 8 }, 7, 0))).toContain(
      'R3'
    );
    expect(
      ids(evaluateRules({ rhr: RHR_BASELINE, sleep: 8 }, 6, 0))
    ).not.toContain('R3');
    expect(
      ids(evaluateRules({ rhr: RHR_BASELINE, sleep: 8 }, null, 0))
    ).not.toContain('R3');
  });

  it('fires R4 on deep negative TSB and skips it when null or shallow', () => {
    expect(
      ids(evaluateRules({ rhr: RHR_BASELINE, sleep: 8 }, 4, -30))
    ).toContain('R4');
    expect(
      ids(evaluateRules({ rhr: RHR_BASELINE, sleep: 8 }, 4, -10))
    ).not.toContain('R4');
    expect(
      ids(evaluateRules({ rhr: RHR_BASELINE, sleep: 8 }, 4, null))
    ).not.toContain('R4');
  });

  it('stacks multiple flags when several conditions hold', () => {
    const flags = evaluateRules(
      { hrv: HRV_BASELINE - 5, rhr: RHR_BASELINE + 3, sleep: 5 },
      9,
      -30
    );
    const got = ids(flags);
    expect(got).toContain('R3');
    expect(got).toContain('R5');
    expect(got.filter((x) => x === 'R4').length).toBeGreaterThanOrEqual(1);
  });
});

describe('checkConsistency', () => {
  it('flags a conflict when R4 fired and a hard session is planned', () => {
    const r = checkConsistency([{ id: 'R4' }], true);
    expect(r.conflict).toBe(true);
    expect(r.msg).toMatch(/under-recovery/i);
  });

  it('is clear when R4 fired but the plan is easy', () => {
    expect(checkConsistency([{ id: 'R4' }], false).conflict).toBe(false);
  });

  it('is clear when the plan is hard but no R4 fired', () => {
    expect(checkConsistency([{ id: 'R5' }], true).conflict).toBe(false);
    expect(checkConsistency([], true).conflict).toBe(false);
  });
});

describe('autoregulate', () => {
  it('is RED when an R4 hard flag is present', () => {
    expect(autoregulate(0, { score: 90 }, [{ id: 'R4' }]).signal).toBe('RED');
  });

  it('is RED on deep TSB or low readiness', () => {
    expect(autoregulate(-30, null, []).signal).toBe('RED');
    expect(autoregulate(0, { score: 40 }, []).signal).toBe('RED');
  });

  it('is AMBER on moderate fatigue, moderate readiness, or an R5 flag', () => {
    expect(autoregulate(-15, { score: 90 }, []).signal).toBe('AMBER');
    expect(autoregulate(0, { score: 60 }, []).signal).toBe('AMBER');
    expect(autoregulate(0, { score: 90 }, [{ id: 'R5' }]).signal).toBe('AMBER');
  });

  it('is GREEN when form and recovery both support training', () => {
    const g = autoregulate(5, { score: 90 }, []);
    expect(g.signal).toBe('GREEN');
    expect(g.color).toBe(THEME.positive);
  });

  it('tolerates null tsb and null readiness (defaults to GREEN)', () => {
    expect(autoregulate(null, null, []).signal).toBe('GREEN');
  });

  it('returns a color and guidance for each signal', () => {
    for (const r of [
      autoregulate(-30, null, []),
      autoregulate(-15, null, []),
      autoregulate(5, { score: 90 }, []),
    ]) {
      expect(typeof r.color).toBe('string');
      expect(r.guidance.length).toBeGreaterThan(0);
    }
  });
});

describe('evaluateRules baselines', () => {
  it('judges R4 against supplied personal baselines, not the defaults', () => {
    const day = { hrv: 45, rhr: 50, sleep: 8 };
    // Against population defaults (30/57) this day looks fine: HRV is well
    // above 30 and RHR well below 57.
    expect(ids(evaluateRules(day, 4, 0))).not.toContain('R4');
    // Against this athlete's own baselines it is a clear under-recovery day.
    expect(
      ids(evaluateRules(day, 4, 0, { hrvBaseline: 55, rhrBaseline: 46 }))
    ).toContain('R4');
  });

  it('falls back to the population defaults when no baselines are passed', () => {
    const day = { hrv: HRV_BASELINE - 5, rhr: RHR_BASELINE + 3, sleep: 8 };
    expect(ids(evaluateRules(day, 4, 0))).toContain('R4');
    expect(ids(evaluateRules(day, 4, 0, {}))).toContain('R4');
  });
});
