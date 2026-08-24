import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_THEME } from '../themeValues.js';

// The ground used to be written down in five places, each carrying a "keep in
// sync with THEME.bg" comment and no way to enforce it (#253). index.html and
// the PWA manifest are now substituted at build time from DEFAULT_THEME. The
// Android launch colours are a native resource the web build cannot reach, so
// they are gated here instead of trusted to a comment.
const webRoot = join(import.meta.dirname, '../../..');
const read = (p) => readFileSync(join(webRoot, p), 'utf8');

describe('the ground is written down once', () => {
  it('index.html defers to the build rather than hardcoding a colour', () => {
    const html = read('index.html');
    expect(html).toContain('content="%GROUND%"');
    expect(html).toContain('background: %GROUND%;');
    expect(html).not.toMatch(/#[0-9a-fA-F]{6}/);
  });

  it('the Android launch colours match DEFAULT_THEME.bg', () => {
    const xml = read('android/app/src/main/res/values/colors.xml');
    for (const name of ['colorPrimary', 'colorPrimaryDark']) {
      const found = xml.match(
        new RegExp(`<color name="${name}">(#[0-9a-fA-F]{6})</color>`)
      );
      expect(found, `${name} missing from colors.xml`).toBeTruthy();
      expect(found[1].toLowerCase()).toBe(DEFAULT_THEME.bg);
    }
  });

  it('there is only one PWA manifest', () => {
    // public/manifest.json was dead — linked from nowhere, shipped to dist, and
    // disagreeing with the live VitePWA manifest about the product's own name.
    expect(() => read('public/manifest.json')).toThrow();
  });
});
