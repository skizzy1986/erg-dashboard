import { describe, it, expect } from 'vitest';
import { splashCss } from '../splashCss.js';
import { THEME } from '../../constants/theme.js';

// Substitution, not "contains no hex" — THEME values ARE hexes, so the only
// honest proof that a colour came from the token is swapping the token and
// watching the output follow.
const SUBSTITUTED = [
  ['bg', '#010101'],
  ['accent', '#ff0000'],
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

  it('derives the translucent accents from the accent token', () => {
    const css = splashCss({ ...THEME, accent: '#010203' });
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

  // AC4: the loop set must keep running for as long as the splash is mounted.
  // Dropping `infinite` would leave a frozen frame over an unknown wait.
  it('loops the four continuous animations for as long as it is mounted', () => {
    const css = splashCss(THEME);
    for (const name of ['glow', 'draw', 'head', 'track']) {
      const rule = css
        .split('\n')
        .find((line) => line.includes(`animation: siq-splash-${name} `));
      expect(rule, `no rule drives siq-splash-${name}`).toBeTruthy();
      expect(rule).toContain('infinite');
    }
  });

  it('runs the entrances once so they settle instead of replaying', () => {
    const css = splashCss(THEME);
    for (const name of ['tile', 'halo', 'base', 'word', 'sub']) {
      const rule = css
        .split('\n')
        .find((line) => line.includes(`animation: siq-splash-${name} `));
      expect(rule, `no rule drives siq-splash-${name}`).toBeTruthy();
      expect(rule).not.toContain('infinite');
      expect(rule).toContain('both');
    }
  });

  // A new animated element that nobody adds to stillRules() would keep moving
  // under prefers-reduced-motion, which is the whole failure this guards.
  it('stills every element it animates', () => {
    const css = splashCss(THEME);
    const animated = new Set(
      [...css.matchAll(/\.(siq-splash__[a-z-]+)\s*\{[^}]*animation:/g)].map(
        (m) => m[1]
      )
    );
    expect(animated.size).toBeGreaterThan(0);
    const still = css.slice(css.indexOf('.siq-splash--still'));
    for (const cls of animated) {
      expect(still, `${cls} is animated but never stilled`).toContain(
        `.siq-splash--still .${cls}`
      );
    }
  });
});
