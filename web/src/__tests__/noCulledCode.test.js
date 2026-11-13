import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { cwd } from 'node:process';

// Epic #412 culls the one-athlete program, journal and prescription code slice
// by slice. This pins each slice's removed identifiers out of the browser tree,
// tests and e2e included; a later slice appends its own group. It does not
// catch code re-added under a new name; that is a review job.
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
// Case-sensitive on purpose: "program" and "journal" are ordinary words
// elsewhere; only the removed identifiers are forbidden.
const GROUPS = {
  '#418 Program/Journal': [
    'Program' + 'View',
    'Program' + 'Microcycle',
    'Program' + 'Year',
    'Journal' + 'View',
    'DECISION' + '_LOG',
    'HYPO' + 'THESES',
    'RULE_FIRING' + '_HISTORY',
    'CONFIDENCE' + '_MIGRATION',
    'REP' + '_SCHEMES',
    'LOWER' + '_DIFFERENTIATION',
    'STRENGTH' + '_PRINCIPLES',
    'MACRO' + '_TARGETS',
    'MF' + '_PROGRAM',
    'DEFICIT' + '_PROGRAM',
    'NUTRITION' + '_PRINCIPLES',
    'FUEL' + 'LING',
    'NUTRITION' + '_TARGETS',
    'ERGZONE' + '_FORMAT',
    'INTENSITY' + '_EVOLUTION',
    'BUILD1' + '_SESSIONS',
    'VOLUME' + '_EXTRAS',
    'TECHNIQUE' + '_WORK',
    'MOVEMENT' + '_SCREEN',
    'MOBILITY' + '_WARMUP',
    'TECHNOGYM' + '_CONVERSION',
    'ATHLETE' + '_BACKGROUND',
    'RACE' + '_TARGET',
    'OR' + 'GS',
    'EVENT' + '_PATHWAY',
    'ANNUAL' + '_ARC',
  ],
  '#419 Benchmarks': [
    'EVENT' + '_LADDER',
    'benchmark' + '_key',
    'useBenchmark' + 'Statuses',
    'useBenchmark' + 'DataUnavailable',
    'useBenchmark' + 'Sessions',
    'useLinkBenchmark' + 'Session',
    'Benchmark' + 'Badge',
    'Benchmark' + 'LinkControl',
    'benchmark' + 'Status',
    'event' + 'Window',
    'benchmark' + '-window',
    'SEA' + 'SON 1 LADDER',
  ],
  '#420 Roster/Calendar': [
    'getRoster' + 'Mode',
    'ROSTER' + '_ANCHOR',
    'ROSTER' + '_REGIMES',
    'ROSTER' + '_OVERRIDES',
    'resolve' + 'Day',
    'get' + 'Today',
    'getUpcoming' + 'Sessions',
    'SESSION' + '_OVERRIDES',
    'day' + 'Sessions',
    'day' + 'Status',
    'MICRO' + 'CYCLE',
    'SEA' + 'SON',
    'SEA' + 'SON_2',
    'VOLUME' + '_PROGRESSION',
    'now' + 'Tick',
    'YOUR' + ' WEEKS',
  ],
};
const NEEDLES = Object.values(GROUPS).flat();
const RE = new RegExp(NEEDLES.map((n) => `\\b${n}\\b`).join('|'));

const files = ROOTS.flatMap(walk);

describe('code culled by epic #412 stays removed', () => {
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
    expect(RE.test('program' + 'View')).toBe(false);
    expect(RE.test('or' + 'gs')).toBe(false);
  });

  it('no file under web/src or web/e2e references a culled identifier', () => {
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
