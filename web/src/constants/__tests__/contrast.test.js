import { describe, it, expect } from 'vitest';
import { DARK, LIGHT } from '../themeValues.js';

// WCAG 2.x relative luminance. conventions.md publishes measured ratios for the
// light palette and check:design-sync verifies the document's own arithmetic;
// this locks the *palette* against those numbers, so a token cannot be nudged
// without the failure landing here (#252).
const srgb = (c) => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return (
    0.2126 * srgb((n >> 16) & 255) +
    0.7152 * srgb((n >> 8) & 255) +
    0.0722 * srgb(n & 255)
  );
};
export const ratio = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

const AA = 4.5;
const AA_LARGE = 3;

describe('light palette — the ratios conventions.md publishes', () => {
  // conventions.md:137-141, to the digit it prints.
  const PUBLISHED = [
    ['text', 'surface', 16.55],
    ['text', 'surfaceAlt', 14.95],
    ['text', 'bg', 9.59],
    ['muted', 'surface', 8.1],
    ['muted', 'surfaceAlt', 7.32],
    ['muted', 'bg', 4.69],
    ['textSubtle', 'surface', 9.07],
    ['textSubtle', 'surfaceAlt', 8.2],
    ['textSubtle', 'bg', 5.26],
    ['textFaint', 'surface', 4.14],
    ['textDim', 'surface', 2.57],
  ];

  it.each(PUBLISHED)('%s on %s is %f:1', (ink, ground, expected) => {
    expect(ratio(LIGHT[ink], LIGHT[ground])).toBeCloseTo(expected, 1);
  });

  it('every body neutral passes AA on card, inset and ground', () => {
    for (const ink of ['text', 'muted', 'textSubtle']) {
      for (const ground of ['surface', 'surfaceAlt', 'bg']) {
        expect(
          ratio(LIGHT[ink], LIGHT[ground]),
          `${ink} on ${ground}`
        ).toBeGreaterThanOrEqual(AA);
      }
    }
  });

  it('textFaint is UI-and-large-text only — 3:1 on a card, never 4.5', () => {
    expect(ratio(LIGHT.textFaint, LIGHT.surface)).toBeGreaterThanOrEqual(
      AA_LARGE
    );
    expect(ratio(LIGHT.textFaint, LIGHT.surface)).toBeLessThan(AA);
  });

  it('textDim clears nothing anywhere — decorative marks only', () => {
    for (const ground of ['surface', 'surfaceAlt', 'bg']) {
      expect(ratio(LIGHT.textDim, LIGHT[ground])).toBeLessThan(AA_LARGE);
    }
  });

  const ACCENTS = [
    'accent',
    'positive',
    'caution',
    'warning',
    'critical',
    'accentAlt',
    'accentAlt2',
    'cycling',
  ];

  it('every accent ink passes AA on a card', () => {
    for (const ink of ACCENTS) {
      expect(ratio(LIGHT[ink], LIGHT.surface), ink).toBeGreaterThanOrEqual(AA);
    }
  });

  // conventions.md:156-158 — the single most likely way to reintroduce the
  // contrast failures this palette already paid for once. Asserted as a fact
  // about the palette so the rule cannot quietly stop being true.
  it('NO accent ink passes AA on the app ground', () => {
    for (const ink of ACCENTS) {
      expect(ratio(LIGHT[ink], LIGHT.bg), ink).toBeLessThan(AA);
    }
  });

  it('captions that are real text pass AA on the surface they sit on', () => {
    expect(ratio(LIGHT.neutralAccent, LIGHT.surface)).toBeGreaterThanOrEqual(
      AA
    );
    expect(ratio(LIGHT.textStrong, LIGHT.surface)).toBeGreaterThanOrEqual(AA);
  });
});

describe('dark palette — still AA where it already was', () => {
  it('text passes AA on every ground it lands on', () => {
    for (const ground of ['bg', 'surface', 'raised', 'field', 'surfaceAlt']) {
      expect(
        ratio(DARK.text, DARK[ground]),
        `text on ${ground}`
      ).toBeGreaterThanOrEqual(AA);
    }
  });

  it('textSubtle passes AA on surface and raised', () => {
    for (const ground of ['surface', 'raised']) {
      expect(
        ratio(DARK.textSubtle, DARK[ground]),
        `textSubtle on ${ground}`
      ).toBeGreaterThanOrEqual(AA);
    }
  });
});

// A filled accent button paints its label with THEME.surface, not THEME.bg.
// On dark that was near-black on a bright accent and passed; the flip made it
// #bcc5dd on #10795a — 3.11:1, which Lighthouse caught on the login screen and
// which held on seven more buttons it could not reach behind auth. `surface`
// works in both themes because it inverts with the accents: near-black on dark,
// white on light.
describe('text on a filled accent', () => {
  const FILLED = ['accent', 'positive', 'warning', 'critical', 'accentAlt'];

  it.each(FILLED)('surface on %s passes AA in the light theme', (fill) => {
    expect(ratio(LIGHT.surface, LIGHT[fill])).toBeGreaterThanOrEqual(AA);
  });

  it.each(FILLED)('surface on %s passes AA in the dark theme', (fill) => {
    expect(ratio(DARK.surface, DARK[fill])).toBeGreaterThanOrEqual(AA);
  });

  it('bg on a filled accent would fail on light — the regression', () => {
    expect(ratio(LIGHT.bg, LIGHT.positive)).toBeLessThan(AA);
  });
});
