#!/usr/bin/env node
// Bundle-size budget — fails the build if the production bundle grows past a
// set gzipped budget. Catches accidental bloat (a heavy dep, a lost code-split)
// as code moves around during the refactor. No external deps: reads dist/ and
// gzips each asset with the built-in zlib.
//
// The budget is a RATCHET — lower MAX_GZIP_KB as the bundle shrinks (e.g. when
// the monolith is finally code-split), never raise it without a deliberate
// reason. Current build sits at ~360 KB gzipped; budget set with modest
// headroom so a real regression trips it but normal noise does not.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const MAX_GZIP_KB = 400;
const ASSET_DIR = join(process.cwd(), 'dist', 'assets');

function gzippedAssets(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    console.error(
      `✖ ${dir} not found — run \`npm run build\` before the size check.`
    );
    process.exit(1);
  }
  return entries
    .filter((f) => f.endsWith('.js') || f.endsWith('.css'))
    .map((f) => {
      const full = join(dir, f);
      if (!statSync(full).isFile()) return null;
      const gzip = gzipSync(readFileSync(full)).length;
      return { file: f, gzip };
    })
    .filter(Boolean)
    .sort((a, b) => b.gzip - a.gzip);
}

const assets = gzippedAssets(ASSET_DIR);
const totalBytes = assets.reduce((sum, a) => sum + a.gzip, 0);
const totalKb = totalBytes / 1024;
const budgetBytes = MAX_GZIP_KB * 1024;

const kb = (b) => `${(b / 1024).toFixed(1)} KB`;
console.log('Bundle size (gzipped):');
for (const a of assets) console.log(`  ${kb(a.gzip).padStart(10)}  ${a.file}`);
console.log(`  ${'─'.repeat(10)}`);
console.log(
  `  ${kb(totalBytes).padStart(10)}  total  (budget ${MAX_GZIP_KB} KB)`
);

if (totalBytes > budgetBytes) {
  const over = totalKb - MAX_GZIP_KB;
  console.error(
    `\n✖ Bundle is ${over.toFixed(1)} KB over the ${MAX_GZIP_KB} KB gzipped budget.`
  );
  console.error(
    '  Trim a dependency or code-split, or raise MAX_GZIP_KB deliberately if the growth is intended.'
  );
  process.exit(1);
}

console.log(
  `\n✓ Within budget (${(MAX_GZIP_KB - totalKb).toFixed(1)} KB headroom).`
);
