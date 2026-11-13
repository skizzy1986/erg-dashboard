import { describe, it, expect } from 'vitest';
import { splashCss } from '../splashCss.js';
import { THEME } from '../../constants/theme.js';
import { TYPE } from '../../constants/tokens.js';

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
    expect(css).toContain('color-mix(in srgb, #010203 16%, transparent)');
    expect(css).toContain('color-mix(in srgb, #010203 55%, transparent)');
  });

  // THEME values are var(--color-*) pointers, not hexes (#287). Deriving the
  // translucent accents by parsing them produced rgba(NaN, ...) — dropped
  // silently by the browser, so the glow and the stroke halo just disappeared.
  // The substitution tests above pass a literal hex, so they never saw it.
  it('emits no unparsed colour when given the real THEME', () => {
    expect(splashCss(THEME)).not.toContain('NaN');
  });

  it('defines all ten namespaced keyframes', () => {
    const css = splashCss(THEME);
    for (const name of [
      'glow',
      'tile',
      'halo',
      'draw',
      'head',
      'base',
      'word',
      'cycle',
      'tagline',
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
    for (const name of ['tile', 'halo', 'base', 'word', 'cycle', 'tagline']) {
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

  it('sets the tagline on the caption type rank', () => {
    const css = splashCss(THEME);
    const start = css.indexOf('.siq-splash__tagline {');
    expect(start).toBeGreaterThan(-1);
    const block = css.slice(start, css.indexOf('}', start));
    expect(block).toContain(`font-size: ${TYPE.caption.size}px`);
    expect(block).toContain(`font-weight: ${TYPE.caption.weight}`);
  });

  const ruleBlock = (css, selector) => {
    const start = css.indexOf(`${selector} {`);
    expect(start, `no ${selector} rule`).toBeGreaterThan(-1);
    return css.slice(start, css.indexOf('}', start));
  };

  it('eases both new entrances on the same curve as the wordmark', () => {
    const css = splashCss(THEME);
    for (const selector of ['.siq-splash__cycle', '.siq-splash__tagline']) {
      expect(ruleBlock(css, selector)).toContain('cubic-bezier(.2, .8, .2, 1)');
    }
  });

  it('reads the tagline colour from textSubtle', () => {
    const css = splashCss({ ...THEME, textSubtle: '#030303' });
    expect(ruleBlock(css, '.siq-splash__tagline')).toContain('color: #030303');
  });

  const delayOf = (css, selector) =>
    Number(ruleBlock(css, selector).match(/animation-delay: (\d+)ms/)[1]);
  const taglineDelay = (css) =>
    Number(
      ruleBlock(css, '.siq-splash__tagline').match(
        /siq-splash-tagline \d+ms cubic-bezier\([^)]*\) (\d+)ms/
      )[1]
    );

  it('staggers the three words, then resolves into the tagline', () => {
    const css = splashCss(THEME);
    const delays = [1, 2, 3].map((n) =>
      delayOf(css, `.siq-splash__cycle--${n}`)
    );
    expect(delays[1]).toBeGreaterThan(delays[0]);
    expect(delays[2]).toBeGreaterThan(delays[1]);
    expect(ruleBlock(css, '.siq-splash__cycle')).toContain(
      'siq-splash-cycle 480ms'
    );
    expect(taglineDelay(css)).toBeGreaterThanOrEqual(delays[2] + 480 - 80);
  });

  it('fades each word out at the end of its keyframe', () => {
    const css = splashCss(THEME);
    const start = css.indexOf('@keyframes siq-splash-cycle');
    const frames = css.slice(start, css.indexOf('\n}', start));
    expect(frames).toMatch(/100% \{ opacity: 0;/);
  });

  it('sets the words on the micro type rank, hidden at rest', () => {
    const block = ruleBlock(splashCss(THEME), '.siq-splash__cycle');
    expect(block).toContain(`font-size: ${TYPE.micro.size}px`);
    expect(block).toContain(`font-weight: ${TYPE.micro.weight}`);
    expect(block).toContain(`letter-spacing: ${TYPE.micro.letterSpacing}px`);
    expect(block).toContain('opacity: 0');
  });

  it('stills to the tagline alone: words hidden, tagline shown', () => {
    const css = splashCss(THEME);
    const still = css.slice(css.indexOf('.siq-splash--still'));
    expect(ruleBlock(still, '.siq-splash--still .siq-splash__cycle')).toContain(
      'opacity: 0'
    );
    const tag = ruleBlock(still, '.siq-splash--still .siq-splash__tagline');
    expect(tag).toContain('opacity: 1');
    expect(tag).toContain('transform: none');
  });

  it('shows the tagline at rest under prefers-reduced-motion', () => {
    const css = splashCss(THEME);
    const block = css.slice(
      css.indexOf('@media (prefers-reduced-motion: reduce)')
    );
    expect(block).toContain('.siq-splash__tagline');
    expect(block).toContain('opacity: 1');
  });

  it('leaves no trace of the retired discipline line', () => {
    const css = splashCss(THEME);
    expect(css).not.toContain('siq-splash__sub');
    expect(css).not.toContain('siq-splash-sub');
    expect(css).not.toContain('disciplines');
  });
});
