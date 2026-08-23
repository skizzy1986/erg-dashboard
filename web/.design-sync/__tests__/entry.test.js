// Guards the design-sync barrel against dead re-exports. A re-export naming a
// binding the source module no longer has does not throw on import — the key is
// present with value `undefined`, so the bundle ships a `window.SplitIQ` member
// that silently breaks every preview using it.
//
// What this does NOT prove: it resolves `entry.jsx` through Vite's module
// transform, not through the design-sync IIFE bundler. Failures specific to that
// bundle — such as the `import.meta.env` throw that keeps `LogSessionForm`
// excluded (see NOTES.md) — will not reproduce here.
//
// Test globals are scoped to `src/**` in eslint.config.js, so import them.
import { describe, it, expect } from 'vitest';
import * as entry from '../entry.jsx';

// Derived, not hand-listed: NOTES.md already records two hand-maintained lists
// as re-sync risks. PascalCase names are the components; SCREAMING_CASE ones
// (THEME, C, ICON) are the data tokens.
const isComponentName = (name) => /^[A-Z][a-z]/.test(name);

describe('design-sync entry barrel', () => {
  it('exposes a non-empty public surface', () => {
    expect(Object.keys(entry).length).toBeGreaterThan(0);
  });

  it('has no dead re-exports', () => {
    const dead = Object.keys(entry).filter((key) => entry[key] === undefined);
    expect(
      dead,
      `entry.jsx re-exports bindings the source no longer has: ${dead.join(', ')}`
    ).toEqual([]);
  });

  it('exports every component as a function', () => {
    const components = Object.keys(entry).filter(isComponentName);
    expect(components.length).toBeGreaterThanOrEqual(10);
    for (const name of components) {
      expect(typeof entry[name], `${name} is not a component`).toBe('function');
    }
  });
});
