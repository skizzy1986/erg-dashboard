// Guards that no LLM call path comes back into the browser or the edge
// functions. The in-app coach (#414 client, #415 function and table) was the
// only one, and VISION.md rules out another. Two fixed strings mark such a
// path: the provider's API host and the edge secret that authenticated it.
//
// It scans tracked files under web/ and supabase/functions/ with git grep:
// tracked only, so node_modules and dist never enter, and -I skips binaries.
// It runs in its own workflow (no-llm-path.yml), not in ci-web's lint job,
// because that job is filtered on 'web/**' and would never fire on a change
// under supabase/functions/ alone (the zone-bands.yml:10-14 failure mode).
//
// The needles are concatenated so this file, which sits under web/, does not
// match itself. Before scanning, it proves its own matcher on a canary in a
// temp dir and proves both roots resolve, so it cannot pass vacuously.
//
//   npm run check:no-llm
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ROOTS = ['web', 'supabase/functions'];
const ANCHORS = ['web/package.json', 'supabase/functions/_shared/sentry.ts'];
const NEEDLES = ['api.' + 'anthropic' + '.com', 'ANTHROPIC' + '_API_KEY'];

// git grep exits 1 for "no match"; any other non-zero status is an error.
const grep = (cwd, flags, paths) => {
  const args = ['grep', ...flags, '-n', '-I', '-i', '-F'];
  for (const needle of NEEDLES) args.push('-e', needle);
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

const dir = mkdtempSync(join(tmpdir(), 'no-llm-'));
try {
  const canary = [
    `https://${NEEDLES[0].toUpperCase()}/v1`,
    NEEDLES[1].toLowerCase(),
  ].join('\n');
  writeFileSync(join(dir, 'canary.txt'), canary + '\n');
  const hits = grep(dir, ['--no-index'], ['.']);
  if (hits.length !== NEEDLES.length) {
    failures.push(
      `self-test: matched ${hits.length} of ${NEEDLES.length} canary ` +
        'lines, so a clean scan would prove nothing'
    );
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}

const tracked = execFileSync('git', ['ls-files', '--', ...ROOTS], {
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

for (const hit of grep(repoRoot, [], ROOTS)) {
  failures.push(`${hit}  <- LLM API host or key in a shipped tree`);
}

if (failures.length) {
  console.error(`check:no-llm: ${failures.length} problem(s)\n`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log(
  `check:no-llm: ${tracked.length} tracked files under ` +
    `${ROOTS.join(' and ')}, none naming an LLM API host or key`
);
