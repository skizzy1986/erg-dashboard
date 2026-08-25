import { describe, it, expect } from 'vitest';
import { cssVars, cssVarName, alpha } from '../themeCss.js';
import { THEME } from '../../constants/theme.js';
import { DARK } from '../../constants/themeValues.js';

describe('cssVars', () => {
  it('emits a --color-<key>: <value>; declaration for every palette key', () => {
    const out = cssVars(DARK);
    for (const [key, value] of Object.entries(DARK)) {
      expect(out).toContain(`${cssVarName(key)}: ${value};`);
    }
  });

  it('emits exactly one declaration per palette key (no missing, no extras)', () => {
    const out = cssVars(DARK);
    const count = (out.match(/--color-/g) ?? []).length;
    expect(count).toBe(Object.keys(DARK).length);
  });

  // The seam's one-way trap: cssVars(THEME) emits `--color-x: var(--color-x)`,
  // a self-reference that resolves to nothing and paints an unstyled page. It
  // must be fed values, never the pointer table. See HANDOFF.md §1.
  it('a declaration never resolves to itself', () => {
    const out = cssVars(DARK);
    expect(out).not.toMatch(/--color-(\w+):\s*var\(--color-\1\)/);
  });

  it('would self-reference if fed THEME — the mistake this guards', () => {
    const wrong = cssVars(THEME);
    expect(wrong).toMatch(/--color-(\w+):\s*var\(--color-\1\)/);
  });

  it('opens with a :root block', () => {
    const out = cssVars(DARK);
    expect(out.startsWith(':root {')).toBe(true);
    expect(out.trimEnd().endsWith('}')).toBe(true);
  });

  it('is generic and pure for any object', () => {
    const out = cssVars({ foo: 'bar', baz: 'qux' });
    expect(out).toContain('--color-foo: bar;');
    expect(out).toContain('--color-baz: qux;');
    expect((out.match(/--color-/g) ?? []).length).toBe(2);
    expect(out.startsWith(':root {')).toBe(true);
  });
});

describe('alpha', () => {
  // The suffixes actually in use across web/src, with the percentage each
  // two-digit hex denotes. These are the values the views rendered before the
  // token seam, when THEME held literals and `${THEME.accent}15` concatenated
  // into #00d4ff15.
  it.each([
    ['10', 6.27],
    ['12', 7.06],
    ['15', 8.24],
    ['18', 9.41],
    ['20', 12.55],
    ['30', 18.82],
    ['40', 25.1],
    ['50', 31.37],
    ['66', 40],
    ['99', 60],
  ])('reads %s as %s%%', (hexPair, pct) => {
    expect(alpha('var(--color-accent)', hexPair)).toBe(
      `color-mix(in srgb, var(--color-accent) ${pct}%, transparent)`
    );
  });

  it('emits one CSS component, not a token followed by a bare number', () => {
    // The whole point. `var(--color-accent)15` parses as two components, which
    // makes the declaration invalid at computed-value time and the browser
    // drops it silently. Nothing may trail the closing paren.
    expect(alpha(THEME.accent, '30')).toMatch(/^color-mix\(.*\)$/);
    expect(alpha(THEME.accent, '30')).not.toMatch(/\)\s*[0-9a-fA-F]{2}$/);
  });

  it('takes a var() reference, so it resolves on whichever theme is live', () => {
    expect(alpha(THEME.critical, '50')).toContain('var(--color-critical)');
  });
});
