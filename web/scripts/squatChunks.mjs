// How the squat tool's JS is told apart from the dashboard's, in one place:
// vite.config.js names chunks with it and configures Workbox with it, and
// check-bundle-size.mjs and the Android build select files by the prefix it
// produces. Plain data and functions so each piece is unit-tested.

// A module belongs to the squat tool if it lives under one of these.
export const SQUAT_ONLY_DIRS = [
  '/src/squat/',
  '/src/anatomy/',
  '/node_modules/three/',
];

// EVERY module in the chunk must be the tool's. A chunk that mixes in shared
// code is the dashboard's too and must keep its plain, precached name.
export const isSquatOnly = (moduleIds) =>
  Array.isArray(moduleIds) &&
  moduleIds.length > 0 &&
  moduleIds.every((id) => SQUAT_ONLY_DIRS.some((dir) => id.includes(dir)));

// Also every worker's name (vite.config.js `worker`): all workers today are
// the squat tool's. A dashboard worker would inherit the prefix, be skipped by
// the precache and stripped from the APK — check-bundle-size.mjs's prefix
// invariant fails the build if that happens.
export const SQUAT_CHUNK_NAME = 'assets/squat-[name]-[hash].js';
export const PLAIN_CHUNK_NAME = 'assets/[name]-[hash].js';

/** rolldown output.chunkFileNames */
export const squatChunkFileNames = (chunk) =>
  isSquatOnly(chunk.moduleIds) ? SQUAT_CHUNK_NAME : PLAIN_CHUNK_NAME;

/** The built file names the prefix produces (dist/assets basenames). */
export const SQUAT_JS = /^squat-.*\.js$/;

// Workbox: the tool's data and code are never precached (every installed
// dashboard would download them on update), and are cached on first use.
export const SQUAT_GLOB_IGNORES = [
  '**/squat-*.{json,bin}',
  '**/assets/squat-*.js',
];

export const SQUAT_CODE_ROUTE = {
  // Content-hashed, so cache-first is safe; capped so old builds' chunks age
  // out instead of piling up.
  urlPattern: /\/assets\/squat-[^/]+\.js$/,
  handler: 'CacheFirst',
  options: {
    cacheName: 'squat-code',
    expiration: { maxEntries: 30, maxAgeSeconds: 30 * 24 * 60 * 60 },
    cacheableResponse: { statuses: [200] },
  },
};
