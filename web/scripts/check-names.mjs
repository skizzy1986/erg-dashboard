// Guards the app's one name. It was renamed to SplitIQ (R34), and the
// one-athlete prose that named its first user went with it (R35). Two rules:
//
//   1. No old self-name anywhere tracked under web/ or .github/workflows/,
//      matched case-insensitively. The bare repo slug is deliberately not a
//      needle: it is still the Sentry project, the repo and the paths.
//   2. No first-person name in shipped code under web/src (tests excluded),
//      matched case-sensitively as a whole word. A file may be allowlisted
//      while a cull removes it (empty since #513 deleted coaching.js); an
//      allowlisted file with no hit fails as stale, so the list only shrinks.
//
// It scans tracked files with git grep: tracked only, so node_modules and dist
// never enter, and -I skips binaries. It runs in its own workflow
// (names-guard.yml), not in ci-web's lint job, because that job is filtered on
// 'web/**' and would never fire on a change under .github/workflows/ alone
// (the zone-bands.yml:10-14 failure mode). It resolves the repo root from git,
// so it runs the same from the root or from web/.
//
// The needles are concatenated so this file, which sits under web/, does not
// match itself. Before scanning, it proves its own matchers on a canary in a
// temp dir and proves the roots resolve, so it cannot pass vacuously.
//
//   npm run check:names
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  cwd: dirname(fileURLToPath(import.meta.url)),
  encoding: 'utf8',
}).trim();

const OLD_NAMES = {
  roots: ['web', '.github/workflows'],
  flags: ['-n', '-I', '-i', '-F'],
  needles: [
    'erg' + ' dashboard',
    'erg' + 'dashboard',
    'erg' + ' coaching',
    'erg-dashboard' + '-debug',
  ],
};
const PERSON = {
  roots: [
    'web/src',
    ':(exclude)**/__tests__/**',
    ':(exclude)*.test.js',
    ':(exclude)*.test.jsx',
  ],
  flags: ['-n', '-I', '-w', '-F'],
  needles: ['Sco' + 'tt'],
};
const ALLOW = {};
const ANCHORS = [
  'web/package.json',
  'web/src/App.jsx',
  '.github/workflows/ci-android.yml',
];

// git grep exits 1 for "no match"; any other non-zero status is an error.
const grep = (cwd, rule, extra, paths) => {
  const args = ['grep', ...extra, ...rule.flags];
  for (const needle of rule.needles) args.push('-e', needle);
  args.push('--', ...paths);
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8' })
      .split('\n')
      .filter(Boolean);
  } catch (e) {
    if (e.status === 1) return [];
    throw e;
  }
};

const failures = [];

const dir = mkdtempSync(join(tmpdir(), 'check-names-'));
try {
  const person = PERSON.needles[0];
  const canary = [
    OLD_NAMES.needles[0].toUpperCase(),
    'The ' +
      OLD_NAMES.needles[1][0].toUpperCase() +
      OLD_NAMES.needles[1].slice(1),
    OLD_NAMES.needles[2].replace('c', 'C'),
    OLD_NAMES.needles[3].toUpperCase() + '.apk',
    `a session ${person} logged`,
    `${person}y is a different word`,
    `${person.toLowerCase()} in lower case`,
  ].join('\n');
  writeFileSync(join(dir, 'canary.txt'), canary + '\n');
  // Each rule is checked on its own: a summed count could hide one rule
  // over-matching while the other under-matches by the same amount.
  const checks = [
    [
      'old-name',
      grep(dir, OLD_NAMES, ['--no-index'], ['.']).length,
      OLD_NAMES.needles.length,
    ],
    ['person', grep(dir, PERSON, ['--no-index'], ['.']).length, 1],
  ];
  for (const [rule, hits, want] of checks) {
    if (hits !== want) {
      failures.push(
        `self-test: ${rule} rule matched ${hits} of ${want} canary lines, ` +
          'so a clean scan would prove nothing'
      );
    }
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}

const tracked = execFileSync('git', ['ls-files', '--', ...OLD_NAMES.roots], {
  cwd: repoRoot,
  encoding: 'utf8',
})
  .split('\n')
  .filter(Boolean);
for (const anchor of ANCHORS) {
  if (!tracked.includes(anchor)) {
    failures.push(`self-test: ${anchor} is not tracked; a root is unscanned`);
  }
}

for (const hit of grep(repoRoot, OLD_NAMES, [], OLD_NAMES.roots)) {
  failures.push(`${hit}  <- old self-name`);
}

const allowedHits = new Set();
for (const hit of grep(repoRoot, PERSON, [], PERSON.roots)) {
  const file = hit.slice(0, hit.indexOf(':'));
  if (file in ALLOW) allowedHits.add(file);
  else failures.push(`${hit}  <- names ${PERSON.needles[0]}`);
}
for (const [file, why] of Object.entries(ALLOW)) {
  if (!allowedHits.has(file)) {
    failures.push(`${file}: allowlisted (${why}) but has no hit; remove it`);
  }
}

if (failures.length) {
  console.error(`check:names: ${failures.length} problem(s)\n`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log(
  `check:names: ${tracked.length} tracked files under ` +
    `${OLD_NAMES.roots.join(' and ')}, none naming the old app or ` +
    `${PERSON.needles[0]}`
);
