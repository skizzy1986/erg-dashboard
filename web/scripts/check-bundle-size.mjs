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
// Since the public squat tool (/squat) joined the bundle there are two
// PRODUCTS behind one entry, so each budget is now scoped to one of them:
//
//   ENTRY / TOTAL         the dashboard. ENTRY walks main + AuthGate (a boot
//                         key: lazy behind RouteRoot, but nothing paints
//                         without it). TOTAL is every asset EXCEPT the files
//                         only the squat tool can reach.
//   SQUAT_ENTRY           what /squat costs to paint: main + SquatApp's
//                         static graph.
//   SQUAT_TOTAL           the files only the squat tool reaches (its chunk,
//                         its worker), so shared code is not double-charged.
//   SQUAT_DATA            the anatomy stream itself (already gzip, so measured
//                         raw), plus a check that nothing the service worker
//                         precaches exceeds Workbox's 2 MiB per-file ceiling —
//                         above it, Workbox silently skips the file.
//
// Both budgets are RATCHETS — lower them as the bundle shrinks, never raise
// one without a deliberate, stated reason.
//
// Do not quote a size figure from memory or from a doc — it drifts. Run
// `npm run build && npm run size`, or read dist/bundle-size.json, which this
// script regenerates on every run.
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';
import {
  entryFilesFrom,
  isCountedAsset,
  squatOnlyFiles,
} from './entry-graph.mjs';

// Measured 2026-09-03, after #329 landed mathjs removal: entry 134.9 KB,
// total 373.5 KB. Entry gets ~15 KB of headroom — tight, because that is the
// number that matters and a lost split shows up in it immediately (recharts
// alone is 90 KB). Total gets ~26 KB.
//
// Total was 450 while main still carried mathjs. #329 removed ~52 KB, so it is
// ratcheted to 400 here rather than banking the slack, per the note this
// replaces.
const MAX_ENTRY_GZIP_KB = 150;
const MAX_TOTAL_GZIP_KB = 400;

// Squat tool, measured 2026-11-04 on PR1 (no three.js yet): SQUAT_ENTRY
// 107.2 KB, SQUAT_TOTAL 18.8 KB. Entry gets the approved +10 KB (117), total
// +10% (20.7, rounded up to 21). PR2 adds three.js and will raise both
// deliberately, with its own measured figures.
//
// The dashboard's entry moved 144.5 -> 146.1 KB on the same change: RouteRoot
// plus the AuthGate chunk boundary it introduced. Still inside 150.
const MAX_SQUAT_ENTRY_GZIP_KB = 117;
const MAX_SQUAT_TOTAL_GZIP_KB = 21;
// The stream measured 2,202,168 bytes; 2.3 MB keeps a re-run of the pipeline
// from quietly doubling every first visit.
const MAX_SQUAT_DATA_BYTES = 2_300_000;
const MAX_PRECACHE_FILE_BYTES = 2 * 1024 * 1024;

// main.jsx renders RouteRoot, which lazy-loads one product or the other.
const DASHBOARD_BOOT = 'src/AuthGate.jsx';
const SQUAT_ROOT = 'src/squat/SquatApp.jsx';
const SQUAT_DATA = /^squat-anatomy-.*\.bin$/;

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
function readManifest() {
  try {
    return JSON.parse(readFileSync(MANIFEST, 'utf8'));
  } catch {
    die(
      `${MANIFEST} not found — the entry budget needs it.
  Either \`npm run build\` has not run, or build.manifest was turned off in
  vite.config.js. Re-enable it; do not fall back to guessing.`
    );
  }
}

// dist-relative on the way in (for gzipping), assets/-relative on the way
// out, so entry rows match the names in the total listing.
const toRow = (file) => ({
  file: file.startsWith('assets/') ? file.slice('assets/'.length) : file,
  gzip: gzipOf(file),
});

function firstPaint(manifest, bootKey) {
  let files;
  try {
    files = entryFilesFrom(manifest, { bootKeys: [bootKey] });
  } catch (error) {
    die(error.message);
  }
  return files.map(toRow).sort((a, b) => b.gzip - a.gzip);
}

// Workbox writes its precache list into sw.js as {url:"…",revision:…}.
function precachedFiles() {
  let sw;
  try {
    sw = readFileSync(join(DIST, 'sw.js'), 'utf8');
  } catch {
    die('dist/sw.js not found — the precache check needs the PWA build.');
  }
  const urls = [...sw.matchAll(/url:"([^"]+)"/g)].map((m) => m[1]);
  if (!urls.length) die('No precache entries found in dist/sw.js.');
  return urls;
}

const manifest = readManifest();
let squatFiles;
try {
  squatFiles = new Set(
    squatOnlyFiles(manifest, SQUAT_ROOT)
      .filter(isCountedAsset)
      .map((f) => (f.startsWith('assets/') ? f.slice('assets/'.length) : f))
  );
} catch (error) {
  die(error.message);
}
const everything = allAssets();
// The dashboard's total: nothing moved, nothing exempted — only the files no
// dashboard path can reach are carved out, and they are gated below instead.
const assets = everything.filter((a) => !squatFiles.has(a.file));
const squatAssets = everything.filter((a) => squatFiles.has(a.file));
const entry = firstPaint(manifest, DASHBOARD_BOOT);
const squatEntry = firstPaint(manifest, SQUAT_ROOT);
const sum = (list) => list.reduce((n, a) => n + a.gzip, 0);
const totalBytes = sum(assets);
const entryBytes = sum(entry);
const squatEntryBytes = sum(squatEntry);
const squatTotalBytes = sum(squatAssets);

const dataFiles = readdirSync(ASSET_DIR).filter((f) => SQUAT_DATA.test(f));
if (dataFiles.length !== 1) {
  die(
    `Expected exactly one squat-anatomy-*.bin in dist/assets, found ${dataFiles.length}.`
  );
}
const squatData = {
  file: dataFiles[0],
  bytes: statSync(join(ASSET_DIR, dataFiles[0])).size,
  budgetBytes: MAX_SQUAT_DATA_BYTES,
};
const precache = precachedFiles()
  .map((url) => ({ url, bytes: statSync(join(DIST, url)).size }))
  .sort((a, b) => b.bytes - a.bytes);
const largestPrecached = precache[0];

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
      squatEntryBudgetKb: MAX_SQUAT_ENTRY_GZIP_KB,
      squatEntry: squatEntryBytes,
      squatEntryAssets: squatEntry,
      squatTotalBudgetKb: MAX_SQUAT_TOTAL_GZIP_KB,
      squatTotal: squatTotalBytes,
      squatAssets,
      squatData,
      precacheLargest: largestPrecached,
      precacheFileBudgetBytes: MAX_PRECACHE_FILE_BYTES,
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
  `    ${kb(totalBytes).padStart(10)}  total  (budget ${MAX_TOTAL_GZIP_KB} KB) — everything the dashboard can reach`
);
console.log('\nSquat tool (gzipped):');
for (const a of squatAssets) {
  console.log(`  · ${kb(a.gzip).padStart(10)}  ${a.file}`);
}
console.log(`    ${'─'.repeat(10)}`);
console.log(
  `    ${kb(squatEntryBytes).padStart(10)}  squat entry  (budget ${MAX_SQUAT_ENTRY_GZIP_KB} KB) — first paint of /squat`
);
console.log(
  `    ${kb(squatTotalBytes).padStart(10)}  squat total  (budget ${MAX_SQUAT_TOTAL_GZIP_KB} KB) — files only /squat reaches`
);
const mbs = (b) => `${(b / 1e6).toFixed(2)} MB`;
console.log(
  `    ${mbs(squatData.bytes).padStart(10)}  squat data   (budget ${mbs(MAX_SQUAT_DATA_BYTES)}) — ${squatData.file}, not precached`
);
console.log(
  `    ${mbs(largestPrecached.bytes).padStart(10)}  largest precached file (ceiling 2 MiB) — ${largestPrecached.url}`
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
  [
    'Squat entry',
    squatEntryBytes,
    MAX_SQUAT_ENTRY_GZIP_KB,
    'Something /squat statically imports grew — keep heavy pieces behind a lazy import.',
  ],
  [
    'Squat total',
    squatTotalBytes,
    MAX_SQUAT_TOTAL_GZIP_KB,
    'Trim the tool, or raise MAX_SQUAT_TOTAL_GZIP_KB deliberately with the new figure.',
  ],
]) {
  if (bytes > budgetKb * 1024) {
    failures.push(
      `✖ ${label} is ${(bytes / 1024 - budgetKb).toFixed(1)} KB over the ${budgetKb} KB gzipped budget.\n  ${advice}`
    );
  }
}

if (squatData.bytes > MAX_SQUAT_DATA_BYTES) {
  failures.push(
    `✖ ${squatData.file} is ${squatData.bytes} bytes, over the ${MAX_SQUAT_DATA_BYTES}-byte budget.\n  A pipeline re-run grew the anatomy stream; decimate or requantise it.`
  );
}
for (const p of precache.filter((f) => f.bytes > MAX_PRECACHE_FILE_BYTES)) {
  failures.push(
    `✖ ${p.url} is precached at ${p.bytes} bytes, over Workbox's 2 MiB per-file ceiling — it would be skipped silently.\n  Add it to globIgnores in vite.config.js and cache it at runtime instead.`
  );
}

if (failures.length) {
  console.error(`\n${failures.join('\n')}`);
  process.exit(1);
}

const spare = (budgetKb, bytes) => (budgetKb - bytes / 1024).toFixed(1);
console.log(
  `\n✓ Within budget (entry ${spare(MAX_ENTRY_GZIP_KB, entryBytes)} KB spare, ` +
    `total ${spare(MAX_TOTAL_GZIP_KB, totalBytes)} KB spare, ` +
    `squat entry ${spare(MAX_SQUAT_ENTRY_GZIP_KB, squatEntryBytes)} KB spare, ` +
    `squat total ${spare(MAX_SQUAT_TOTAL_GZIP_KB, squatTotalBytes)} KB spare).`
);
