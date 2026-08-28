import { describe, it, expect } from 'vitest';
import {
  describeConnection,
  describeErrorCode,
  ERROR_CODE_LABELS,
} from '../stravaStatus.js';

const NOW = new Date('2026-08-28T12:00:00Z');
const hoursAgo = (h) =>
  new Date(NOW.getTime() - h * 60 * 60 * 1000).toISOString();

// A healthy connected row. Each test overrides only the columns it is about.
const healthy = (over = {}) => ({
  connected: true,
  backfill_complete: true,
  last_run_at: hoursAgo(2),
  last_run_status: 'ok',
  last_error_code: null,
  imported_total: 12,
  adopted_total: 3,
  skipped_total: 0,
  failed_total: 0,
  ambiguous_activity_ids: [],
  rate_limit_resets_at: null,
  ...over,
});

describe('describeConnection — the eight kinds', () => {
  it('1. not_connected: a null row means never connected, not an error', () => {
    const s = describeConnection(null, NOW);
    expect(s.kind).toBe('not_connected');
    expect(s.canConnect).toBe(true);
    expect(s.canSync).toBe(false);
    expect(s.tone).toBe('muted');
    expect(s.headline).toMatch(/not connected/i);
  });

  it('1b. not_connected: an explicitly disconnected row', () => {
    const s = describeConnection(healthy({ connected: false }), NOW);
    expect(s.kind).toBe('not_connected');
    expect(s.canConnect).toBe(true);
  });

  it('1c. not_connected: an undefined row does not throw', () => {
    expect(describeConnection(undefined, NOW).kind).toBe('not_connected');
  });

  it('2. backfilling: reports imported and matched counts', () => {
    const s = describeConnection(
      healthy({
        backfill_complete: false,
        imported_total: 40,
        adopted_total: 7,
      }),
      NOW
    );
    expect(s.kind).toBe('backfilling');
    expect(s.headline).toContain('40 imported');
    expect(s.headline).toContain('7 matched to existing sessions');
    expect(s.canSync).toBe(true);
    expect(s.canConnect).toBe(false);
  });

  it('2b. backfilling: names the backfill start date when present', () => {
    const s = describeConnection(
      healthy({ backfill_complete: false, backfill_from: '2025-01-01' }),
      NOW
    );
    expect(s.detail).toContain('2025-01-01');
  });

  it('3. healthy: relative last sync and the imported count', () => {
    const s = describeConnection(healthy(), NOW);
    expect(s.kind).toBe('healthy');
    expect(s.headline).toBe('Last sync 2 hours ago · 12 sessions imported');
    expect(s.tone).toBe('positive');
    expect(s.canSync).toBe(true);
    expect(s.canConnect).toBe(false);
  });

  it("3b. healthy: 'noop' is a successful run, not a failure", () => {
    expect(
      describeConnection(healthy({ last_run_status: 'noop' }), NOW).kind
    ).toBe('healthy');
  });

  it('3c. healthy: a freshly connected row with no run yet', () => {
    const s = describeConnection(
      healthy({ last_run_at: null, last_run_status: null, imported_total: 0 }),
      NOW
    );
    expect(s.kind).toBe('healthy');
    expect(s.headline).toMatch(/waiting for the first sync/i);
  });

  it('3d. healthy: relative time degrades through minutes and days', () => {
    expect(
      describeConnection(healthy({ last_run_at: hoursAgo(0.005) }), NOW)
        .headline
    ).toContain('just now');
    expect(
      describeConnection(healthy({ last_run_at: hoursAgo(0.5) }), NOW).headline
    ).toContain('30 minutes ago');
    expect(
      describeConnection(healthy({ last_run_at: hoursAgo(1) }), NOW).headline
    ).toContain('1 hour ago');
  });

  it('4. auth_failed: offers a reconnect and blocks syncing', () => {
    const s = describeConnection(
      healthy({
        last_run_status: 'auth_failed',
        last_error_code: 'auth_failed',
      }),
      NOW
    );
    expect(s.kind).toBe('auth_failed');
    expect(s.headline).toMatch(/revoked/i);
    expect(s.canConnect).toBe(true);
    expect(s.canSync).toBe(false);
    expect(s.tone).toBe('critical');
  });

  it('4b. auth_failed: a more specific error code replaces the generic detail', () => {
    const s = describeConnection(
      healthy({
        last_run_status: 'auth_failed',
        last_error_code: 'insufficient_scope',
      }),
      NOW
    );
    expect(s.detail).toBe(ERROR_CODE_LABELS.insufficient_scope);
  });

  it('4c. auth_failed outranks an in-flight backfill', () => {
    const s = describeConnection(
      healthy({ last_run_status: 'auth_failed', backfill_complete: false }),
      NOW
    );
    expect(s.kind).toBe('auth_failed');
  });

  it('5. rate_limited: names the reset time and blocks sync until then', () => {
    const resets = new Date(NOW.getTime() + 20 * 60 * 1000);
    const s = describeConnection(
      healthy({
        last_run_status: 'rate_limited',
        last_error_code: 'rate_limited',
        rate_limit_resets_at: resets.toISOString(),
      }),
      NOW
    );
    expect(s.kind).toBe('rate_limited');
    expect(s.canSync).toBe(false);
    const hh = String(resets.getHours()).padStart(2, '0');
    const mm = String(resets.getMinutes()).padStart(2, '0');
    expect(s.headline).toContain(`${hh}:${mm}`);
  });

  it('5b. rate_limited: sync re-enables once the reset has passed', () => {
    const s = describeConnection(
      healthy({
        last_run_status: 'rate_limited',
        rate_limit_resets_at: hoursAgo(1),
      }),
      NOW
    );
    expect(s.kind).toBe('rate_limited');
    expect(s.canSync).toBe(true);
    expect(s.detail).toMatch(/reset/i);
  });

  it('5c. rate_limited: copes with a missing reset timestamp', () => {
    const s = describeConnection(
      healthy({ last_run_status: 'rate_limited', rate_limit_resets_at: null }),
      NOW
    );
    expect(s.kind).toBe('rate_limited');
    expect(s.headline).toMatch(/shortly/);
  });

  it('6. partial: counts plus the mapped error code', () => {
    const s = describeConnection(
      healthy({
        last_run_status: 'partial',
        imported_total: 9,
        failed_total: 2,
        last_error_code: 'upstream_5xx',
      }),
      NOW
    );
    expect(s.kind).toBe('partial');
    expect(s.headline).toBe('Last sync: 9 imported, 2 failed');
    expect(s.detail).toBe(ERROR_CODE_LABELS.upstream_5xx);
    expect(s.canSync).toBe(true);
  });

  it('6b. partial: failed_total alone is enough, whatever the status says', () => {
    const s = describeConnection(
      healthy({ last_run_status: 'ok', failed_total: 1 }),
      NOW
    );
    expect(s.kind).toBe('partial');
  });

  it("6c. partial: an outright 'error' run is not rendered as healthy", () => {
    const s = describeConnection(healthy({ last_run_status: 'error' }), NOW);
    expect(s.kind).toBe('partial');
    expect(s.detail).toBe(ERROR_CODE_LABELS.unknown);
  });

  it('7. ambiguous: reports how many activities were skipped', () => {
    const s = describeConnection(
      healthy({ ambiguous_activity_ids: [111, 222, 333] }),
      NOW
    );
    expect(s.kind).toBe('ambiguous');
    expect(s.headline).toBe(
      '3 activities matched more than one existing session and were skipped'
    );
    expect(s.tone).toBe('caution');
  });

  it('7b. ambiguous: a single id is singular', () => {
    const s = describeConnection(healthy({ ambiguous_activity_ids: [7] }), NOW);
    expect(s.headline).toContain('1 activity matched');
  });

  it('8. stale: no successful sync in N days', () => {
    const s = describeConnection(healthy({ last_run_at: hoursAgo(72) }), NOW);
    expect(s.kind).toBe('stale');
    expect(s.headline).toBe('No successful sync in 3 days');
    expect(s.canSync).toBe(true);
  });
});

describe('describeConnection — the 48h staleness boundary', () => {
  it('47 hours is still healthy', () => {
    expect(
      describeConnection(healthy({ last_run_at: hoursAgo(47) }), NOW).kind
    ).toBe('healthy');
  });

  it('49 hours is stale', () => {
    expect(
      describeConnection(healthy({ last_run_at: hoursAgo(49) }), NOW).kind
    ).toBe('stale');
  });

  it('exactly 48 hours is not yet stale', () => {
    expect(
      describeConnection(healthy({ last_run_at: hoursAgo(48) }), NOW).kind
    ).toBe('healthy');
  });

  it('a never-run connection is not stale', () => {
    const s = describeConnection(
      healthy({ last_run_at: null, last_run_status: null }),
      NOW
    );
    expect(s.kind).not.toBe('stale');
  });

  it('a stuck backfill reads as stale rather than promising progress', () => {
    const s = describeConnection(
      healthy({ backfill_complete: false, last_run_at: hoursAgo(96) }),
      NOW
    );
    expect(s.kind).toBe('stale');
  });
});

describe('describeConnection — invariants', () => {
  it('tone is always a THEME key name, never a colour value', () => {
    const rows = [
      null,
      healthy(),
      healthy({ backfill_complete: false }),
      healthy({ last_run_status: 'auth_failed' }),
      healthy({ last_run_status: 'rate_limited' }),
      healthy({ last_run_status: 'partial' }),
      healthy({ ambiguous_activity_ids: [1] }),
      healthy({ last_run_at: hoursAgo(100) }),
    ];
    for (const row of rows) {
      const { tone } = describeConnection(row, NOW);
      expect(tone).toMatch(/^[a-z][A-Za-z0-9]*$/);
      expect(tone).not.toMatch(/#|var\(|rgb/);
    }
  });

  it('defaults `now` to the current time when not supplied', () => {
    expect(describeConnection(null).kind).toBe('not_connected');
  });

  it('tolerates a row with every optional column absent', () => {
    const s = describeConnection({ connected: true }, NOW);
    expect(s.kind).toBe('healthy');
    expect(s.headline).toMatch(/waiting for the first sync/i);
  });
});

describe('describeErrorCode', () => {
  const CODES = [
    'token_exchange_failed',
    'refresh_failed',
    'auth_failed',
    'rate_limited',
    'upstream_5xx',
    'insufficient_scope',
    'db_write_failed',
    'unknown',
  ];

  it('maps every last_error_code to a non-empty human string', () => {
    for (const code of CODES) {
      expect(typeof describeErrorCode(code)).toBe('string');
      expect(describeErrorCode(code).length).toBeGreaterThan(0);
    }
    expect(Object.keys(ERROR_CODE_LABELS).sort()).toEqual([...CODES].sort());
  });

  it('never leaks a raw enum value for an unrecognised code', () => {
    expect(describeErrorCode('something_new')).toBe(ERROR_CODE_LABELS.unknown);
    expect(describeErrorCode('something_new')).not.toContain('something_new');
  });

  it('returns an empty string for no code at all', () => {
    expect(describeErrorCode(null)).toBe('');
    expect(describeErrorCode(undefined)).toBe('');
  });
});
