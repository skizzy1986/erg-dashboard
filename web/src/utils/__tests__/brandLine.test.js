import { describe, it, expect } from 'vitest';
import { brandLine } from '../brandLine.js';
import { BRAND_LINE } from '../../constants/brandLine.js';

describe('brandLine', () => {
  it.each([['es'], ['es-CO'], ['ES']])('picks Spanish for %j', (locale) => {
    expect(brandLine(locale)).toBe(BRAND_LINE.es);
  });

  it.each([['en'], ['en-AU'], [''], [undefined], [null]])(
    'falls back to English for %j',
    (locale) => {
      expect(brandLine(locale)).toBe(BRAND_LINE.en);
    }
  );

  it('defaults to English when called with nothing', () => {
    expect(brandLine()).toBe(BRAND_LINE.en);
  });

  it('carries the lang each line is written in', () => {
    expect(BRAND_LINE.en).toEqual({
      lang: 'en',
      lead: 'Train',
      head: 'Smarter',
    });
    expect(BRAND_LINE.es).toEqual({
      lang: 'es',
      lead: 'Entrena con',
      head: 'cabeza',
    });
  });
});
