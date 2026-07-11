import { describe, it, expect } from 'vitest';
import { cssVars } from '../themeCss.js';
import { THEME } from '../../constants/theme.js';

describe('cssVars', () => {
  it('emits a --color-<key>: <value>; declaration for every THEME key', () => {
    const out = cssVars(THEME);
    for (const [key, value] of Object.entries(THEME)) {
      expect(out).toContain(`--color-${key}: ${value};`);
    }
  });

  it('emits exactly one declaration per THEME key (no missing, no extras)', () => {
    const out = cssVars(THEME);
    const count = (out.match(/--color-/g) ?? []).length;
    expect(count).toBe(Object.keys(THEME).length);
  });

  it('opens with a :root block', () => {
    const out = cssVars(THEME);
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
