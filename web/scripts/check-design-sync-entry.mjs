// Guards the design-sync barrel against silent drift.
//
// web/.design-sync/entry.jsx re-exports app components by name so the
// claude.ai/design bundle can expose them on window.SplitIQ. It is
// hand-maintained and nothing else references it, so when a component or
// constant is renamed, moved or removed, the barrel keeps naming a symbol that
// no longer exists and the design-sync build breaks — invisibly, until someone
// next runs a sync.
//
// That is not hypothetical: #203 correctly deleted the static PACE_ZONES export
// from trainingConfig.js, the barrel was not updated, and the break sat on main
// undetected. A prose warning in NOTES.md was already in place and did not stop
// it. This is the control that does.
//
// The real converter bundles with esbuild; Vite 8 ships rolldown instead, so we
// bundle with rolldown to avoid adding a dependency for a CI check. Either way a
// missing named re-export is a hard bundler error, which is exactly the class of
// failure being guarded.
//
//   npm run check:design-sync
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const configPath = join(webRoot, '.design-sync', 'config.json');

if (!existsSync(configPath)) {
  console.log('design-sync: no .design-sync/config.json — nothing to guard.');
  process.exit(0);
}

let cfg;
try {
  cfg = JSON.parse(readFileSync(configPath, 'utf8'));
} catch (e) {
  console.error(
    `design-sync: .design-sync/config.json is not valid JSON — ${e.message}`
  );
  process.exit(1);
}

const failures = [];

// 1. Every componentSrcMap path must still exist. A moved component file would
//    otherwise silently drop out of the synced set.
for (const [name, rel] of Object.entries(cfg.componentSrcMap ?? {})) {
  if (rel === null) continue;
  if (!existsSync(join(webRoot, rel))) {
    failures.push(
      `componentSrcMap.${name} points at "${rel}", which does not exist`
    );
  }
}

// 2. The barrel must bundle. This is what catches renamed/removed exports.
const entryRel = cfg.entry ?? '.design-sync/entry.jsx';
const entry = join(webRoot, entryRel);

if (!existsSync(entry)) {
  failures.push(`cfg.entry points at "${entryRel}", which does not exist`);
} else {
  try {
    const { rolldown } = await import('rolldown');
    const bundle = await rolldown({ input: entry, platform: 'browser' });
    await bundle.generate({ format: 'iife', name: 'DesignSyncEntryCheck' });
    await bundle.close?.();
  } catch (e) {
    // Built from a string so the escape character never appears literally
    // inside a regex literal (no-control-regex). String.raw keeps the bracket
    // escape exact.
    const ansi = new RegExp(
      String.fromCharCode(27) + String.raw`\[[0-9;]*m`,
      'g'
    );
    const msg = String(e?.message ?? e).replace(ansi, '');
    failures.push(`${entryRel} does not bundle:\n\n${msg}`);
  }
}

if (failures.length) {
  console.error('\ndesign-sync entry guard FAILED\n');
  for (const f of failures) console.error(`  ✗ ${f}\n`);
  console.error(
    'The design-sync barrel has drifted from web/src.\n\n' +
      'It is hand-maintained: renaming, moving or deleting anything it re-exports\n' +
      'breaks the claude.ai/design build with no other symptom. Fix by updating\n' +
      'web/.design-sync/entry.jsx (and the matching preview/doc/config entries) to\n' +
      'name what src actually exports now.\n\n' +
      'See web/.design-sync/NOTES.md for the sync contract.\n'
  );
  process.exit(1);
}

console.log(
  'design-sync: barrel bundles and every componentSrcMap path resolves.'
);
