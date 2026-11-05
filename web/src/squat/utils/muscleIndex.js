import { REGION_NAMES, REGION_OF } from '../constants/muscleRegions.js';
import { MUSCLE_SYNONYMS } from '../constants/muscleSynonyms.js';

// Below this, a query is too short to mean a region: "a" would otherwise pull
// in abs, abductors and arms, and "hi" every hip region. Short queries still
// match muscle names and roles, which is what someone two letters into a word
// is actually doing.
const MIN_REGION_QUERY = 3;

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
 * Region ids a query names, by region name or by coach word. `q` must already
 * be folded.
 *
 * A synonym matches as a PREFIX of the query's own length, never the other way
 * round: `word.includes(q)` alone makes "a" match nine regions, and the
 * reverse test `q.includes(word)` is worse still — it made "gluteus medius"
 * return Hip extensors (because the query contains "glute") and "quadratus
 * lumborum" return Knee extensors (because it contains "quad"). Those are
 * queries a coach types. A prefix test gives "glu" -> glutes and leaves
 * "gluteus medius" to the name match, which is where it belongs.
 */
export function regionsMatching(q) {
  const out = new Set();
  if (!q || q.length < MIN_REGION_QUERY) return out;
  REGION_NAMES.forEach((name, id) => {
    if (name.toLowerCase().includes(q)) out.add(id);
  });
  for (const [word, id] of Object.entries(MUSCLE_SYNONYMS)) {
    if (word.startsWith(q)) out.add(id);
  }
  return out;
}

/**
 * Groups `meta.muscles` into the eleven regions. `all` is manifest order, so
 * an entry's `i` is its index in the activation arrays.
 */
export function buildMuscleIndex(muscles) {
  const all = (muscles ?? []).map((m, i) => {
    const region = REGION_OF[i];
    // Unreachable while the manifest sha pin holds, which is exactly why it
    // throws: a silent `?? 0` would file an unmapped muscle under Hip
    // extensors, the one default that reads as a deliberate coaching claim.
    // Re-derive REGION_OF — see docs/onboarding/NEW_MOVEMENT.md.
    if (region === undefined) {
      throw new Error(`No region for muscle ${i} (${m?.name}).`);
    }
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
