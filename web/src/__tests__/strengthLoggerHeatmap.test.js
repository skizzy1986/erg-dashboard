import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// The muscle heatmap has two halves that must agree: applyHeatmap() paints the
// diagram, and the legend is its colour key. The light flip moved the diagram
// onto tokens and left the legend on dark literals, so the key stopped
// describing the picture (Seer, PR #287). StrengthLogger is excluded from
// coverage and has no component tests, so this asserts on the source.
const src = readFileSync(
  join(import.meta.dirname, '../StrengthLogger.jsx'),
  'utf8'
);

const LEGEND = {
  Primary: 'critical',
  Secondary: 'caution',
  'Not emphasised': 'neutral',
};

describe('muscle heatmap', () => {
  it('paints the diagram through style, not a presentation attribute', () => {
    // A presentation attribute does not resolve var() in Safari; inline style
    // does everywhere, and outranks the SVG's own fill.
    expect(src).toContain('n.style.fill =');
    expect(src).not.toMatch(/setAttribute\(\s*'fill'/);
  });

  it('keys the legend to the same tokens the diagram is painted with', () => {
    for (const [label, token] of Object.entries(LEGEND)) {
      const swatch = new RegExp(
        `<i style="background:var\\(--color-${token}\\)"></i>${label}`
      );
      expect(src, `${label} swatch`).toMatch(swatch);
    }
  });

  it('uses exactly the three roles applyHeatmap assigns', () => {
    const painted = [...src.matchAll(/THEME\.(critical|caution|neutral)/g)].map(
      (m) => m[1]
    );
    for (const token of Object.values(LEGEND)) {
      expect(painted, `applyHeatmap should use ${token}`).toContain(token);
    }
  });

  it('leaves no dark literal in the diagram itself', () => {
    const svg = src.slice(src.indexOf('function heatmapSVG'));
    const head = svg.slice(0, svg.indexOf('</svg>'));
    expect(head).not.toMatch(/fill="#[0-9a-fA-F]{6}"/);
  });
});
