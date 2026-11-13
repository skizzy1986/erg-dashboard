import { DARK, LIGHT } from '../../constants/themeValues.js';
import { THEME } from '../../constants/theme.js';
import { emphasise, hexToRaw01 } from '../../anatomy/utils/sceneColours.js';
import { sceneStyle } from '../../anatomy/constants/sceneStyle.js';

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

describe('3D scene tokens', () => {
  const KEYS = [
    'anatomyMuscle',
    'anatomyTendon',
    'anatomyBone',
    'anatomyShadow',
    'anatomyBar',
    'anatomyHeatLow',
    'anatomyHeatMid',
    'anatomyHeatHigh',
    'anatomyHeatPeak',
    'anatomyFocus',
  ];

  it.each(KEYS)('%s is a pointer with a value on both themes', (k) => {
    // [a-z-]+, not [a-z]+: cssVarName('anatomyHeatLow') is
    // --color-anatomy-heat-low, which the single-segment form rejected.
    expect(THEME[k]).toMatch(/^var\(--color-anatomy-[a-z-]+\)$/);
    expect(LIGHT[k]).toMatch(/^#[0-9a-f]{6}$/);
    expect(DARK[k]).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('keeps tendon visibly lighter than muscle, so the blend reads', () => {
    for (const p of [LIGHT, DARK]) {
      expect(ratio(p.anatomyTendon, p.anatomyMuscle)).toBeGreaterThan(3);
    }
  });

  // PR B: a muscle picked in the list, painted over the plain model, beside
  // unselected muscle — WCAG 1.4.11's 3:1 for a graphical object, per theme.
  // Not also 3:1 against the light stage ground: against muscle red (~0.10
  // luminance) and the near-white ground (~0.9) no colour clears both, and
  // the neighbour that matters is the muscle around it.
  it('keeps the focus colour a 3:1 object against muscle', () => {
    for (const p of [LIGHT, DARK]) {
      expect(ratio(p.anatomyFocus, p.anatomyMuscle)).toBeGreaterThanOrEqual(3);
    }
    expect(LIGHT.anatomyFocus).not.toBe(DARK.anatomyFocus);
  });

  // With a muscle selected, every other muscle is dimmed toward its own grey
  // (emphasise at focusDim), so the neighbour the focus colour actually sits
  // beside is the DIMMED muscle, not the token. Same 3:1, per theme.
  it.each([
    ['light', LIGHT],
    ['dark', DARK],
  ])(
    'keeps the focus colour a 3:1 object against dimmed muscle (%s)',
    (name, p) => {
      const dimmed = emphasise(
        Float32Array.from(hexToRaw01(p.anatomyMuscle)),
        [0],
        { dim: sceneStyle(name).focusDim }
      );
      const hex = `#${[...dimmed]
        .map((c) =>
          Math.round(c * 255)
            .toString(16)
            .padStart(2, '0')
        )
        .join('')}`;
      expect(hex).not.toBe(p.anatomyMuscle);
      expect(ratio(p.anatomyFocus, hex)).toBeGreaterThanOrEqual(3);
    }
  );

  it('keeps the dark scene on the source page colours', () => {
    expect(DARK.anatomyMuscle).toBe('#a52529');
    expect(DARK.anatomyTendon).toBe('#d5dbe0');
  });

  it('starts the heat ramp on the same four stops in both themes', () => {
    for (const k of [
      'anatomyHeatLow',
      'anatomyHeatMid',
      'anatomyHeatHigh',
      'anatomyHeatPeak',
    ]) {
      expect(LIGHT[k]).toBe(DARK[k]);
    }
    expect(LIGHT.anatomyHeatLow).toBe('#3d5a8c');
    expect(LIGHT.anatomyHeatPeak).toBe('#ffd35c');
  });

  it('keeps every ramp stop distinct, so three bands read as three', () => {
    const stops = [
      LIGHT.anatomyHeatLow,
      LIGHT.anatomyHeatMid,
      LIGHT.anatomyHeatHigh,
      LIGHT.anatomyHeatPeak,
    ];
    expect(new Set(stops).size).toBe(4);
  });
});
