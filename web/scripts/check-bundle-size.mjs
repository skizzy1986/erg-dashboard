#!/usr/bin/env node
// Bundle-size budget — fails the build if the production bundle grows past its
// gzipped budgets. Catches accidental bloat (a heavy dep, a lost code-split) as
// code moves around during the refactor. No external deps: reads dist/ and
// gzips each asset with the built-in zlib.
//
// TWO budgets, because they answer different questions.
//
//   ENTRY — what a first paint costs: the entry chunk plus everything it
//   STATICALLY imports, plus that graph's CSS. This is the number a user feels.
//   It is the tight ratchet.
//
//   TOTAL — every emitted asset, whether or not it ships on first paint. A
//   loose ceiling, so a heavy dependency parked behind a lazy route is still
//   noticed rather than free.
//
// Gating only on TOTAL — which this script did until #331 — makes the check
// actively hostile to code-splitting: splitting trades a much smaller entry
// chunk for a slightly larger total (per-chunk preamble, plus shared code that
// now lands in more than one chunk), so a real user-facing win is reported as
// a regression. Measured on this change: lazy-loading the two shells and the
// 14 desktop tabs cut the entry chunk 395.4 -> 134.7 KB (-66%) while adding
// 26.3 KB to the total.
//
// Both budgets are RATCHETS — lower them as the bundle shrinks, never raise
// one without a deliberate, stated reason.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';
import { entryFilesFrom, isCountedAsset } from './entry-graph.mjs';

// Measured 2026-08-28 on the #331 split: entry 134.7 KB, total 425.5 KB.
// Entry gets ~15 KB of headroom — tight, because that is the number that
// matters and a lost split shows up in it immediately (recharts alone is
// 90 KB). Total gets ~25 KB, and is expected to FALL by ~52 KB once #329
// lands mathjs removal; ratchet it down then rather than banking the slack.
const MAX_ENTRY_GZIP_KB = 150;
const MAX_TOTAL_GZIP_KB = 450;

const DIST = join(process.cwd(), 'dist');
const ASSET_DIR = join(DIST, 'assets');
const MANIFEST = join(DIST, '.vite', 'manifest.json');

const gzipOf = (relPath) => gzipSync(readFileSync(join(DIST, relPath))).length;

function die(msg) {
  console.error(`✖ ${msg}`);
  process.exit(1);
}

// ── TOTAL: every emitted .js/.css in dist/assets ──────────────────
function allAssets() {
  let entries;
  try {
    // withFileTypes carries the file-type from this single readdir call, so we
    // never stat-then-read (avoids a TOCTOU file-system race).
    entries = readdirSync(ASSET_DIR, { withFileTypes: true });
  } catch {
    die(
      `${ASSET_DIR} not found — run \`npm run build\` before the size check.`
    );
  }
  return entries
    .filter((e) => e.isFile() && isCountedAsset(e.name))
    .map((e) => ({ file: e.name, gzip: gzipOf(join('assets', e.name)) }))
    .sort((a, b) => b.gzip - a.gzip);
}

// ── ENTRY: the first-paint graph, from the Vite/rolldown manifest ──
// The walk itself lives in entry-graph.mjs, where it is unit-tested — a walk
// that wrongly followed dynamicImports would report the total as the entry
// and still pass, so it needs a check that is not the build.
function entryAssets() {
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
  } catch {
    die(
      `${MANIFEST} not found — the entry budget needs it.
  Either \`npm run build\` has not run, or build.manifest was turned off in
  vite.config.js. Re-enable it; do not fall back to guessing.`
    );
  }

  let files;
  try {
    files = entryFilesFrom(manifest);
  } catch (error) {
    die(error.message);
  }

  // dist-relative on the way in (for gzipping), assets/-relative on the way
  // out, so entry rows match the names in the total listing.
  return files
    .map((file) => ({
      file: file.startsWith('assets/') ? file.slice('assets/'.length) : file,
      gzip: gzipOf(file),
    }))
    .sort((a, b) => b.gzip - a.gzip);
}

const assets = allAssets();
const entry = entryAssets();
const sum = (list) => list.reduce((n, a) => n + a.gzip, 0);
const totalBytes = sum(assets);
const entryBytes = sum(entry);

// Machine-readable summary for CI reporting (report-bundle-size.mjs diffs it
// against the main-branch baseline). `budgetKb`/`total`/`assets` keep their
// original names and meanings so a baseline cached before #331 still reads.
// Written before the budget checks so the PR comment still shows the delta
// when a gate fails.
writeFileSync(
  join(DIST, 'bundle-size.json'),
  JSON.stringify(
    {
      budgetKb: MAX_TOTAL_GZIP_KB,
      total: totalBytes,
      assets,
      entryBudgetKb: MAX_ENTRY_GZIP_KB,
      entry: entryBytes,
      entryAssets: entry,
    },
    null,
    2
  )
);

const kb = (b) => `${(b / 1024).toFixed(1)} KB`;
const entryFiles = new Set(entry.map((a) => a.file));

console.log('Bundle size (gzipped):');
for (const a of assets) {
  const mark = entryFiles.has(a.file) ? '▪' : '·';
  console.log(`  ${mark} ${kb(a.gzip).padStart(10)}  ${a.file}`);
}
console.log(`    ${'─'.repeat(10)}`);
console.log(
  `  ▪ ${kb(entryBytes).padStart(10)}  entry  (budget ${MAX_ENTRY_GZIP_KB} KB) — ships on first paint`
);
console.log(
  `    ${kb(totalBytes).padStart(10)}  total  (budget ${MAX_TOTAL_GZIP_KB} KB) — everything emitted`
);

const failures = [];
for (const [label, bytes, budgetKb, advice] of [
  [
    'Entry chunk',
    entryBytes,
    MAX_ENTRY_GZIP_KB,
    'Lazy-load a route or trim a dependency that first paint does not need.',
  ],
  [
    'Total',
    totalBytes,
    MAX_TOTAL_GZIP_KB,
    'Trim a dependency, or raise MAX_TOTAL_GZIP_KB deliberately if the growth is intended.',
  ],
]) {
  if (bytes > budgetKb * 1024) {
    failures.push(
      `✖ ${label} is ${(bytes / 1024 - budgetKb).toFixed(1)} KB over the ${budgetKb} KB gzipped budget.\n  ${advice}`
    );
  }
}

if (failures.length) {
  console.error(`\n${failures.join('\n')}`);
  process.exit(1);
}

console.log(
  `\n✓ Within budget (entry ${(MAX_ENTRY_GZIP_KB - entryBytes / 1024).toFixed(1)} KB spare, ` +
    `total ${(MAX_TOTAL_GZIP_KB - totalBytes / 1024).toFixed(1)} KB spare).`
);
