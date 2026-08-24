import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { FONT } from '../type.js';

const srcRoot = join(import.meta.dirname, '../..');
const webRoot = join(srcRoot, '..');

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' ? [] : walk(p);
    return /\.jsx?$/.test(e.name) ? [p] : [];
  });
const sources = walk(srcRoot).map((p) => [p, readFileSync(p, 'utf8')]);
const fontsCss = readFileSync(join(srcRoot, 'fonts.css'), 'utf8');

describe('FONT', () => {
  it('is a pointer table, like THEME', () => {
    expect(FONT.sans).toBe('var(--font-sans)');
    expect(FONT.mono).toBe('var(--font-mono)');
  });

  it('fonts.css defines both roles', () => {
    expect(fontsCss).toMatch(/--font-sans:\s*Archivo,/);
    expect(fontsCss).toMatch(/--font-mono:\s*'IBM Plex Mono',/);
  });
});

describe('the faces are actually loaded', () => {
  // The defect this closes: 'DM Mono' was named in ~45 places and loaded in
  // none, so the entire app rendered in the Courier fallback (#254).
  it('no source file names a font that is not self-hosted', () => {
    const offenders = sources
      .filter(([, s]) => /DM Mono/.test(s))
      .map(([p]) => p);
    expect(offenders).toEqual([]);
  });

  it('every woff2 fonts.css references exists on disk', () => {
    const urls = [...fontsCss.matchAll(/url\('\.\/([^']+)'\)/g)].map(
      (m) => m[1]
    );
    expect(urls.length).toBeGreaterThan(0);
    for (const u of urls) {
      expect(existsSync(join(srcRoot, u)), `${u} missing`).toBe(true);
    }
  });

  it('ships Archivo once as a variable face, not one file per weight', () => {
    expect(fontsCss).toMatch(/font-weight:\s*500 700;/);
    expect(fontsCss).toMatch(/format\('woff2-variations'\)/);
  });

  it('declares the three static IBM Plex Mono weights', () => {
    for (const w of [500, 600, 700]) {
      expect(fontsCss).toContain(`ibm-plex-mono-${w}.woff2`);
    }
  });

  it('the design bundle carries the same faces (cfg.extraFonts)', () => {
    // Without this the design system ships its own font closure and every
    // generated design keeps rendering in fallback after the app is fixed,
    // with nothing warning you — CODE-TO-DESIGN.md:106-113.
    const cfg = JSON.parse(
      readFileSync(join(webRoot, '.design-sync/config.json'), 'utf8')
    );
    expect(cfg.extraFonts?.length).toBeGreaterThan(0);
    for (const f of cfg.extraFonts) {
      expect(
        existsSync(
          join(webRoot, '.design-sync', f.replace('.design-sync/', ''))
        ),
        `${f} missing`
      ).toBe(true);
    }
  });
});

describe('weight floor 500', () => {
  // On a light ground Archivo below 500 reads thin (HANDOFF.md §1). The
  // variable face is declared 500-700, so a 400 request clamps up rather than
  // rendering light — but an explicit 400 in source is still a mistake.
  it('no source file asks for a weight below 500', () => {
    const offenders = [];
    for (const [p, s] of sources) {
      for (const m of s.matchAll(/fontWeight: (\d+)/g)) {
        if (Number(m[1]) < 500) offenders.push(`${p}: ${m[0]}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('no source file asks for a weight above the face it has', () => {
    const offenders = [];
    for (const [p, s] of sources) {
      for (const m of s.matchAll(/fontWeight: (\d+)/g)) {
        if (Number(m[1]) > 700) offenders.push(`${p}: ${m[0]}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
