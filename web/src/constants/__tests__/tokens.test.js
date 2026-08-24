import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SPACE, RADIUS, TYPE, LAYER, BREAKPOINT } from '../tokens.js';

const srcRoot = join(import.meta.dirname, '../..');
const read = (p) => readFileSync(join(srcRoot, p), 'utf8');

describe('SPACE', () => {
  it('is a 4px base with no stray 6 or 10', () => {
    expect(Object.values(SPACE)).toEqual([2, 4, 8, 12, 16, 24, 32]);
  });

  it('ascends', () => {
    const v = Object.values(SPACE);
    expect(v).toEqual([...v].sort((a, b) => a - b));
  });
});

describe('RADIUS', () => {
  it('settles cards on 12 and keeps 6 for chips', () => {
    expect(RADIUS.md).toBe(12);
    expect(RADIUS.sm).toBe(6);
    expect(RADIUS.pill).toBe(999);
  });
});

describe('TYPE', () => {
  it('carries the four ranks a screen uses', () => {
    expect(TYPE.hero.size).toBe(52);
    expect(TYPE.title.size).toBe(20);
    expect(TYPE.body.size).toBe(14);
    expect(TYPE.micro.size).toBe(9);
  });

  it('never specifies a weight below the 500 floor', () => {
    for (const [rank, spec] of Object.entries(TYPE)) {
      expect(spec.weight, rank).toBeGreaterThanOrEqual(500);
    }
  });

  it('puts labels and section labels at 700, per conventions.md', () => {
    expect(TYPE.label.weight).toBe(700);
    expect(TYPE.micro.weight).toBe(700);
  });

  it('keeps the section label tracked and tiny', () => {
    expect(TYPE.micro.letterSpacing).toBeGreaterThanOrEqual(2);
  });
});

describe('LAYER', () => {
  it('ascends in the order things stack', () => {
    const order = [
      'base',
      'sticky',
      'nav',
      'bar',
      'backdrop',
      'sheet',
      'toast',
      'modal',
    ];
    const v = order.map((k) => LAYER[k]);
    expect(v).toEqual([...v].sort((a, b) => a - b));
  });

  // The live defect S0 exists to end: StrengthLogger's toast sat at 80 and its
  // modal backdrop at 50, both below BottomTabBar's 100, so a toast fired from
  // the logger rendered behind the nav (DESIGN_BRIEF.md §7).
  it('puts every overlay above the nav', () => {
    for (const k of ['bar', 'backdrop', 'sheet', 'toast', 'modal']) {
      expect(LAYER[k], k).toBeGreaterThan(LAYER.nav);
    }
  });

  it('is what the nav and the logger overlays actually use', () => {
    expect(read('components/mobile/BottomTabBar.jsx')).toContain(
      'zIndex: LAYER.nav'
    );
    const logger = read('StrengthLogger.jsx');
    for (const slot of ['bar', 'backdrop', 'toast']) {
      expect(logger, slot).toContain(`z-index:\${LAYER.${slot}}`);
    }
    expect(logger).not.toMatch(/z-index:\d+/);
  });
});

describe('BREAKPOINT', () => {
  it('is the single 767 fork useIsMobile already reads', () => {
    expect(BREAKPOINT.compact).toBe(767);
    expect(read('hooks/useIsMobile.js')).toContain('767');
  });
});
