#!/usr/bin/env node
// Renders the CI bundle-size report as markdown on stdout: the current gzipped
// total (dist/bundle-size.json, written by check-bundle-size.mjs) diffed
// against the main-branch baseline restored by actions/cache. Reporting only —
// the pass/fail gate stays in check-bundle-size.mjs.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const current = JSON.parse(
  readFileSync(join(process.cwd(), 'dist', 'bundle-size.json'), 'utf8')
);
const baselinePath = process.argv[2];

const kb = (b) => `${(b / 1024).toFixed(1)} KB`;
const signedKb = (b) => `${b >= 0 ? '+' : '−'}${kb(Math.abs(b))}`;

const overBudget = current.total > current.budgetKb * 1024;
const lines = [
  '<!-- bundle-size-report -->',
  '## Bundle size',
  '',
  `**${kb(current.total)}** gzipped — budget ${current.budgetKb} KB ${overBudget ? '❌ over budget' : '✅'}`,
];

if (baselinePath && existsSync(baselinePath)) {
  const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
  const delta = current.total - baseline.total;
  const noise = Math.abs(delta) < 512;
  lines.push(
    '',
    `Δ vs main: **${noise ? '±0.0 KB' : signedKb(delta)}** (main baseline ${kb(baseline.total)})`
  );
} else {
  lines.push('', '_No main-branch baseline available for comparison._');
}

lines.push(
  '',
  '<details><summary>Per-asset breakdown</summary>',
  '',
  '| Asset | Gzipped |',
  '| --- | ---: |',
  ...current.assets.map((a) => `| \`${a.file}\` | ${kb(a.gzip)} |`),
  '',
  '</details>'
);

console.log(lines.join('\n'));
