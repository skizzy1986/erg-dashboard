import { COMPLETED_STATUSES } from '../constants/sessionStatus.js';
import { toISODate } from './dateFormat.js';
import { resolveEventWindow } from './eventLadderDates.js';

// Benchmarks slip late, they do not happen early — hence the asymmetric
// tolerance. A test done 8 days before the window opened was a different test.
export const BENCHMARK_MATCH_TOLERANCE_BEFORE_DAYS = 3;
export const BENCHMARK_MATCH_TOLERANCE_AFTER_DAYS = 7;
export const UPCOMING_WINDOW_DAYS = 7;

const DAY_MS = 86400000;

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
    const label = String(session.label ?? '').toLowerCase();
    if (!terms.some((t) => t && label.includes(String(t).toLowerCase()))) {
      continue;
    }
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
