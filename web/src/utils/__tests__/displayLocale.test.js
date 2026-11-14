import {
  dateLocale,
  displayChartDate,
  displayLogDate,
} from '../displayLocale.js';

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

describe('displayLogDate (stored M/D/YY, shown)', () => {
  it('leaves English exactly as stored', () => {
    expect(displayLogDate('en', '6/19/26')).toBe('6/19/26');
    expect(displayLogDate('en', '12/1/26')).toBe('12/1/26');
  });

  it('shows Spanish day first, unpadded like the stored form', () => {
    expect(displayLogDate('es', '6/19/26')).toBe('19/6/26');
    expect(displayLogDate('es', '12/1/26')).toBe('1/12/26');
  });

  it('passes through anything that is not a stored date', () => {
    for (const v of ['2026-06-19', '', 'today', null, undefined, 7]) {
      expect(displayLogDate('es', v)).toBe(v);
    }
  });
});

describe('displayChartDate (chart MM/DD labels)', () => {
  it('flips to DD/MM in Spanish only', () => {
    expect(displayChartDate('en', '06/07')).toBe('06/07');
    expect(displayChartDate('es', '06/07')).toBe('07/06');
    expect(displayChartDate('es', '6/7')).toBe('7/6');
  });

  it('passes through anything else', () => {
    for (const v of ['2026-06-07', '06/07/26', '', null]) {
      expect(displayChartDate('es', v)).toBe(v);
    }
  });
});
