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
 * `bootKeys` are extra roots walked the same way — statically only. They name
 * a chunk the entry loads lazily but that first paint cannot happen without:
 * main.jsx imports AuthGate behind RouteRoot so /squat can skip it, but the
 * dashboard cannot paint a pixel until AuthGate (and supabase-js with it) has
 * arrived. Leaving it out would let the dashboard's real first-paint cost
 * escape the budget through the very split that made /squat light. Their own
 * dynamicImports are still not followed.
 *
 * @param {Record<string, object>} manifest parsed .vite/manifest.json
 * @param {{ bootKeys?: string[] }} [options]
 * @returns {string[]} dist-relative paths, deduped, in discovery order
 */
export function entryFilesFrom(manifest, { bootKeys = [] } = {}) {
  const entries = Object.keys(manifest).filter((key) => manifest[key]?.isEntry);
  if (entries.length === 0) {
    throw new Error('No isEntry record in the manifest.');
  }
  for (const key of bootKeys) {
    // A renamed boot chunk would otherwise drop out silently and the entry
    // figure would fall by its whole size — a pass that measures less.
    if (!manifest[key])
      throw new Error(`Boot key ${key} is not in the manifest.`);
  }
  const roots = [...entries, ...bootKeys];

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

/**
 * Every file reachable from `roots`, following static AND dynamic imports and
 * each record's emitted `assets` (where Vite lists a worker chunk and `?url`
 * files). `stopAt` keys are never entered — that is how one product's graph is
 * walked without wandering into the other's through the shared entry.
 *
 * @param {Record<string, object>} manifest
 * @param {string[]} roots manifest keys
 * @param {{ stopAt?: string[] }} [options]
 * @returns {Set<string>} dist-relative paths
 */
export function reachableFiles(manifest, roots, { stopAt = [] } = {}) {
  const files = new Set();
  const seen = new Set(stopAt);
  const queue = [...roots];
  while (queue.length) {
    const key = queue.shift();
    if (seen.has(key)) continue;
    seen.add(key);
    const record = manifest[key];
    if (!record) continue;
    if (record.file) files.add(record.file);
    for (const f of [...(record.css ?? []), ...(record.assets ?? [])]) {
      files.add(f);
    }
    for (const k of [
      ...(record.imports ?? []),
      ...(record.dynamicImports ?? []),
    ]) {
      queue.push(k);
    }
  }
  return files;
}

/**
 * Files only the squat tool can reach: everything reachable from its root,
 * minus anything the dashboard (the entry, walked without entering the squat
 * root) can also reach. Shared code — React, the entry chunk, the tokens
 * module — is the dashboard's, so the squat budget measures only what the tool
 * itself added.
 *
 * @param {Record<string, object>} manifest
 * @param {string} squatKey manifest key of the tool's root module
 * @returns {string[]} dist-relative paths
 */
export function squatOnlyFiles(manifest, squatKey) {
  if (!manifest[squatKey]) {
    throw new Error(`Squat root ${squatKey} is not in the manifest.`);
  }
  const entries = Object.keys(manifest).filter((key) => manifest[key]?.isEntry);
  const dashboard = reachableFiles(manifest, entries, { stopAt: [squatKey] });
  const squat = reachableFiles(manifest, [squatKey]);
  return [...squat].filter((f) => !dashboard.has(f));
}
