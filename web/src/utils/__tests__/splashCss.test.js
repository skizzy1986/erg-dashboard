import { describe, it, expect } from 'vitest';
import { splashCss } from '../splashCss.js';
import { THEME } from '../../constants/theme.js';

// Substitution, not "contains no hex" — THEME values ARE hexes, so the only
// honest proof that a colour came from the token is swapping the token and
// watching the output follow.
const SUBSTITUTED = [
  ['bg', '#010101'],
  ['cyan', '#ff0000'],
  ['text', '#020202'],
  ['textSubtle', '#030303'],
  ['surfaceAlt', '#040404'],
  ['surfaceDeep', '#050505'],
  ['divider', '#060606'],
];

describe('splashCss', () => {
  it.each(SUBSTITUTED)(
    'reads %s from the theme rather than a literal',
    (key, swapped) => {
      const css = splashCss({ ...THEME, [key]: swapped });
      expect(css).toContain(swapped);
      expect(css).not.toContain(THEME[key]);
    }
  );

  it('derives the translucent cyans from the cyan token', () => {
    const css = splashCss({ ...THEME, cyan: '#010203' });
    expect(css).toContain('rgba(1, 2, 3');
    expect(css).not.toContain('rgba(0, 212, 255');
  });

  it('defines all nine namespaced keyframes', () => {
    const css = splashCss(THEME);
    for (const name of [
      'glow',
      'tile',
      'halo',
      'draw',
      'head',
      'base',
      'word',
      'sub',
      'track',
    ]) {
      expect(css).toContain(`@keyframes siq-splash-${name}`);
    }
  });

  it('emits a still block holding the END state of every entrance', () => {
    const css = splashCss(THEME);
    const still = css.slice(css.indexOf('.siq-splash--still'));
    expect(still).toContain('animation: none !important');
    expect(still).toContain('stroke-dashoffset: 0');
    expect(still).toContain('transform: scaleX(1)');
    expect(still).toMatch(/\.siq-splash__track \{\n\s*display: none;/);
  });

  it('repeats the still state under a reduced-motion media query', () => {
    const css = splashCss(THEME);
    const media = css.indexOf('@media (prefers-reduced-motion: reduce)');
    expect(media).toBeGreaterThan(-1);
    const block = css.slice(media);
    expect(block).toContain('animation: none !important');
    expect(block).toContain('stroke-dashoffset: 0');
  });

  it('scopes every selector under .siq-splash', () => {
    const selectors = splashCss(THEME)
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('.'));
    expect(selectors.length).toBeGreaterThan(10);
    for (const selector of selectors) {
      expect(selector.startsWith('.siq-splash')).toBe(true);
    }
  });
});
