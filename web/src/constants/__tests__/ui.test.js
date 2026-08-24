import { describe, it, expect } from 'vitest';
import { C, ICON } from '../ui.js';
import { THEME } from '../theme.js';

// C used to carry raw hex literals (#279), so a light flip would have left the
// session-type accents behind on the dark palette. It now points at THEME. This
// locks both halves: that the indirection resolves to the values it replaced,
// and that each type keeps the accent its meaning is assigned in conventions.md.
const EXPECTED = {
  'Z2 Aerobic': ['#00d4ff', 'accent'],
  Threshold: ['#ffd700', 'caution'],
  'VO₂ Intervals': ['#ff6b35', 'warning'],
  Sharpener: ['#ff2d55', 'critical'],
  Rest: ['#3a3a4a', 'neutral'],
  'Upper Strength': ['#a78bfa', 'accentAlt'],
  'Lower Strength': ['#34d399', 'positive'],
  Combined: ['#f472b6', 'accentAlt2'],
  Cycling: ['#2dd4bf', 'cycling'],
};

describe('C — session type accents', () => {
  it('covers exactly the nine design-system session types', () => {
    expect(Object.keys(C).sort()).toEqual(Object.keys(EXPECTED).sort());
  });

  it('resolves to the values the raw literals carried', () => {
    for (const [type, [hex]] of Object.entries(EXPECTED)) {
      expect(C[type]).toBe(hex);
    }
  });

  it('reads every accent through THEME, never a literal', () => {
    for (const [type, [, token]] of Object.entries(EXPECTED)) {
      expect(C[type]).toBe(THEME[token]);
    }
  });
});

describe('ICON', () => {
  it('has an icon for every type C colours', () => {
    expect(Object.keys(ICON).sort()).toEqual(Object.keys(C).sort());
  });
});
