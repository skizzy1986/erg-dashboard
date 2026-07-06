// Template exercise strings embed rep-scheme text alongside the name, e.g.
// "Barbell Bench Press · 3×6–8 (focus)" — strip that off before matching a slug.
export function slugForExerciseName(name) {
  if (!name) return null;
  const base = String(name)
    .split('·')[0]
    .replace(/\([^)]*\)/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || null;
}
