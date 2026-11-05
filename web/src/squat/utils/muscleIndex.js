import { REGION_NAMES, REGION_OF } from '../constants/muscleRegions.js';
import { regionsMatching } from '../constants/muscleSynonyms.js';

/**
 * A muscle's URL slug. A function, not a table: 118 names produce 118 unique
 * slugs (verified), ~80 bytes of code instead of ~1 KB of data, and a name
 * survives a data regeneration where an array index does not.
 */
export const slugify = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// Folds case and diacritics so "soleus" finds Soleus and "fibularis" finds
// Fibulāris if the data ever carries one.
export const foldQuery = (s) =>
  (s ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase();

/**
 * Groups `meta.muscles` into the eleven regions. `all` is manifest order, so
 * an entry's `i` is its index in the activation arrays.
 */
export function buildMuscleIndex(muscles) {
  const all = (muscles ?? []).map((m, i) => {
    const region = REGION_OF[i] ?? 0;
    return {
      i,
      name: m.name,
      slug: slugify(m.name),
      region,
      regionName: REGION_NAMES[region],
      role: m.role,
      hasAct: !!m.act,
    };
  });
  return { all, regions: groupByRegion(all) };
}

// A region with no items is dropped: the APG requires every role="group" in a
// listbox to hold at least one option and to have an accessible name.
function groupByRegion(items) {
  return REGION_NAMES.map((name, id) => ({
    id,
    name,
    items: items.filter((m) => m.region === id),
  })).filter((g) => g.items.length);
}

/**
 * Name, role or region/coach-word match. Returns the regrouped survivors and
 * how many there are; an empty query returns everything untouched.
 */
export function filterMuscles(index, query) {
  const q = foldQuery(query);
  if (!q) return { regions: index.regions, matches: index.all.length };
  const regions = regionsMatching(q);
  const hits = index.all.filter(
    (m) =>
      foldQuery(m.name).includes(q) ||
      foldQuery(m.role).includes(q) ||
      regions.has(m.region)
  );
  return { regions: groupByRegion(hits), matches: hits.length };
}

/** The entry a `#m=` slug names, or null. */
export const findBySlug = (index, slug) =>
  (slug && index.all.find((m) => m.slug === slug)) || null;
