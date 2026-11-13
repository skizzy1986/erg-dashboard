import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { cwd } from 'node:process';

// The static personal health logs were removed in #416. This pins the removed
// identifiers out of the browser tree, tests and e2e included. It does not
// catch data re-added under a new name; that is a review job.
// Vitest's root is web/; e2e/ is excluded from collection, so the guard lives
// in src/ and reaches across.
const ROOTS = [resolve(cwd(), 'src'), resolve(cwd(), 'e2e')];
const EXT = /\.(c|m)?jsx?$|\.(json|css|md|html)$/i;

const walk = (dir) =>
  readdirSync(dir).flatMap((entry) => {
    if (entry === 'node_modules') return [];
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    return EXT.test(entry) ? [full] : [];
  });

// Built by concatenation so this guard does not itself put the forbidden
// strings into src/ — a plain grep over the tree must come back empty.
// Case-sensitive on purpose: the lower-case word for minor aches is ordinary
// prose elsewhere; only the removed identifiers are forbidden.
const NEEDLES = [
  'bp' + 'Log',
  'bloods' + 'Log',
  'NIG' + 'GLES',
  'mobility' + 'Log',
  'nutrition' + 'Log',
  'HORMONE' + '_REF',
  'strength' + 'Trend',
  'MOBILITY_' + 'STREAK_NOTE',
  'PRIMARY_' + 'LIFTS',
];
const RE = new RegExp(NEEDLES.map((n) => `\\b${n}\\b`).join('|'));

const files = ROOTS.flatMap(walk);

describe('the removed personal health logs stay removed', () => {
  it('scans both web/src and web/e2e', () => {
    const rel = files.map((f) => relative(cwd(), f));
    expect(rel).toContain(join('e2e', 'smoke.spec.js'));
    expect(rel).toContain(join('src', 'App.jsx'));
  });

  it('matches its needles, case-sensitively', () => {
    for (const needle of NEEDLES) {
      expect(RE.test(' ' + needle + ' ')).toBe(true);
      expect(RE.test('x' + needle + 'x')).toBe(false);
    }
    expect(RE.test('nig' + 'gles')).toBe(false);
  });

  it('no file under web/src or web/e2e references a removed health log', () => {
    const offenders = [];
    for (const file of files) {
      readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          const m = line.match(RE);
          if (m) offenders.push(`${relative(cwd(), file)}:${i + 1}: ${m[0]}`);
        });
    }
    expect(offenders).toEqual([]);
  });
});
