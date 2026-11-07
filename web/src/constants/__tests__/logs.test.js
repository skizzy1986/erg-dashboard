import { describe, it, expect } from 'vitest';
import { LIPID_REF } from '../logs.js';

describe('LIPID_REF', () => {
  it('cites a named https source on every row', () => {
    for (const row of LIPID_REF) {
      expect(row.source.name).toBeTruthy();
      expect(row.source.url).toMatch(/^https:\/\//);
    }
  });

  it('matches the agreed AACB 2018 decision limits exactly', () => {
    expect(
      LIPID_REF.map(({ marker, target, unit }) => ({ marker, target, unit }))
    ).toEqual([
      { marker: 'Total Cholesterol', target: '≤ 5.5', unit: 'mmol/L' },
      { marker: 'LDL Cholesterol', target: '≤ 3.0', unit: 'mmol/L' },
      { marker: 'HDL Cholesterol (male)', target: '≥ 1.0', unit: 'mmol/L' },
      { marker: 'HDL Cholesterol (female)', target: '≥ 1.2', unit: 'mmol/L' },
      { marker: 'Triglycerides', target: '≤ 2.0', unit: 'mmol/L' },
    ]);
  });
});

describe('logs.js exports', () => {
  it('exports none of the removed personal health logs', async () => {
    // Concatenated so this file does not itself contain the removed names.
    const removed = [
      'bp' + 'Log',
      'bloods' + 'Log',
      'NIG' + 'GLES',
      'mobility' + 'Log',
      'nutrition' + 'Log',
      'HORMONE' + '_REF',
    ];
    const keys = Object.keys(await import('../logs.js'));
    for (const name of removed) expect(keys).not.toContain(name);
  });
});
