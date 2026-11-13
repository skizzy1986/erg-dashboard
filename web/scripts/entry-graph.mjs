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
 * Files reachable through `viaKey` and by no other route from the entry:
 * everything reachable from it, minus anything the entries reach when walked
 * without entering it. Shared code stays with whoever else reaches it.
 *
 * @param {Record<string, object>} manifest
 * @param {string} viaKey manifest key of the root module
 * @param {string} [what] how to name the key in the error
 * @returns {string[]} dist-relative paths
 */
export function onlyReachableVia(manifest, viaKey, what = 'Root') {
  if (!manifest[viaKey]) {
    throw new Error(`${what} ${viaKey} is not in the manifest.`);
  }
  const entries = Object.keys(manifest).filter((key) => manifest[key]?.isEntry);
  const others = reachableFiles(manifest, entries, { stopAt: [viaKey] });
  const via = reachableFiles(manifest, [viaKey]);
  return [...via].filter((f) => !others.has(f));
}

/**
 * Files only the squat tool can reach. Shared code — React, the entry chunk,
 * the tokens module — is the dashboard's, so the squat budget measures only
 * what the tool itself added.
 *
 * @param {Record<string, object>} manifest
 * @param {string} squatKey manifest key of the tool's root module
 * @returns {string[]} dist-relative paths
 */
export const squatOnlyFiles = (manifest, squatKey) =>
  onlyReachableVia(manifest, squatKey, 'Squat root');

/** The URLs Workbox wrote into sw.js's precache list ({url:"…",revision}). */
export const precacheUrls = (sw) =>
  [...(sw ?? '').matchAll(/url:"([^"]+)"/g)].map((m) => m[1]);

/**
 * Whether sw.js still answers navigations with index.html. The squat chunks
 * left the precache; the page that loads them must not have.
 */
export const servesIndexNavigation = (sw) =>
  /NavigationRoute\([^()]*createHandlerBoundToURL\("index\.html"\)\)/.test(
    sw ?? ''
  );

const base = (f) => (f.startsWith('assets/') ? f.slice('assets/'.length) : f);

// ── The squat split's structural invariants ─────────────────────────
// Each returns a list of problems (empty = holds). Each guards a failure no
// byte budget would notice: three.js on a first paint can fit under a generous
// ceiling, and a mislabelled chunk changes nothing's size.

/**
 * `viaKey`'s own files must be on none of the boot graphs' first paints.
 * `what` names the chunk in the message and `fix` says what to do; both
 * default to the 3D chunk, the first thing this guarded.
 * @returns {string[]} problems; empty when the invariant holds
 */
export function firstPaintLeaks(
  manifest,
  viaKey,
  bootKeys,
  { what = 'the 3D chunk', fix = 'Import it only through loadScene.js.' } = {}
) {
  const only = new Set(onlyReachableVia(manifest, viaKey).map(base));
  const problems = [];
  if (!only.size) {
    problems.push(
      `Nothing is reachable only through ${viaKey} — ${what} was merged into something else, or renamed.`
    );
  }
  for (const boot of bootKeys) {
    const leaked = entryFilesFrom(manifest, { bootKeys: [boot] })
      .map(base)
      .filter((f) => only.has(f));
    if (leaked.length) {
      problems.push(
        `${what[0].toUpperCase()}${what.slice(1)} is on ${boot}'s first paint: ${leaked.join(', ')}. ${fix}`
      );
    }
  }
  return problems;
}

/**
 * The squat-only JS (from the graph) and the prefixed JS (from the file
 * names) must be the same set: Workbox and the Android build trust the name.
 */
export function prefixMismatch(squatOnly, assetNames, prefixed) {
  const graph = squatOnly
    .map(base)
    .filter((f) => f.endsWith('.js'))
    .sort();
  const named = assetNames.filter((f) => prefixed.test(f)).sort();
  if (graph.join('\n') === named.join('\n')) return [];
  return [
    `The squat-only JS and the squat-* JS differ.\n  squat-only: ${graph.join(', ')}\n  squat-*:    ${named.join(', ')}\n  Fix scripts/squatChunks.mjs — Workbox and the Android build select by the prefix.`,
  ];
}

/** No squat file may be in the precache list. */
export function precachedSquat(urls) {
  const hits = urls.filter((u) => /(^|\/)assets\/squat-/.test(u));
  return hits.length
    ? [
        `sw.js precaches squat files: ${hits.join(', ')}. They belong in globIgnores.`,
      ]
    : [];
}

/** No translated catalog may be in the precache list (i18nChunks.mjs). */
export function precachedI18n(urls) {
  const hits = urls.filter((u) => /(^|\/)assets\/i18n-/.test(u));
  return hits.length
    ? [
        `sw.js precaches translated catalogs: ${hits.join(', ')}. Every English install would download them; they belong in globIgnores.`,
      ]
    : [];
}

/**
 * A translated dashboard catalog's own files: all named i18n-*, and none of
 * them reachable from /squat (one product never loads the other's words).
 * @returns {string[]} problems; empty when the invariant holds
 */
export function i18nCatalogProblems(manifest, catalogKey, squatKey, named) {
  const files = onlyReachableVia(manifest, catalogKey, 'Catalog')
    .map(base)
    .filter((f) => f.endsWith('.js'));
  const problems = [];
  const unnamed = files.filter((f) => !named.test(f));
  if (!files.length || unnamed.length) {
    problems.push(
      `${catalogKey} did not build to i18n-* JS only (got: ${files.join(', ') || 'nothing'}). Fix scripts/i18nChunks.mjs — Workbox selects by the prefix.`
    );
  }
  // /squat statically imports the shared entry, which dynamically imports the
  // dashboard; walking through the entry would find everything. Stop there.
  const entries = Object.keys(manifest).filter((key) => manifest[key]?.isEntry);
  const fromSquat = new Set(
    [...reachableFiles(manifest, [squatKey], { stopAt: entries })].map(base)
  );
  const shared = files.filter((f) => fromSquat.has(f));
  if (shared.length) {
    problems.push(
      `/squat can reach the dashboard catalog: ${shared.join(', ')}.`
    );
  }
  return problems;
}

/** The service worker must still serve index.html for navigations. */
export const navigationProblems = (sw) =>
  servesIndexNavigation(sw)
    ? []
    : [
        'sw.js no longer answers navigations with index.html — check navigateFallback in vite.config.js.',
      ];
