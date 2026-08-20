// Interprets the human prose in EVENT_LADDER[].date ("~Mid Jul 26",
// "12 Sep-9 Oct 26", "Wed 1 Jul 26") into a concrete calendar interval, plus
// the keyword/token helpers that decide whether a logged session represents a
// given benchmark. This is a PARSER, not a formatter — it never produces a
// display string, so it introduces no second formatDate variant.
//
// Every date crosses a function boundary as an ISO 'YYYY-MM-DD' STRING, never a
// Date object, so comparisons are zero-padded lexical compares and timezone
// never enters them. todayISO() is the ONLY function here that reads the clock.

// Days of slack allowed BEFORE a benchmark window opens when searching for the
// session that satisfies it. Tests done early (or a slipped date logged against
// the original plan) still clear the signal.
export const BENCHMARK_GRACE_DAYS = 14;

// Hand-seeded benchmark vocabulary. 'cp' is the sole benchmark identifier that
// carries no digit, so the digit-bearing token rule below cannot derive it.
export const BENCHMARK_TERMS = ['cp'];

const MONTHS = [
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
];

const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const QUALIFIERS = { early: 'early', mid: 'mid', late: 'late' };

const ISO_SHAPE = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 86400000;

function pad2(n) {
  return String(n).padStart(2, '0');
}

function daysInMonth(year, monthIndex) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

// Lowercases, folds "4-min" to "4min" (a hyphen between a digit and a letter is
// a spelling artefact, not a separator), then splits on every other
// non-alphanumeric run. Whole tokens only — substring matching would let a
// "24min" recovery row satisfy a "4min" CP test.
export function tokenize(text) {
  if (!text) return [];
  return String(text)
    .toLowerCase()
    .replace(/(\d)-(?=[a-z])/g, '$1')
    .replace(/([a-z])-(?=\d)/g, '$1')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

// Derives the tokens that identify a benchmark from its ladder name alone — no
// new ladder field, no per-entry map. A token qualifies when it carries a digit
// without being a bare numeral or an ordinal ('4min', '5k', '1000m'), or when
// it is an explicit benchmark term ('cp').
export function benchmarkKeywords(name) {
  const out = [];
  for (const t of tokenize(name)) {
    const digitBearing =
      /\d/.test(t) && !/^\d+$/.test(t) && !/^\d+(st|nd|rd|th)$/.test(t);
    if ((digitBearing || BENCHMARK_TERMS.includes(t)) && !out.includes(t)) {
      out.push(t);
    }
  }
  return out;
}

// Local calendar day, zero-padded. NOT toISOString().slice(0,10): that reports
// the UTC day, which in Australia/Perth (UTC+8) rolls over at 16:00 local and
// would flip a benchmark to overdue a day early.
export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function isoParts(iso) {
  if (typeof iso !== 'string' || !ISO_SHAPE.test(iso)) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return [y, m, d];
}

// Both instants are built with Date.UTC from the same (y,m,d) shape, so the
// difference is an exact multiple of a day in every host timezone.
export function diffCalendarDays(fromISO, toISO) {
  const a = isoParts(fromISO);
  const b = isoParts(toISO);
  if (!a || !b) return null;
  return (
    (Date.UTC(b[0], b[1] - 1, b[2]) - Date.UTC(a[0], a[1] - 1, a[2])) /
    MS_PER_DAY
  );
}

export function addCalendarDays(iso, days) {
  const a = isoParts(iso);
  if (!a || !Number.isFinite(days)) return null;
  const d = new Date(Date.UTC(a[0], a[1] - 1, a[2]) + days * MS_PER_DAY);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

function parsePart(raw) {
  let tokens = raw
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => t.replace(/\.$/, ''));
  if (tokens.length === 0) return null;

  if (WEEKDAYS.includes(tokens[0].toLowerCase())) tokens = tokens.slice(1);

  let year = null;
  const last = tokens[tokens.length - 1];
  if (tokens.length > 1 && /^\d{2}$/.test(last)) {
    year = 2000 + Number(last);
    tokens = tokens.slice(0, -1);
  }

  let qualifier = null;
  let day = null;
  let monthIndex = null;
  for (const t of tokens) {
    const lower = t.toLowerCase();
    if (QUALIFIERS[lower]) {
      qualifier = QUALIFIERS[lower];
      continue;
    }
    if (/^\d{1,2}$/.test(lower)) {
      const n = Number(lower);
      if (n < 1 || n > 31) return null;
      day = n;
      continue;
    }
    const idx = MONTHS.indexOf(lower.slice(0, 3));
    if (idx !== -1) monthIndex = idx;
  }

  if (monthIndex === null) return null;
  return { qualifier, day, monthIndex, year };
}

function resolvePart(part, year) {
  const lastDay = daysInMonth(year, part.monthIndex);
  if (part.qualifier === 'early') return { first: 1, last: 10, fuzzy: true };
  if (part.qualifier === 'mid') return { first: 11, last: 20, fuzzy: true };
  if (part.qualifier === 'late')
    return { first: 21, last: lastDay, fuzzy: true };
  if (part.day !== null) {
    if (part.day > lastDay) return null;
    return { first: part.day, last: part.day, fuzzy: false };
  }
  return { first: 1, last: lastDay, fuzzy: true };
}

// '~Mid Jul 26' -> { start: '2026-07-11', end: '2026-07-20', fuzzy: true }
// Returns null for anything it cannot read — the caller treats that as "no
// window", never as "the window is today".
export function parseEventWindow(dateText) {
  if (typeof dateText !== 'string' || dateText.trim() === '') return null;

  const normalised = dateText
    .replace(/[–—]/g, '-')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/~/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (normalised === '') return null;

  const rawParts = normalised.split('-');
  if (rawParts.length > 2) return null;

  const parts = rawParts.map(parsePart);
  if (parts.some((p) => p === null)) return null;

  const lastPart = parts[parts.length - 1];
  const endYear = lastPart.year;
  if (endYear === null) return null;

  const firstPart = parts[0];
  let startYear = firstPart.year;
  if (startYear === null) {
    startYear =
      firstPart.monthIndex > lastPart.monthIndex ? endYear - 1 : endYear;
  }

  const startRange = resolvePart(firstPart, startYear);
  const endRange =
    parts.length === 1 ? startRange : resolvePart(lastPart, endYear);
  if (!startRange || !endRange) return null;

  const start = `${startYear}-${pad2(firstPart.monthIndex + 1)}-${pad2(startRange.first)}`;
  const end = `${endYear}-${pad2(lastPart.monthIndex + 1)}-${pad2(endRange.last)}`;
  if (start > end) return null;

  return { start, end, fuzzy: startRange.fuzzy || endRange.fuzzy };
}
