import { describe, it, expect } from 'vitest';
import {
  groupLabDraws,
  formatLabValue,
  formatLabRange,
  orderInjuries,
} from '../healthRecords.js';

const lab = (over) => ({
  id: Math.random().toString(36),
  collected_on: '2026-08-01',
  panel: 'lipid',
  marker: 'LDL',
  value: 2.1,
  value_qualifier: null,
  unit: 'mmol/L',
  ref_low: null,
  ref_high: null,
  ref_source: null,
  ...over,
});

describe('groupLabDraws', () => {
  it('groups one panel by draw date, newest first, markers by name', () => {
    const rows = [
      lab({ collected_on: '2026-03-01', marker: 'LDL' }),
      lab({ collected_on: '2026-08-01', marker: 'Total' }),
      lab({ collected_on: '2026-08-01', marker: 'HDL' }),
      lab({ collected_on: '2026-08-01', marker: 'SHBG', panel: 'hormone' }),
      lab({ collected_on: '2026-05-01', marker: 'LDL' }),
    ];
    const draws = groupLabDraws(rows, 'lipid');
    expect(draws.map((d) => d.collectedOn)).toEqual([
      '2026-08-01',
      '2026-05-01',
      '2026-03-01',
    ]);
    expect(draws[0].markers.map((m) => m.marker)).toEqual(['HDL', 'Total']);
    expect(groupLabDraws(rows, 'hormone')[0].markers).toHaveLength(1);
  });

  it('keeps ref_source with its range on every marker', () => {
    const row = lab({
      panel: 'hormone',
      marker: 'Testosterone',
      ref_low: 8.6,
      ref_high: 29,
      ref_source: 'Lab printout',
    });
    const [draw] = groupLabDraws([row], 'hormone');
    expect(draw.markers[0]).toMatchObject({
      ref_low: 8.6,
      ref_high: 29,
      ref_source: 'Lab printout',
    });
  });

  it('returns no draws for null input or an absent panel', () => {
    expect(groupLabDraws(null, 'lipid')).toEqual([]);
    expect(groupLabDraws([lab({})], 'hormone')).toEqual([]);
  });

  it('keeps two equal dates in one draw (stable comparator)', () => {
    const draws = groupLabDraws(
      [lab({ marker: 'B' }), lab({ marker: 'A' })],
      'lipid'
    );
    expect(draws).toHaveLength(1);
  });
});

describe('formatLabValue', () => {
  it('prefixes a below-detection qualifier', () => {
    expect(
      formatLabValue(lab({ value: 0.5, value_qualifier: '<', unit: 'nmol/L' }))
    ).toBe('<0.5 nmol/L');
  });
  it('renders a plain value with its unit', () => {
    expect(formatLabValue(lab({ value: 2.1 }))).toBe('2.1 mmol/L');
  });
  it('omits a missing unit', () => {
    expect(formatLabValue(lab({ value: 3, unit: '' }))).toBe('3');
  });
});

describe('formatLabRange', () => {
  it('renders a two-sided range with its source', () => {
    expect(
      formatLabRange(lab({ ref_low: 8.6, ref_high: 29, ref_source: 'Lab' }))
    ).toBe('ref 8.6–29 (Lab)');
  });
  it('renders one-sided ranges', () => {
    expect(formatLabRange(lab({ ref_low: 1, ref_source: 'Lab' }))).toBe(
      'ref ≥1 (Lab)'
    );
    expect(formatLabRange(lab({ ref_high: 4, ref_source: 'Lab' }))).toBe(
      'ref ≤4 (Lab)'
    );
  });
  it('shows nothing without a range, or without a source', () => {
    expect(formatLabRange(lab({}))).toBe(null);
    expect(formatLabRange(lab({ ref_low: 1, ref_high: 2 }))).toBe(null);
  });
});

describe('orderInjuries', () => {
  it('puts active and monitoring before resolved, stable within a group', () => {
    const rows = [
      { id: 'r1', status: 'resolved' },
      { id: 'm1', status: 'monitoring' },
      { id: 'a1', status: 'active' },
      { id: 'r2', status: 'resolved' },
      { id: 'a2', status: 'active' },
    ];
    expect(orderInjuries(rows).map((r) => r.id)).toEqual([
      'a1',
      'a2',
      'm1',
      'r1',
      'r2',
    ]);
    expect(rows[0].id).toBe('r1');
  });
  it('handles null and an unknown status', () => {
    expect(orderInjuries(null)).toEqual([]);
    expect(
      orderInjuries([
        { id: 'r', status: 'resolved' },
        { id: 'x', status: 'weird' },
      ]).map((r) => r.id)
    ).toEqual(['x', 'r']);
  });
});
