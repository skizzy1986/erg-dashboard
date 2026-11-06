import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { cwd } from 'node:process';

// The in-app LLM coach was retired in #414. This pins it out of the browser
// tree — tests and e2e included — so a later edit cannot quietly revive it.
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
const NEEDLES = [
  'use' + 'Coach',
  'Coach' + 'View',
  'coach' + '_messages',
  'functions/v1/' + 'coach',
  'anthrop' + 'ic',
];
const RE = new RegExp(NEEDLES.join('|'), 'i');

const files = ROOTS.flatMap(walk);

describe('the retired LLM coach client stays retired', () => {
  it('scans both web/src and web/e2e', () => {
    const rel = files.map((f) => relative(cwd(), f));
    expect(rel).toContain(join('e2e', 'smoke.spec.js'));
    expect(rel).toContain(join('src', 'App.jsx'));
  });

  it('matches its needles, case-insensitively', () => {
    for (const needle of NEEDLES) {
      expect(RE.test('x' + needle + 'x')).toBe(true);
      expect(RE.test(needle.toUpperCase())).toBe(true);
    }
  });

  it('no file under web/src or web/e2e references the retired LLM coach client', () => {
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
