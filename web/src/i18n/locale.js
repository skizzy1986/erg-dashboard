import { i18n } from '@lingui/core';
import { captureError } from '../utils/sentry.js';

// Each product registers its own catalogs, so this module never names a
// product's files. A dynamic import here of /squat's Spanish would make that
// chunk reachable from the dashboard's graph, and the reverse.
//   source  — the product's English messages, already loaded at its boot.
//   loaders — { es: () => import('…/es.po') }
const products = new Map();

export function registerCatalogs(product, { source, loaders }) {
  products.set(product, { source, loaders });
}

let cache;
let boots;

// Long enough for a slow mobile connection to fetch one small chunk, short
// enough that a stored Spanish choice never holds the boot on a blank ground.
export const LOCALE_TIMEOUT_MS = 4000;

// Spanish is loaded over the English source, so a message the Spanish catalog
// lacks still renders English. The compiled catalog already applies that
// fallback per message at build time; this covers a catalog older than the
// code that reads it (a cached chunk after a deploy), where Lingui would
// otherwise print the message id.
//
// A catalog that arrives after the timeout is dropped, not loaded: the visitor
// has already been told Spanish failed and is reading English, so nothing may
// change under them. Choosing Spanish again fetches it again, by then usually
// from the module cache.
function load(lang, product) {
  const entry = products.get(product);
  const loader = entry?.loaders?.[lang];
  if (!loader) {
    return Promise.reject(new Error(`No ${lang} catalog for ${product}`));
  }
  let timer;
  let timedOut = false;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      timedOut = true;
      reject(
        new Error(
          `${lang} catalog for ${product} timed out after ${LOCALE_TIMEOUT_MS} ms`
        )
      );
    }, LOCALE_TIMEOUT_MS);
  });
  const fetched = loader().then(({ messages }) => {
    if (timedOut) return false;
    i18n.load(lang, { ...entry.source, ...messages });
    return true;
  });
  // The losing side of the race must not surface as an unhandled rejection.
  fetched.catch(() => {});
  return Promise.race([fetched, timeout]).finally(() => clearTimeout(timer));
}

// Never rejects. A failed or timed-out catalog is reported once, resolves to
// false, and is dropped from the cache so the next attempt fetches again.
export function ensureLocale(lang, product) {
  if (lang === 'en') return Promise.resolve(true);
  cache ??= new Map();
  const key = `${lang}:${product}`;
  if (!cache.has(key)) {
    cache.set(
      key,
      load(lang, product).catch((error) => {
        cache.delete(key);
        captureError(error, { where: 'i18n', product, lang });
        return false;
      })
    );
  }
  return cache.get(key);
}

// The promise a provider holds its first render on (React's use() needs the
// same promise on every attempt). Unlike ensureLocale's, it is kept after a
// failure: a retry here would re-suspend the boot forever. It activates the
// language itself, so nothing has to during a render.
export function bootLocale(lang, product) {
  boots ??= new Map();
  const key = `${lang}:${product}`;
  if (!boots.has(key)) {
    boots.set(
      key,
      ensureLocale(lang, product).then((ok) => {
        if (ok) i18n.activate(lang);
        return ok;
      })
    );
  }
  return boots.get(key);
}

export function __resetLocaleCacheForTests() {
  cache = undefined;
  boots = undefined;
}
