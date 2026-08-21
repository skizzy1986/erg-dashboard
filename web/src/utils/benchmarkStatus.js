import { COMPLETED_STATUSES } from '../constants/sessionStatus.js';
import { toISODate } from './dateFormat.js';
import { resolveEventWindow } from './eventLadderDates.js';

// Benchmarks slip late, they do not happen early — hence the asymmetric
// tolerance. A test done 8 days before the window opened was a different test.
export const BENCHMARK_MATCH_TOLERANCE_BEFORE_DAYS = 3;
export const BENCHMARK_MATCH_TOLERANCE_AFTER_DAYS = 7;
export const UPCOMING_WINDOW_DAYS = 7;

const DAY_MS = 86400000;

// Thousands separators are stripped before matching so `5,000m` and `5000m`
// are one label. Lookahead only — there is deliberately NO LOOKBEHIND
// anywhere in this module: iOS Safari < 16.4 does not support it and this
// dashboard is used on a phone. The lookahead form also handles `1,000,000`
// in a single pass, because the comma is consumed and the trailing digit is
// not, leaving the scan positioned to find the next separator.
const THOUSANDS_SEPARATOR = /(\d),(?=\d)/g;

const REGEX_SPECIALS = /[.*+?^${}()|[\]\\]/g;

// Exported for direct testing.
export function normaliseLabel(label) {
  // Case-folding and separator removal ONLY. Spaces, hyphens and other
  // punctuation are left alone — every extra normalisation is a new
  // false-positive surface.
  return String(label ?? '')
    .toLowerCase()
    .replace(THOUSANDS_SEPARATOR, '$1');
}

// Exported for direct testing.
export function labelMatchesTerms(label, terms) {
  const normalised = normaliseLabel(label);
  return (Array.isArray(terms) ? terms : []).some((term) => {
    if (!term) return false;
    const escaped = String(term).toLowerCase().replace(REGEX_SPECIALS, '\\$&');
    // Three guards, each load-bearing:
    //  - Left `[^0-9a-z.,]` is stricter than `\b` on purpose. `\b` still
    //    accepts `18.5km` as a `5k` hit, because the `.` before the `5` IS a
    //    word boundary. Excluding digits kills `22km`/`12km`/`21000m`;
    //    excluding `.` and `,` kills `18.5km`.
    //  - Optional `s?` keeps the true positive `tune-ups` for term `tune-up`;
    //    without it the right guard would reject the plural.
    //  - Right `[^0-9a-z]|$` kills `5km`/`2km` — `km` appears only on
    //    Zwift/cycling labels here, erg distances are always `NNNNm`.
    // The guards are consumed rather than looked around, which is safe
    // because only a boolean is needed and no term can overlap itself.
    const pattern = new RegExp(`(^|[^0-9a-z.,])${escaped}s?([^0-9a-z]|$)`, 'i');
    return pattern.test(normalised);
  });
}

function addDays(date, n) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);
}

function wholeDaysBetween(from, to) {
  return Math.round((to.getTime() - from.getTime()) / DAY_MS);
}

function sessionDate(value) {
  const iso = toISODate(value);
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Exported for direct testing.
export function matchBenchmarkSession(entry, window, sessions) {
  if (!entry || !window) return null;

  const terms = Array.isArray(entry.matchTerms) ? entry.matchTerms : [];
  if (terms.length === 0) return null;

  const from = addDays(window.start, -BENCHMARK_MATCH_TOLERANCE_BEFORE_DAYS);
  const to = addDays(window.overdueAfter, BENCHMARK_MATCH_TOLERANCE_AFTER_DAYS);

  const candidates = [];
  for (const session of Array.isArray(sessions) ? sessions : []) {
    if (!session) continue;
    // The status gate. NOT `status !== 'planned'` — that classifies a
    // cancelled session as done and would clear a benchmark that never ran.
    if (!COMPLETED_STATUSES.includes(session.status)) continue;
    const when = sessionDate(session.date);
    if (!when) continue;
    if (when < from || when > to) continue;
    if (!labelMatchesTerms(session.label, terms)) continue;
    candidates.push({
      session,
      distance: Math.abs(wholeDaysBetween(window.start, when)),
    });
  }

  if (candidates.length === 0) return null;

  candidates.sort(
    (a, b) =>
      a.distance - b.distance ||
      Number(a.session.id) - Number(b.session.id) ||
      String(a.session.label ?? '').localeCompare(String(b.session.label ?? ''))
  );
  return candidates[0].session;
}

export function deriveBenchmarkStatuses(entries, sessions, options = {}) {
  const { today = new Date(), sessionsReady = true } = options;
  const now = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  return (Array.isArray(entries) ? entries : []).map((entry) => {
    const base = {
      entry,
      window: null,
      status: 'none',
      matchedSession: null,
      daysOverdue: null,
      daysUntil: null,
    };

    if (!entry || entry.kind !== 'benchmark') return base;

    const window = resolveEventWindow(entry);
    if (!window) return base;

    const resolved = { ...base, window };

    // Evaluated before matching so an in-flight query can never be mistaken
    // for either "no match found → overdue" or "matched → done".
    if (!sessionsReady) return { ...resolved, status: 'pending' };

    const matchedSession = matchBenchmarkSession(entry, window, sessions);
    if (matchedSession) return { ...resolved, status: 'done', matchedSession };

    if (now > window.overdueAfter) {
      return {
        ...resolved,
        status: 'overdue',
        daysOverdue: wholeDaysBetween(window.overdueAfter, now),
      };
    }

    const daysUntil = wholeDaysBetween(now, window.start);
    if (window.start >= now && daysUntil <= UPCOMING_WINDOW_DAYS) {
      return { ...resolved, status: 'upcoming', daysUntil };
    }

    return resolved;
  });
}
