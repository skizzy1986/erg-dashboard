import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tsbBand, TSB_BANDS } from '../trainingLoad.js';
import { DARK } from '../../constants/themeValues.js';

describe('tsbBand', () => {
  it('bands on +10 / -10 / -30, exclusive at each floor', () => {
    // `>` not `>=`, matching every call site this replaced.
    expect(tsbBand(10.1).key).toBe('fresh');
    expect(tsbBand(10).key).toBe('neutral');
    expect(tsbBand(-9.9).key).toBe('neutral');
    expect(tsbBand(-10).key).toBe('fatigued');
    expect(tsbBand(-29.9).key).toBe('fatigued');
    expect(tsbBand(-30).key).toBe('deep');
  });

  it('handles the extremes', () => {
    expect(tsbBand(999).key).toBe('fresh');
    expect(tsbBand(-999).key).toBe('deep');
  });

  // The bug this closes in three views: `null > -10` coerces to `0 > -10` and
  // returns true, so a missing reading painted amber "Neutral — balanced" as
  // though it were a mid-range value. ErgView guarded against it in a comment;
  // App.jsx, LoadTooltip and MobileAnalytics did not.
  it('returns null for a missing reading rather than a mid-range band', () => {
    for (const v of [null, undefined, NaN, Infinity, -Infinity]) {
      expect(tsbBand(v), String(v)).toBeNull();
    }
  });

  it('every token is a real palette key', () => {
    for (const b of TSB_BANDS) {
      expect(Object.keys(DARK), b.key).toContain(b.token);
    }
  });

  it('reproduces the Coach signal mapping exactly', () => {
    // Preserved, not corrected: useCoach banded on +10 / -10 alone, so
    // `fatigued` and `deep` both report RED. Changing what the Coach is told
    // is a training decision, not a refactor.
    expect(tsbBand(11).signal).toBe('GREEN');
    expect(tsbBand(0).signal).toBe('AMBER');
    expect(tsbBand(-20).signal).toBe('RED');
    expect(tsbBand(-40).signal).toBe('RED');
  });

  it('gives each band a distinct token and label', () => {
    expect(new Set(TSB_BANDS.map((b) => b.token)).size).toBe(TSB_BANDS.length);
    expect(new Set(TSB_BANDS.map((b) => b.label)).size).toBe(TSB_BANDS.length);
  });
});

describe('no surface bands TSB on its own thresholds', () => {
  // Six call sites had drifted into three different schemes: +10/-10/-30 on
  // four surfaces, +10/-10 in useCoach, and >5/>=-10 in ErgView — so a TSB of
  // 7 painted green on the erg tab and amber everywhere else.
  const srcRoot = join(import.meta.dirname, '../..');
  const walk = (dir) =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const p = join(dir, e.name);
      if (e.isDirectory()) return e.name === '__tests__' ? [] : walk(p);
      return /\.jsx?$/.test(e.name) ? [p] : [];
    });

  it('no source compares tsb to a band threshold inline', () => {
    const offenders = [];
    for (const p of walk(srcRoot)) {
      if (p.endsWith(join('utils', 'trainingLoad.js'))) continue;
      const s = readFileSync(p, 'utf8');
      for (const m of s.matchAll(/tsb\w*\s*>=?\s*-?\d+/gi)) {
        // `tsb > 0` is sign formatting for the +/- prefix, not a band.
        if (/>\s*0$/.test(m[0])) continue;
        offenders.push(`${p}: ${m[0]}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
