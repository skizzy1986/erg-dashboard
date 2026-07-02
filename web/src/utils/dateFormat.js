// Normalizes sessions.date text to ISO YYYY-MM-DD so it can be used
// safely as a map/lookup key and sorted/compared lexically. Handles the
// live "M/D/YY" format (NOT zero-padded, e.g. "7/9/26") and passes
// already-ISO strings through unchanged. Unparseable input returns ''
// (an empty-string key never collides with a real date, so it's silently
// dropped from date-keyed maps rather than crashing or miskeying).
export function toISODate(value) {
  if (!value) return '';
  const s = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (m) {
    const [, mo, day, yy] = m;
    return `20${yy}-${mo.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  return '';
}
