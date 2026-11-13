import { dateLocale } from '../displayLocale.js';

describe('dateLocale', () => {
  it("keeps each site's English locale exactly, undefined included", () => {
    expect(dateLocale('en', 'en-GB')).toBe('en-GB');
    expect(dateLocale('en', 'en-AU')).toBe('en-AU');
    expect(dateLocale('en', undefined)).toBeUndefined();
  });

  it('uses es-CO in Spanish whatever the English site used', () => {
    expect(dateLocale('es', 'en-GB')).toBe('es-CO');
    expect(dateLocale('es', undefined)).toBe('es-CO');
  });
});
