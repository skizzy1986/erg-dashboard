#!/usr/bin/env node
// Lifts the squat tool's data out of the source project's single-file build.
//
// The source page carries two script tags: `squat-manifest` (JSON: every
// array's offset/count/dtype, plus all model metadata) and `squat-data`
// (base64 of a gzip stream). The gzip bytes are written out EXACTLY as decoded
// — never re-compressed — so the sha256 pinned in constants/dataAsset.js names
// the same stream the source shipped, and the browser's DecompressionStream
// sees what the pipeline wrote.
//
// Deterministic and dependency-free: no clock, no randomness, Node built-ins
// only. It reads the HTML as text and never evaluates anything in it.
//
//   node scripts/extract-squat-data.mjs <path/to/dist/squat.html> [outDir]
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const GZIP_MAGIC = [0x1f, 0x8b];

function scriptBody(html, id, type) {
  const re = new RegExp(
    `<script id="${id}" type="${type.replace('/', '\\/')}">([\\s\\S]*?)</script>`
  );
  const m = html.match(re);
  if (!m) throw new Error(`No <script id="${id}"> in the input.`);
  return m[1];
}

export const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

/**
 * @param {string} html the source page
 * @returns {{ bin: Buffer, manifest: Buffer }}
 */
export function extractSquatData(html) {
  const manifestText = scriptBody(html, 'squat-manifest', 'application/json');
  const parsed = JSON.parse(manifestText);
  if (!parsed || typeof parsed.meta !== 'object') {
    throw new Error('squat-manifest has no meta object.');
  }
  const b64 = scriptBody(html, 'squat-data', 'application/octet-stream').trim();
  if (!/^[A-Za-z0-9+/]+=*$/.test(b64)) {
    throw new Error('squat-data is not base64.');
  }
  const bin = Buffer.from(b64, 'base64');
  if (bin[0] !== GZIP_MAGIC[0] || bin[1] !== GZIP_MAGIC[1]) {
    throw new Error('squat-data does not decode to a gzip stream.');
  }
  // Re-serialised compactly so the asset does not depend on the source's
  // whitespace; key order is preserved by JSON.parse/stringify.
  const manifest = Buffer.from(JSON.stringify(parsed), 'utf8');
  return { bin, manifest };
}

function main(argv) {
  const [input, outArg] = argv;
  if (!input) {
    console.error(
      'usage: node scripts/extract-squat-data.mjs <squat.html> [outDir]'
    );
    process.exit(2);
  }
  const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const outDir = resolve(outArg ?? join(webRoot, 'src', 'squat', 'assets'));
  const { bin, manifest } = extractSquatData(readFileSync(input, 'utf8'));
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'squat-anatomy.bin'), bin);
  writeFileSync(join(outDir, 'squat-manifest.json'), manifest);
  console.log(
    `squat-anatomy.bin    ${bin.length} bytes  sha256 ${sha256(bin)}`
  );
  console.log(
    `squat-manifest.json  ${manifest.length} bytes  sha256 ${sha256(manifest)}`
  );
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main(process.argv.slice(2));
}
