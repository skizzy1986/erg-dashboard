// How a translated catalog's chunk is told apart from the rest, in one place —
// the i18n sibling of squatChunks.mjs, with the same shape and the same reason.
// A Spanish catalog is fetched only by a visitor who chose Spanish. Left to
// Workbox's defaults it would be precached, and every English install would
// download it on every update; named i18n-*, it is skipped by the precache and
// cached on first use instead. The Android build keeps it (unlike squat-*), so
// Spanish works offline there.

// A dashboard catalog for a language other than the source (English). The
// English catalog is a static import on first paint; it must never pick up
// this name, or it would leave the precache and the dashboard would break
// offline. /squat's catalogs live under src/squat/ and take the squat- prefix
// instead, because that rule is checked first.
const TRANSLATED_CATALOG =
  /\/src\/locales\/(?!en\.po)[a-z]{2}(?:-[A-Za-z]{2})?\.po(?:\?.*)?$/;

export const isTranslatedCatalog = (moduleIds) =>
  Array.isArray(moduleIds) &&
  moduleIds.length > 0 &&
  moduleIds.every(
    (id) => TRANSLATED_CATALOG.test(id) && !id.includes('/src/squat/')
  );

export const I18N_CHUNK_NAME = 'assets/i18n-[name]-[hash].js';

/** The built file names the prefix produces (dist/assets basenames). */
export const I18N_JS = /^i18n-.*\.js$/;

export const I18N_GLOB_IGNORES = ['**/assets/i18n-*.js'];

export const I18N_CODE_ROUTE = {
  // Content-hashed, so cache-first is safe: a new build's catalog has a new
  // name, so a switch can never be served a stale one.
  urlPattern: /\/assets\/i18n-[^/]+\.js$/,
  handler: 'CacheFirst',
  options: {
    cacheName: 'i18n-code',
    expiration: { maxEntries: 10, maxAgeSeconds: 30 * 24 * 60 * 60 },
    cacheableResponse: { statuses: [200] },
  },
};
