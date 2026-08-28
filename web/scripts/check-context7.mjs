// Guards the Context7-first rule against silent deletion.
//
// Context7 is an MCP connector. Nothing in CI can observe whether an agent
// actually called resolve-library-id before answering — that is unobservable
// from a runner, and this script does not pretend otherwise. What IS checkable,
// and what actually rots, is whether the rule is still WRITTEN DOWN on every
// path an agent takes into this repo.
//
// The failure mode being closed is a workflow that quietly stops carrying the
// rule: a new SKILL.md lands without it, or the canonical block is edited away
// and every downstream skill silently loses the instruction it was inheriting.
// Both are invisible in review — nothing breaks, agents just go back to
// answering library questions from memory.
//
// Coverage is transitive on purpose, so the rule stays stated ONCE:
//
//   canonical  .claude/skills/erg-context.md holds the wording
//   inherits   the skill prepends erg-context.md to its spawns
//   direct     the skill names the lookup itself (skills that spawn no agents)
//   delegates  the skill points at another SKILL.md that is covered
//   exempt     listed below with a reason, and fails if it becomes covered
//
//   npm run check:context7
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(webRoot, '..');

const CANONICAL = '.claude/skills/erg-context.md';
const HEADING = '## Library documentation — Context7 first';
const TOOLS = ['resolve-library-id', 'query-docs'];

// A skill belongs here only when carrying the rule would be WRONG, not merely
// unnecessary. Remove an entry the moment its file gains coverage — a stale
// exemption fails this check, exactly as a stale entry fails check:colours.
const EXEMPT = {
  '.claude/skills/steward/SKILL.md':
    'Contract-bound: every line must be cited, attested, or a dated incident, ' +
    'and it states that general PR etiquette does not belong. An uncited ' +
    'Context7 reminder would violate the file rather than improve it.',
};

const read = (rel) => readFileSync(join(repoRoot, rel), 'utf8');
const failures = [];

// --- 1. The canonical block still exists, and still names both tools. -------

if (!existsSync(join(repoRoot, CANONICAL))) {
  console.error(`check:context7: ${CANONICAL} is missing.`);
  process.exit(1);
}

const canonical = read(CANONICAL);
if (!canonical.includes(HEADING)) {
  failures.push(
    `${CANONICAL} no longer contains the section "${HEADING}" — every skill ` +
      'that inherits the rule is now inheriting nothing'
  );
}
for (const tool of TOOLS) {
  if (!canonical.includes(tool)) {
    failures.push(
      `${CANONICAL} no longer names \`${tool}\`; the lookup is not actionable ` +
        'without both step names'
    );
  }
}

// CLAUDE.md is the session-wide entry point — it is read before any skill runs.
if (!read('CLAUDE.md').includes('### Context7')) {
  failures.push(
    'CLAUDE.md no longer documents Context7 under its own heading, so a ' +
      'session that invokes no skill never sees the rule'
  );
}

// --- 2. Every skill is reached by the rule, one route or another. -----------

let skills;
try {
  skills = execFileSync('git', ['ls-files', '--', '.claude/skills'], {
    cwd: repoRoot,
    encoding: 'utf8',
  })
    .split('\n')
    .filter((f) => f.endsWith('/SKILL.md'));
} catch (e) {
  console.error(`check:context7: could not list skills — ${e.message}`);
  process.exit(1);
}

const texts = new Map(skills.map((rel) => [rel, read(rel)]));
const routes = new Map();

// `direct` requires the lookup tool, NOT the bare word "Context7". The word
// alone is not coverage: steward/SKILL.md names the required check-run
// `Context7 rule reaches every workflow` without stating the rule, and a
// substring test on the word scored that as covered — turning a valid
// exemption into a false stale-exemption failure on #328. A skill carries the
// rule only if it tells you what to actually call.
for (const [rel, text] of texts) {
  if (text.includes('erg-context.md')) routes.set(rel, 'inherits');
  else if (text.includes(TOOLS[0])) routes.set(rel, 'direct');
}

// Resolve delegation to a fixpoint so a chain of aliases still counts, and so a
// reference cycle terminates instead of recursing.
for (let changed = true; changed;) {
  changed = false;
  for (const [rel, text] of texts) {
    if (routes.has(rel)) continue;
    const cited = [...text.matchAll(/[\w./-]*\.claude\/skills\/\S+?SKILL\.md/g)]
      .map((m) => m[0].replace(/^[^.]*(?=\.claude)/, ''))
      .filter((p) => p !== rel);
    if (cited.some((p) => routes.has(p))) {
      routes.set(rel, 'delegates');
      changed = true;
    }
  }
}

for (const rel of skills) {
  const exemption = EXEMPT[rel];
  if (exemption && routes.has(rel)) {
    failures.push(
      `${rel} is listed as exempt but is now covered (${routes.get(rel)}) — ` +
        'delete its EXEMPT entry in web/scripts/check-context7.mjs'
    );
  } else if (!exemption && !routes.has(rel)) {
    failures.push(
      `${rel} is not reached by the Context7-first rule. Prepend ` +
        `${CANONICAL} to its spawns, name \`${TOOLS[0]}\` in the file ` +
        'itself, or add a reasoned EXEMPT entry in ' +
        'web/scripts/check-context7.mjs'
    );
  }
}

for (const rel of Object.keys(EXEMPT)) {
  if (!skills.includes(rel)) {
    failures.push(
      `EXEMPT names ${rel}, which is not a tracked skill — delete the entry`
    );
  }
}

// --- 3. Report. -------------------------------------------------------------

if (failures.length) {
  console.error('\nContext7 guard FAILED\n');
  for (const f of failures) console.error(`  ✗ ${f}\n`);
  console.error(
    'A workflow has stopped carrying the Context7-first rule.\n\n' +
      'This guard cannot check that an agent obeyed the rule — no CI runner\n' +
      'can see an MCP call. It checks only that the instruction is still\n' +
      'present on every path into the repo. Restore it rather than relaxing\n' +
      'the check: the rule going missing is how agents drift back to\n' +
      'answering library questions from memory.\n'
  );
  process.exit(1);
}

const tally = [...routes.values()].reduce(
  (acc, r) => ({ ...acc, [r]: (acc[r] ?? 0) + 1 }),
  {}
);
const summary = Object.entries(tally)
  .sort()
  .map(([r, n]) => `${n} ${r}`)
  .join(', ');
const exempt = Object.keys(EXEMPT).length;

console.log(
  `check:context7: canonical block intact; ${skills.length} skill(s) reached ` +
    `(${summary}${exempt ? `, ${exempt} exempt` : ''}).`
);
