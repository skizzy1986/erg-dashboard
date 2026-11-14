import { i18n } from '@lingui/core';
import { captureError } from '../utils/sentry.js';

// Each product registers its own catalogs, so this module never names a
// product's files. A dynamic import here of /squat's Spanish would make that
// chunk reachable from the dashboard's graph, and the reverse.
//   name    — which of the product's catalogs ('main' unless it has several)
//   source  — that catalog's English messages, already loaded where it boots
//   loaders — { es: () => import('…/es.po') }
//
// A product can hold several catalogs, registered at different times: the
// dashboard's boot catalog arrives with AuthGate, its views catalog with the
// lazy shells (src/i18n/views.js). Asking for a language loads every catalog
// registered so far; LanguageProvider subscribes, and loads a later one when
// it arrives.
const products = new Map();
const listeners = new Set();

export function registerCatalogs(product, { name = 'main', source, loaders }) {
  if (!products.has(product)) products.set(product, new Map());
  products.get(product).set(name, { source, loaders });
  listeners.forEach((listener) => listener());
}

export function subscribeCatalogs(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// A catalog a product will register later can be fetched before it does: the
// dashboard's views Spanish is asked for the moment Spanish is chosen or
// booted, not when the lazy shell that registers it loads (a sign-in after
// choosing Spanish on the login card would otherwise wait a whole extra fetch
// on the ground). Only the Spanish loader is named here, so the boot path never
// reaches that catalog's English. load() takes the in-flight promise, once.
const prefetches = new Map();

export function registerPrefetch(product, { name, loaders }) {
  for (const [lang, loader] of Object.entries(loaders)) {
    prefetches.set(`${lang}:${product}:${name}`, { loader });
  }
}

// Starts each prefetch for that language whose catalog has not registered
// yet. Never rejects and never reports: a failure surfaces, and is reported,
// when the registered catalog's load takes the promise.
export function prefetchLocale(lang, product) {
  if (lang === 'en') return;
  const registered = products.get(product);
  for (const [key, entry] of prefetches) {
    const [l, p, name] = key.split(':');
    if (l !== lang || p !== product || registered?.has(name)) continue;
    if (!entry.promise) {
      entry.promise = entry.loader();
      entry.promise.catch(() => {});
    }
  }
}

function fetchCatalog(lang, product, name, loader) {
  const entry = prefetches.get(`${lang}:${product}:${name}`);
  const prefetched = entry?.promise;
  if (!prefetched) return loader();
  entry.promise = undefined;
  return prefetched;
}

const namesOf = (product) => [...(products.get(product)?.keys() ?? [])];

// A stable snapshot of which catalogs a product has, for useSyncExternalStore.
export const catalogNames = (product) => namesOf(product).join();

let cache;
let boots;

// Long enough for a slow mobile connection to fetch one small chunk, short
// enough that a stored Spanish choice never holds the boot on a blank ground.
export const LOCALE_TIMEOUT_MS = 4000;

// Spanish is loaded over the English sources, so a message a Spanish catalog
// lacks still renders English. The compiled catalog already applies that
// fallback per message at build time; this covers a catalog older than the
// code that reads it (a cached chunk after a deploy), where Lingui would
// otherwise print the message id. All the product's English goes in first and
// all the Spanish that has arrived over it, so a catalog arriving late cannot
// put English back over another's Spanish (a message both hold: "Settings").
//
// A catalog that arrives after the timeout is dropped, not loaded: the visitor
// has already been told Spanish failed and is reading English, so nothing may
// change under them. Choosing Spanish again fetches it again, by then usually
// from the module cache.
function load(lang, product, name) {
  const catalogs = products.get(product);
  const entry = catalogs?.get(name);
  const what = `${lang} catalog ${name} for ${product}`;
  const loader = entry?.loaders?.[lang];
  if (!loader) return Promise.reject(new Error(`No ${what}`));
  let timer;
  let timedOut = false;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      timedOut = true;
      reject(new Error(`${what} timed out after ${LOCALE_TIMEOUT_MS} ms`));
    }, LOCALE_TIMEOUT_MS);
  });
  const fetched = fetchCatalog(lang, product, name, loader).then(
    ({ messages }) => {
      if (timedOut) return false;
      entry[lang] = messages;
      const all = [...catalogs.values()];
      i18n.load(
        lang,
        Object.assign(
          {},
          ...all.map((c) => c.source),
          ...all.map((c) => c[lang])
        )
      );
      return true;
    }
  );
  // The losing side of the race must not surface as an unhandled rejection.
  fetched.catch(() => {});
  return Promise.race([fetched, timeout]).finally(() => clearTimeout(timer));
}

// True only when every catalog the product has registered is loaded for that
// language: a provider can tell without waiting whether anything is missing.
export const localeReady = (lang, product) =>
  lang === 'en' ||
  [...(products.get(product)?.values() ?? [])].every((c) => c[lang]);

// Never rejects: true when every registered catalog of the product loaded. A
// failed or timed-out catalog is reported once, resolves false, and is dropped
// from the cache so the next attempt fetches it again.
export function ensureLocale(lang, product) {
  if (lang === 'en') return Promise.resolve(true);
  prefetchLocale(lang, product);
  cache ??= new Map();
  const names = namesOf(product);
  return Promise.all(
    (names.length ? names : ['main']).map((name) => {
      const key = `${lang}:${product}:${name}`;
      if (!cache.has(key)) {
        cache.set(
          key,
          load(lang, product, name).catch((error) => {
            cache.delete(key);
            captureError(error, { where: 'i18n', product, lang });
            return false;
          })
        );
      }
      return cache.get(key);
    })
  ).then((results) => results.every(Boolean));
}

// The promise a provider holds a render on (React's use() needs the same
// promise on every attempt). Unlike ensureLocale's, it is kept after a
// failure: a retry here would re-suspend the boot forever. It is keyed by the
// catalogs registered when asked, so one registered later gets its own. It
// activates the language itself, so nothing has to during a render; when a
// late catalog fails it hands the app back to English, which the provider
// then shows.
export function bootLocale(lang, product) {
  boots ??= new Map();
  const key = `${lang}:${product}:${catalogNames(product)}`;
  if (!boots.has(key)) {
    boots.set(
      key,
      ensureLocale(lang, product).then((ok) => {
        if (ok) i18n.activate(lang);
        else if (i18n.locale === lang) i18n.activate('en');
        return ok;
      })
    );
  }
  return boots.get(key);
}

export function __resetLocaleCacheForTests() {
  cache = undefined;
  boots = undefined;
  for (const entry of prefetches.values()) entry.promise = undefined;
  for (const catalogs of products.values()) {
    for (const c of catalogs.values()) delete c.es;
  }
}
