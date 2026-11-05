// Pure helpers over `anchors` rows ({ key, value, unit, status, valid_from, note }).
// anchors.value is text for every key, so anything numeric or structured is
// parsed and validated here before a view or the Coach context relies on it.

const NON_DISPLAY_UNITS = new Set(['json', 'text']);
const NUTRITION_DAY_TYPES = ['two-a-day', 'training', 'rest'];
const MACRO_KEYS = ['cal', 'protein', 'carbs', 'fat'];

// "<value> <unit> (<status>)". A value is never shown without the status it was
// recorded under, so a provisional number cannot read as a confirmed one.
export function formatAnchor(row) {
  if (!row || row.value == null || row.value === '') return '—';
  const unit =
    row.unit && !NON_DISPLAY_UNITS.has(row.unit) ? ` ${row.unit}` : '';
  const status = row.status ? ` (${row.status})` : '';
  return `${row.value}${unit}${status}`;
}

// The error message names the key only — never the value, which is personal
// data and would otherwise land in Sentry.
export function parseJsonAnchor(row, validate) {
  if (!row || row.value == null || row.value === '') {
    return { value: null, error: null };
  }
  let parsed;
  try {
    parsed = JSON.parse(row.value);
  } catch {
    return {
      value: null,
      error: new Error(`anchor ${row.key}: value is not valid JSON`),
    };
  }
  if (validate && !validate(parsed)) {
    return {
      value: null,
      error: new Error(`anchor ${row.key}: value has an unexpected shape`),
    };
  }
  return { value: parsed, error: null };
}

const isNum = (n) => typeof n === 'number' && Number.isFinite(n);
const isRange = (r) =>
  Array.isArray(r) &&
  r.length === 2 &&
  isNum(r[0]) &&
  isNum(r[1]) &&
  r[0] <= r[1];
const isPlainObject = (o) =>
  o != null && typeof o === 'object' && !Array.isArray(o);

// { "<day type>": { cal: [lo, hi], protein: [lo, hi], carbs: [lo, hi], fat: [lo, hi] } }
export function validateNutritionTargets(obj) {
  if (!isPlainObject(obj)) return false;
  const types = Object.keys(obj);
  if (types.length === 0) return false;
  return types.every(
    (t) =>
      NUTRITION_DAY_TYPES.includes(t) &&
      isPlainObject(obj[t]) &&
      MACRO_KEYS.every((m) => isRange(obj[t][m]))
  );
}

// { days: [{ day, train?, cal, p, c, f, cut? }], trigger?, rate?, phase? }
export function validateDayPlan(obj) {
  if (!isPlainObject(obj) || !Array.isArray(obj.days) || !obj.days.length)
    return false;
  return obj.days.every(
    (d) =>
      isPlainObject(d) &&
      typeof d.day === 'string' &&
      ['cal', 'p', 'c', 'f'].every((k) => isNum(d[k]))
  );
}

// Every live `niggle:<slug>` anchor, newest first.
export function listNiggles(anchorsByKey) {
  return Object.values(anchorsByKey ?? {})
    .filter(
      (row) => typeof row?.key === 'string' && row.key.startsWith('niggle:')
    )
    .map((row) => ({
      slug: row.key.slice('niggle:'.length),
      label: row.value ?? '',
      detail: row.note ?? '',
      status: row.status ?? null,
      validFrom: row.valid_from ?? null,
    }))
    .sort((a, b) => {
      if (a.validFrom === b.validFrom) return a.slug.localeCompare(b.slug);
      if (a.validFrom == null) return 1;
      if (b.validFrom == null) return -1;
      return a.validFrom < b.validFrom ? 1 : -1;
    });
}
