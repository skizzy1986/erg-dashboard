import { describe, it, expect } from 'vitest';
import { THEME } from '../theme.js';
import { DARK } from '../themeValues.js';
import { cssVarName } from '../../utils/themeCss.js';

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

  it('is a pointer table — every value is a var(--color-*) reference', () => {
    for (const [key, value] of Object.entries(THEME)) {
      expect(value).toBe(`var(${cssVarName(key)})`);
    }
  });

  it('points at exactly the keys the palette defines', () => {
    expect(Object.keys(THEME).sort()).toEqual(Object.keys(DARK).sort());
  });
});

describe('DARK — the palette values THEME resolves to', () => {
  it('has exactly the 24 expected keys (no more, no fewer)', () => {
    const keys = Object.keys(DARK);
    expect(keys).toHaveLength(24);
    expect(keys.sort()).toEqual([...EXPECTED_KEYS].sort());
  });

  it('every value is a 6-digit lowercase hex colour', () => {
    for (const value of Object.values(DARK)) {
      expect(value).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('locks the canonical values', () => {
    expect(DARK.bg).toBe('#08080d');
    expect(DARK.surface).toBe('#1a1a2e');
    expect(DARK.raised).toBe('#2a2a48');
    expect(DARK.field).toBe('#08080d');
    expect(DARK.border).toBe('#4a4a68');
    expect(DARK.text).toBe('#e8e8f0');
    expect(DARK.muted).toBe('#7e7e9a');
    expect(DARK.accent).toBe('#00d4ff');
    expect(DARK.positive).toBe('#34d399');
    expect(DARK.caution).toBe('#ffd700');
    expect(DARK.warning).toBe('#ff6b35');
    expect(DARK.critical).toBe('#ff2d55');
    expect(DARK.accentAlt).toBe('#a78bfa');
    expect(DARK.accentAlt2).toBe('#f472b6');
    expect(DARK.cycling).toBe('#2dd4bf');
    expect(DARK.surfaceAlt).toBe('#1e1e30');
    expect(DARK.surfaceDeep).toBe('#12121f');
    expect(DARK.neutral).toBe('#3a3a4a');
    expect(DARK.textSubtle).toBe('#aaaacc');
    expect(DARK.textFaint).toBe('#6c6c88');
    expect(DARK.textDim).toBe('#5a5a74');
    expect(DARK.divider).toBe('#3e3e5a');
    expect(DARK.neutralAccent).toBe('#888888');
    expect(DARK.textStrong).toBe('#ffffff');
  });
});
