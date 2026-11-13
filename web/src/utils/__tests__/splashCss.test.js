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

  const ruleBlock = (css, selector) => {
    const start = css.indexOf(`${selector} {`);
    expect(start, `no ${selector} rule`).toBeGreaterThan(-1);
    return css.slice(start, css.indexOf('}', start));
  };

  // Every declaration block whose selector LIST names `selector`, so a rule
  // shared by several selectors (`a,\nb { … }`) still counts for each.
  const rulesFor = (css, selector) =>
    [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .filter(([, list]) =>
        list
          .split(',')
          .map((s) => s.trim())
          .includes(selector)
      )
      .map(([, , body]) => body)
      .join('\n');

  const reducedMotionBlock = (css) => {
    const start = css.indexOf('@media (prefers-reduced-motion: reduce)');
    expect(start).toBeGreaterThan(-1);
    return css.slice(start, css.indexOf('@supports', start));
  };

  it('sets the tagline on the title rank and the words on the label rank', () => {
    const css = splashCss(THEME);
    const tagline = ruleBlock(css, '.siq-splash__tagline');
    expect(tagline).toContain(`font-size: ${TYPE.title.size}px`);
    expect(tagline).toContain(`letter-spacing: ${TYPE.title.letterSpacing}px`);
    expect(tagline).toContain(`line-height: ${TYPE.title.lineHeight}`);
    const cycle = ruleBlock(css, '.siq-splash__cycle');
    expect(cycle).toContain(`font-size: ${TYPE.label.size}px`);
    expect(cycle).toContain(`font-weight: ${TYPE.label.weight}`);
    expect(cycle).toContain(`letter-spacing: ${TYPE.micro.letterSpacing}px`);
    expect(cycle).toContain('opacity: 0');
  });

  it('eases every new entrance on the same curve as the wordmark', () => {
    const css = splashCss(THEME);
    for (const selector of [
      '.siq-splash__cycle',
      '.siq-splash__tagline',
      '.siq-splash__tagline-head',
    ]) {
      expect(ruleBlock(css, selector)).toContain('cubic-bezier(.2, .8, .2, 1)');
    }
  });

  it('reads the tagline colour from text', () => {
    const css = splashCss({ ...THEME, text: '#020202' });
    expect(ruleBlock(css, '.siq-splash__tagline')).toContain('color: #020202');
  });

  it("sets the head word in the wordmark's mono accent, as a transformable box", () => {
    const head = ruleBlock(
      splashCss({ ...THEME, accent: '#ff0000' }),
      '.siq-splash__tagline-head'
    );
    expect(head).toContain('color: #ff0000');
    expect(head).toContain('font-family: var(--font-mono)');
    expect(head).toContain('display: inline-block');
  });

  const durationAndDelay = (css, selector, keyframe) =>
    ruleBlock(css, selector)
      .match(
        new RegExp(`${keyframe} (\\d+)ms cubic-bezier\\([^)]*\\)(?: (\\d+)ms)?`)
      )
      .slice(1)
      .map(Number);
  const delayOf = (css, selector) =>
    Number(ruleBlock(css, selector).match(/animation-delay: (\d+)ms/)[1]);

  it('staggers the three words, then resolves into the tagline and its head', () => {
    const css = splashCss(THEME);
    const delays = [1, 2, 3].map((n) =>
      delayOf(css, `.siq-splash__cycle--${n}`)
    );
    expect(delays[1]).toBeGreaterThan(delays[0]);
    expect(delays[2]).toBeGreaterThan(delays[1]);
    const [wordMs] = durationAndDelay(
      css,
      '.siq-splash__cycle',
      'siq-splash-cycle'
    );
    const [, taglineDelay] = durationAndDelay(
      css,
      '.siq-splash__tagline',
      'siq-splash-tagline'
    );
    const [, headDelay] = durationAndDelay(
      css,
      '.siq-splash__tagline-head',
      'siq-splash-tagline'
    );
    expect(taglineDelay).toBeGreaterThanOrEqual(delays[2] + wordMs - 80);
    expect(headDelay).toBeGreaterThan(taglineDelay);
  });

  it('fades each word out at the end of its keyframe', () => {
    const css = splashCss(THEME);
    const start = css.indexOf('@keyframes siq-splash-cycle');
    const frames = css.slice(start, css.indexOf('\n}', start));
    expect(frames).toMatch(/100% \{ opacity: 0;/);
  });

  it('stills to the full line alone: words hidden, tagline and head shown', () => {
    const css = splashCss(THEME);
    const still = css.slice(
      css.indexOf('.siq-splash--still'),
      css.indexOf('@media (prefers-reduced-motion: reduce)')
    );
    expect(rulesFor(still, '.siq-splash--still .siq-splash__cycle')).toContain(
      'opacity: 0'
    );
    for (const cls of ['siq-splash__tagline', 'siq-splash__tagline-head']) {
      const rules = rulesFor(still, `.siq-splash--still .${cls}`);
      expect(rules).toContain('animation: none !important');
      expect(rules).toContain('opacity: 1');
      expect(rules).toContain('transform: none');
    }
  });

  it('shows the tagline at rest under prefers-reduced-motion', () => {
    const block = reducedMotionBlock(splashCss(THEME));
    expect(rulesFor(block, '.siq-splash .siq-splash__cycle')).toContain(
      'opacity: 0'
    );
    for (const cls of ['siq-splash__tagline', 'siq-splash__tagline-head']) {
      const rules = rulesFor(block, `.siq-splash .${cls}`);
      expect(rules).toContain('animation: none !important');
      expect(rules).toContain('opacity: 1');
    }
  });

  it('leaves no trace of the retired discipline line', () => {
    const css = splashCss(THEME);
    expect(css).not.toContain('siq-splash__sub');
    expect(css).not.toContain('siq-splash-sub');
    expect(css).not.toContain('disciplines');
  });
});
