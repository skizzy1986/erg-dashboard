import { DARK, LIGHT } from '../../constants/themeValues.js';
import { THEME } from '../../constants/theme.js';

const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = c.map((x) =>
    x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe('squat provenance tokens', () => {
  it.each(['modelled', 'measured'])('%s is a pointer on both themes', (k) => {
    expect(THEME[k]).toBe(`var(--color-${k})`);
    expect(LIGHT[k]).toMatch(/^#[0-9a-f]{6}$/);
    expect(DARK[k]).toMatch(/^#[0-9a-f]{6}$/);
  });

  // They are used as small text (the "Reference ideal — modelled" chip), so
  // they need AA on every card ground they sit on.
  it.each(['modelled', 'measured'])('%s clears AA on card grounds', (k) => {
    for (const g of ['surface', 'raised', 'field']) {
      expect(ratio(LIGHT[k], LIGHT[g])).toBeGreaterThanOrEqual(4.5);
      expect(ratio(DARK[k], DARK[g])).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('keeps modelled and measured visibly different', () => {
    expect(LIGHT.modelled).not.toBe(LIGHT.measured);
    expect(DARK.modelled).not.toBe(DARK.measured);
  });
});
