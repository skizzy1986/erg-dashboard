import { describe, it, expect } from 'vitest';
import { THEME } from '../theme.js';

const EXPECTED_KEYS = [
  'bg',
  'surface',
  'raised',
  'field',
  'border',
  'text',
  'muted',
  'accent',
  'positive',
  'caution',
  'warning',
  'critical',
  'accentAlt',
  'accentAlt2',
  'cycling',
  'surfaceAlt',
  'surfaceDeep',
  'neutral',
  'textSubtle',
  'textFaint',
  'textDim',
  'divider',
  'neutralAccent',
  'textStrong',
];

describe('THEME', () => {
  it('has exactly the 24 expected keys (no more, no fewer)', () => {
    const keys = Object.keys(THEME);
    expect(keys).toHaveLength(24);
    expect(keys.sort()).toEqual([...EXPECTED_KEYS].sort());
  });

  it('every value is a 6-digit lowercase hex colour', () => {
    for (const value of Object.values(THEME)) {
      expect(value).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('locks the canonical values', () => {
    expect(THEME.bg).toBe('#08080d');
    expect(THEME.surface).toBe('#1a1a2e');
    expect(THEME.raised).toBe('#2a2a48');
    expect(THEME.field).toBe('#08080d');
    expect(THEME.border).toBe('#4a4a68');
    expect(THEME.text).toBe('#e8e8f0');
    expect(THEME.muted).toBe('#7e7e9a');
    expect(THEME.accent).toBe('#00d4ff');
    expect(THEME.positive).toBe('#34d399');
    expect(THEME.caution).toBe('#ffd700');
    expect(THEME.warning).toBe('#ff6b35');
    expect(THEME.critical).toBe('#ff2d55');
    expect(THEME.accentAlt).toBe('#a78bfa');
    expect(THEME.accentAlt2).toBe('#f472b6');
    expect(THEME.cycling).toBe('#2dd4bf');
    expect(THEME.surfaceAlt).toBe('#1e1e30');
    expect(THEME.surfaceDeep).toBe('#12121f');
    expect(THEME.neutral).toBe('#3a3a4a');
    expect(THEME.textSubtle).toBe('#aaaacc');
    expect(THEME.textFaint).toBe('#6c6c88');
    expect(THEME.textDim).toBe('#5a5a74');
    expect(THEME.divider).toBe('#3e3e5a');
    expect(THEME.neutralAccent).toBe('#888888');
    expect(THEME.textStrong).toBe('#ffffff');
  });
});
