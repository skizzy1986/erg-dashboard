import { describe, it, expect } from 'vitest';
import { cssVars } from '../themeCss.js';
import { THEME } from '../../constants/theme.js';
import { DARK } from '../../constants/themeValues.js';

describe('cssVars', () => {
  it('emits a --color-<key>: <value>; declaration for every palette key', () => {
    const out = cssVars(DARK);
    for (const [key, value] of Object.entries(DARK)) {
      expect(out).toContain(`--color-${key}: ${value};`);
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
