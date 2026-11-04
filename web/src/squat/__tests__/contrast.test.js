import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DARK, LIGHT } from '../../constants/themeValues.js';
import { GROUNDS, PAIRS } from '../constants/contrastPairs.js';

const SQUAT_DIR = join(process.cwd(), 'src/squat');

const channels = (hex) =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const luminance = (rgb) => {
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
// Same percentage alpha() in utils/themeCss.js hands color-mix(in srgb).
const composite = (layers, palette) =>
  layers.reduce((under, [token, a]) => {
    const top = channels(palette[token]);
    const k = a ? parseInt(a, 16) / 255 : 1;
    return under
      ? top.map((c, i) => c * k + under[i] * (1 - k))
      : top.map((c) => c * k);
  }, null);
const ratio = (fgRgb, bgRgb) => {
  const [hi, lo] = [luminance(fgRgb), luminance(bgRgb)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
};

function sources(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const p = join(dir, entry.name);
    if (entry.isDirectory())
      return entry.name === '__tests__' ? [] : sources(p);
    return /\.(js|jsx)$/.test(entry.name) ? [[p, readFileSync(p, 'utf8')]] : [];
  });
}

describe('squat tool contrast (WCAG 1.4.3)', () => {
  for (const [name, palette] of [
    ['LIGHT', LIGHT],
    ['DARK', DARK],
  ]) {
    it.each(PAIRS)(
      `${name}: $fg on $ground ($where)`,
      ({ fg, ground, large }) => {
        const r = ratio(
          channels(palette[fg]),
          composite(GROUNDS[ground], palette)
        );
        expect(r).toBeGreaterThanOrEqual(large ? 3 : 4.5);
      }
    );
  }

  it('the pair list covers every ink the tool sets', () => {
    const inks = new Set();
    for (const [, src] of sources(SQUAT_DIR)) {
      for (const line of src.split('\n')) {
        if (/^\s*color:/.test(line)) {
          for (const m of line.matchAll(/THEME\.(\w+)/g)) inks.add(m[1]);
        }
      }
      for (const m of src.matchAll(/chip\(THEME\.(\w+)\)/g)) inks.add(m[1]);
    }
    const covered = new Set(PAIRS.map((p) => p.fg));
    expect([...inks].filter((t) => !covered.has(t))).toEqual([]);
    expect(inks.size).toBeGreaterThan(4);
  });

  it('the dark error ink would have failed — why the error is in text', () => {
    expect(
      ratio(channels(DARK.critical), composite(GROUNDS.surfaceAlt, DARK))
    ).toBeLessThan(4.5);
  });

  it('never uses muted for text — it misses AA on dark cards', () => {
    const offenders = sources(SQUAT_DIR)
      .filter(([, src]) => /THEME\.muted\b/.test(src))
      .map(([p]) => p);
    expect(offenders).toEqual([]);
  });

  it('every ground layer names a real token in both palettes', () => {
    for (const layers of Object.values(GROUNDS)) {
      for (const [token] of layers) {
        expect(LIGHT[token]).toMatch(/^#[0-9a-f]{6}$/i);
        expect(DARK[token]).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });
});
