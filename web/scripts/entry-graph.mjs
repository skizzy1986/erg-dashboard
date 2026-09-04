// The first-paint graph, derived from a Vite/rolldown build manifest.
//
// Split out from check-bundle-size.mjs so it can be tested directly: this walk
// is the load-bearing claim of the entry budget, and the way it fails is
// silent. Follow `dynamicImports` by mistake and the "entry" number quietly
// becomes the total again — every chunk reachable, budget passing, gate
// meaningless. A wrong number here does not throw.

/** A file counts toward a byte budget if it is JS or CSS. */
export const isCountedAsset = (name) =>
  name.endsWith('.js') || name.endsWith('.css');

/**
 * Files the browser must download before it can paint: every entry chunk, its
 * transitively STATIC imports, and that graph's CSS.
 *
 * `imports` is followed. `dynamicImports` is not — those chunks are fetched on
 * demand, which is the entire point of a code split. Nothing in the emitted
 * filenames distinguishes the two, which is why build.manifest is switched on
 * in vite.config.js rather than the distinction being guessed.
 *
 * @param {Record<string, object>} manifest parsed .vite/manifest.json
 * @returns {string[]} dist-relative paths, deduped, in discovery order
 */
export function entryFilesFrom(manifest) {
  const roots = Object.keys(manifest).filter((key) => manifest[key]?.isEntry);
  if (roots.length === 0) {
    throw new Error('No isEntry record in the manifest.');
  }

  const files = new Set();
  // `seen` guards a genuine cycle, not a theoretical one: a lazy chunk
  // statically imports back into the entry record, so an unguarded walk of a
  // real manifest never terminates.
  const seen = new Set();
  const queue = [...roots];

  while (queue.length) {
    const key = queue.shift();
    if (seen.has(key)) continue;
    seen.add(key);

    const record = manifest[key];
    if (!record) continue;

    if (record.file && isCountedAsset(record.file)) files.add(record.file);
    for (const css of record.css ?? []) files.add(css);
    for (const imported of record.imports ?? []) queue.push(imported);
  }

  return [...files];
}
