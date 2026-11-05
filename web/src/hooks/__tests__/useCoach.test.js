import { describe, it, expect, vi, afterEach } from 'vitest';

// Mock supabaseClient so the import of useCoach.js doesn't fail at module load time
vi.mock('../../supabaseClient.js', () => ({
  supabase: {
    from: vi.fn(),
    auth: { getSession: vi.fn(), getUser: vi.fn() },
  },
}));

// Mock @tanstack/react-query to provide useQueryClient
vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: [] }),
  useQueryClient: () => ({ setQueryData: vi.fn(), getQueryData: () => [] }),
}));

// Mock child hooks so useCoach.js can be imported without a QueryClient
vi.mock('../useTSSHistory.js', () => ({ useTSSHistory: () => ({ data: [] }) }));
vi.mock('../useVitals.js', () => ({
  useVitals: () => ({
    latest: null,
    readinessScore: 0,
    readinessLabel: 'FATIGUED',
  }),
}));

import { buildTrainingContext, todayISO } from '../useCoach.js';

// buildTrainingContext is a pure exported function — no mocking needed
describe('buildTrainingContext', () => {
  it('includes today date header', () => {
    const result = buildTrainingContext(null, null, 0, 'FATIGUED', [], null);
    expect(result).toMatch(/CURRENT TRAINING DATA \(as of \d{4}-\d{2}-\d{2}\)/);
  });

  it('includes TSB, CTL, ATL when load data present', () => {
    const load = { tsb: -8.2, ctl: 34.1, atl: 42.3 };
    const result = buildTrainingContext(load, null, 0, 'FATIGUED', [], null);
    expect(result).toContain('TSB: -8.2');
    expect(result).toContain('CTL: 34.1');
    expect(result).toContain('ATL: 42.3');
  });

  // Boundaries are the dashboard's own (>10 / >-10), on the classic-TSS scale
  // #208 rescaled sessionLoad to. Pinned so the Coach cannot drift away from
  // what App.jsx, MobileAnalytics and LoadTooltip show for the same number.
  it('labels TSB signal correctly', () => {
    expect(
      buildTrainingContext(
        { tsb: 25, ctl: 30, atl: 20 },
        null,
        0,
        'READY',
        [],
        null
      )
    ).toContain('GREEN');
    expect(
      buildTrainingContext(
        { tsb: -5, ctl: 30, atl: 35 },
        null,
        0,
        'CAUTION',
        [],
        null
      )
    ).toContain('AMBER');
    expect(
      buildTrainingContext(
        { tsb: -15, ctl: 25, atl: 40 },
        null,
        0,
        'FATIGUED',
        [],
        null
      )
    ).toContain('RED');
  });

  it('puts the GREEN/AMBER boundary at 10, matching the dashboard', () => {
    const at = (tsb) =>
      buildTrainingContext(
        { tsb, ctl: 30, atl: 30 },
        null,
        0,
        'READY',
        [],
        null
      );
    expect(at(11)).toContain('GREEN');
    expect(at(10)).toContain('AMBER');
    expect(at(-10)).toContain('RED');
    expect(at(-9)).toContain('AMBER');
  });

  it('includes readiness and vitals when present', () => {
    const vitals = { rhr: 58, hrv: 27, sleep: 6.8 };
    const result = buildTrainingContext(null, vitals, 68, 'CAUTION', [], null);
    expect(result).toContain('Readiness: 68/100 CAUTION');
    expect(result).toContain('RHR: 58');
    expect(result).toContain('HRV: 27ms');
    expect(result).toContain('Sleep: 6.8h');
  });

  // #218 made computeReadiness return { score: null, status: 'NO DATA' } when
  // there is no RHR to score, precisely so absent data stops reaching the Coach
  // as a fabricated verdict. Interpolating that would read "null/100".
  it('never renders a null readiness score as a number', () => {
    const vitals = { rhr: null, hrv: 27, sleep: 6.8 };
    const result = buildTrainingContext(
      null,
      vitals,
      null,
      'NO DATA',
      [],
      null
    );
    expect(result).toContain('Readiness: unavailable (NO DATA)');
    expect(result).not.toContain('null');
    expect(result).not.toContain('/100');
    // The vitals it does have are still reported.
    expect(result).toContain('HRV: 27ms');
    expect(result).toContain('Sleep: 6.8h');
  });

  it('marks a partial readiness score as partial', () => {
    const vitals = { rhr: 58, hrv: null, sleep: null };
    const result = buildTrainingContext(
      null,
      vitals,
      72,
      'CAUTION',
      [],
      null,
      true
    );
    expect(result).toContain('Readiness: 72/100 CAUTION (partial');
    expect(result).toContain('scored without HRV or sleep');
  });

  it('does not mark a complete readiness score as partial', () => {
    const vitals = { rhr: 58, hrv: 27, sleep: 6.8 };
    const result = buildTrainingContext(null, vitals, 68, 'CAUTION', [], null);
    expect(result).toContain('Readiness: 68/100 CAUTION |');
    expect(result).not.toContain('partial');
  });

  it('uses em dashes for missing vitals fields', () => {
    const vitals = { rhr: null, hrv: null, sleep: null };
    const result = buildTrainingContext(null, vitals, 0, 'FATIGUED', [], null);
    expect(result).toContain('RHR: —');
    expect(result).toContain('HRV: —ms');
    expect(result).toContain('Sleep: —h');
  });

  it('includes today planned session when provided', () => {
    const planned = { type: 'Z2 Aerobic', label: '60min easy' };
    const result = buildTrainingContext(null, null, 0, 'READY', [], planned);
    expect(result).toContain("Today's session: Z2 Aerobic — 60min easy");
  });

  it('includes today planned session without label when label absent', () => {
    const planned = { type: 'Lower Strength' };
    const result = buildTrainingContext(null, null, 0, 'READY', [], planned);
    expect(result).toContain("Today's session: Lower Strength");
    expect(result).not.toContain('undefined');
  });

  it('includes recent sessions list', () => {
    const sessions = [
      { date: '2026-06-24', type: 'Z2 Aerobic', duration: '60', srpe: 4 },
      { date: '2026-06-23', type: 'Upper Strength', duration: '45', srpe: 6 },
    ];
    const result = buildTrainingContext(null, null, 0, 'READY', sessions, null);
    expect(result).toContain('Recent sessions (newest first):');
    expect(result).toContain('2026-06-24: Z2 Aerobic 60min sRPE 4');
    expect(result).toContain('2026-06-23: Upper Strength 45min sRPE 6');
  });

  it('omits duration and sRPE when absent', () => {
    const sessions = [{ date: '2026-06-24', type: 'Rest' }];
    const result = buildTrainingContext(null, null, 0, 'READY', sessions, null);
    expect(result).toContain('2026-06-24: Rest');
    expect(result).not.toContain('undefined');
    expect(result).not.toContain('NaN');
  });

  it('omits sections entirely when data absent', () => {
    const result = buildTrainingContext(null, null, 0, 'READY', [], null);
    expect(result).not.toContain('TSB:');
    expect(result).not.toContain('Readiness:');
    expect(result).not.toContain("Today's session:");
    expect(result).not.toContain('Recent sessions');
  });
});

// The header date and the "today's session" match both key off todayISO. It
// reads LOCAL calendar fields, not toISOString(): in a UTC+8 zone a UTC
// day would name yesterday for the whole local morning — precisely when
// readiness is checked and today's prescription asked about.
describe('todayISO', () => {
  const realTZ = globalThis.process.env.TZ;

  afterEach(() => {
    globalThis.process.env.TZ = realTZ;
    vi.useRealTimers();
  });

  it('reports the local day, not the UTC one, when the two differ', () => {
    globalThis.process.env.TZ = 'Asia/Singapore';
    vi.useFakeTimers();
    // 04:00 Saturday at UTC+8 is still Friday in UTC.
    vi.setSystemTime(new Date('2026-08-21T20:00:00Z'));

    expect(todayISO()).toBe('2026-08-22');
    expect(new Date().toISOString().split('T')[0]).toBe('2026-08-21');
  });

  it('feeds the context header the local day', () => {
    globalThis.process.env.TZ = 'Asia/Singapore';
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-21T20:00:00Z'));

    const result = buildTrainingContext(null, null, 0, 'READY', [], null);
    expect(result).toContain('CURRENT TRAINING DATA (as of 2026-08-22):');
  });
});

// Synthetic anchors only — example values, never real ones.
describe('buildTrainingContext — athlete anchors block', () => {
  const anchors = {
    rowing_cp: {
      key: 'rowing_cp',
      value: '200',
      unit: 'W',
      status: 'provisional',
    },
    hr_max_working: {
      key: 'hr_max_working',
      value: '180',
      unit: 'bpm',
      status: 'unvalidated',
    },
    current_phase: {
      key: 'current_phase',
      value: 'example-phase',
      status: null,
    },
    'niggle:example-knee': {
      key: 'niggle:example-knee',
      value: 'Example status',
      note: 'Example guardrail',
      status: 'provisional',
    },
    health_context: { key: 'health_context', value: 'PRIVATE-SENTINEL' },
    nutrition_targets: {
      key: 'nutrition_targets',
      value: '{"rest":{}}',
      unit: 'json',
    },
    doctrine_sha: { key: 'doctrine_sha', value: 'deadbeef' },
  };

  it('emits the anchors block first, with statuses', () => {
    const result = buildTrainingContext(
      null,
      null,
      0,
      'READY',
      [],
      null,
      false,
      anchors
    );
    const lines = result.split('\n');
    expect(lines[0]).toBe('ATHLETE ANCHORS (live; status in brackets):');
    expect(result).toContain('rowing_cp: 200 W (provisional)');
    expect(result).toContain('hr_max_working: 180 bpm (unvalidated)');
    expect(result).toContain('current_phase: example-phase');
    expect(result).toContain(
      'niggle:example-knee: Example status (provisional) — Example guardrail'
    );
    expect(result.indexOf('ATHLETE ANCHORS')).toBeLessThan(
      result.indexOf('CURRENT TRAINING DATA')
    );
  });

  it('never sends health_context, JSON anchors or doctrine_sha', () => {
    const result = buildTrainingContext(
      null,
      null,
      0,
      'READY',
      [],
      null,
      false,
      anchors
    );
    expect(result).not.toContain('PRIVATE-SENTINEL');
    expect(result).not.toContain('health_context');
    expect(result).not.toContain('nutrition_targets');
    expect(result).not.toContain('doctrine_sha');
  });

  it('truncates long text anchors to 600 chars', () => {
    const long = 'x'.repeat(900);
    const result = buildTrainingContext(
      null,
      null,
      0,
      'READY',
      [],
      null,
      false,
      {
        athlete_profile: { key: 'athlete_profile', value: long, unit: 'text' },
      }
    );
    const line = result
      .split('\n')
      .find((l) => l.startsWith('athlete_profile:'));
    expect(line).toBe(`athlete_profile: ${'x'.repeat(600)}…`);
  });

  it('emits no block when anchors are null or empty', () => {
    for (const a of [null, {}]) {
      const result = buildTrainingContext(
        null,
        null,
        0,
        'READY',
        [],
        null,
        false,
        a
      );
      expect(result).not.toContain('ATHLETE ANCHORS');
      expect(result.startsWith('CURRENT TRAINING DATA')).toBe(true);
    }
  });

  it('a 7-argument call is unchanged', () => {
    const seven = buildTrainingContext(null, null, 0, 'READY', [], null, false);
    expect(seven).not.toContain('ATHLETE ANCHORS');
    expect(seven.startsWith('CURRENT TRAINING DATA')).toBe(true);
  });
});
