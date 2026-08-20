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

function localLogDate(d) {
  return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(-2)}`;
}

// Inverse of toISODate: produces the unpadded "M/D/YY" text that sessions.date
// stores (verified against production — 92/92 rows are unpadded). Accepts a
// Date, an ISO "YYYY-MM-DD" string, or an already-"M/D/YY" string (idempotent);
// anything unparseable falls back to today. Always reads LOCAL calendar fields
// — toISOString() would shift the day either side of midnight in a non-UTC zone
// and file the session against the wrong date.
export function toLogDate(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? localLogDate(new Date())
      : localLogDate(value);
  }

  const s = value == null ? '' : String(value).trim();

  if (/^\d{1,2}\/\d{1,2}\/\d{2}$/.test(s)) return s;

  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const [, yyyy, mo, day] = iso;
    return `${Number(mo)}/${Number(day)}/${yyyy.slice(2)}`;
  }

  return localLogDate(new Date());
}
