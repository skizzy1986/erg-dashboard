import {
  COMPLETED_STATUSES,
  PLANNED_STATUS,
} from '../constants/sessionStatus.js';
import { toISODate } from './dateFormat.js';
import {
  BENCHMARK_GRACE_DAYS,
  addCalendarDays,
  benchmarkKeywords,
  diffCalendarDays,
  parseEventWindow,
  tokenize,
} from './eventWindow.js';

// Pure resolver: given the event ladder and the session rows, decide which
// benchmarks are overdue, due soon, or quiet. `today` is INJECTED — nothing
// below the hook layer reads the clock, so every case is reproducible.

const UPCOMING_WITHIN_DAYS = 7;

function baseState(entry, index) {
  return {
    entry,
    index,
    status: 'unknown',
    window: null,
    fuzzy: false,
    done: false,
    matchedSessionId: null,
    daysUntilStart: null,
    daysOverdue: null,
    rescheduledTo: null,
    plannedSessionId: null,
    keywords: [],
  };
}

// A Zwift/bike row ends "<time>, 22.4km, 1,000m" — that trailing field is
// ELEVATION, and once commas stopped splitting digit groups it tokenises to
// '1000m' and satisfies the 1000m/2k rowing benchmarks. Scott's rowing labels
// spell distance '5,000m' and never carry a km token; every ride row does, so
// the km token separates the two cases exactly.
function hasRideDistance(tokens) {
  return tokens.some((t) => /^\d+(?:\.\d+)?km$/.test(t));
}

// Ranks two eligible candidates: a session dated inside the entry's own window
// beats one only in the grace/forward slack, then the earlier date wins, then
// the lower id. Never "nearest to the window" — session 61 (7/5, four days off
// the 7/1 window) is nearer than session 45 (6/23, eight days), so nearest-first
// leaves the steal in place.
function betterFit(a, b) {
  if (a.inWindow !== b.inWindow) return a.inWindow;
  if (a.iso !== b.iso) return a.iso < b.iso;
  return a.session.id < b.session.id;
}

// Whole-token membership plus the ride-elevation exclusion — the label half of
// eligibility, shared by the completed-session and planned-session passes. The
// STATUS half is deliberately not shared: each pass keeps its own gate.
function labelMatches(label, keywords) {
  const tokens = tokenize(label);
  if (!tokens.some((t) => keywords.includes(t))) return false;
  return !hasRideDistance(tokens);
}

// Deterministic best fit, NOT the first row in payload order. The payload used
// to be ordered by the TEXT date column, so '7/5/26' sorted above '6/23/26';
// combined with a search range that runs forward to today, first-in-order let
// CP Test #1 consume the session that belongs to CP Test #2 and the later badge
// could never clear. Choosing by date instead of position also makes the result
// independent of how the server happened to sort the rows.
function findMatch(sessions, keywords, searchStart, searchEnd, consumed, win) {
  if (keywords.length === 0) return null;
  let best = null;
  for (const s of sessions) {
    if (!s || !COMPLETED_STATUSES.includes(s.status)) continue;
    if (consumed.has(s.id)) continue;
    const iso = toISODate(s.date);
    if (!iso || iso < searchStart || iso > searchEnd) continue;
    if (!labelMatches(s.label, keywords)) continue;
    const cand = {
      session: s,
      iso,
      inWindow: iso >= win.start && iso <= win.end,
    };
    if (best === null || betterFit(cand, best)) best = cand;
  }
  return best === null ? null : best.session;
}

// The rescheduling counterpart: the soonest FUTURE planned session that names
// the benchmark. A planned row is a commitment, never evidence — it can only
// move a badge from 'overdue' to 'scheduled', never to 'done', so the status
// gate here is PLANNED_STATUS and must never be merged with findMatch's.
// `today` is inclusive: a session dated today is still a live commitment.
function findPlannedMatch(sessions, keywords, today, claimed) {
  if (keywords.length === 0) return null;
  let best = null;
  for (const s of sessions) {
    if (!s || s.status !== PLANNED_STATUS) continue;
    if (claimed.has(s.id)) continue;
    const iso = toISODate(s.date);
    if (!iso || iso < today) continue;
    if (!labelMatches(s.label, keywords)) continue;
    const better =
      best === null ||
      (iso === best.iso ? s.id < best.session.id : iso < best.iso);
    if (better) best = { session: s, iso };
  }
  return best;
}

export function resolveLadderStatuses(ladder, sessions, options = {}) {
  const entries = Array.isArray(ladder) ? ladder : [];
  const {
    today,
    sessionsReady,
    graceDays = BENCHMARK_GRACE_DAYS,
  } = options ?? {};
  const states = entries.map(baseState);

  // Loading or errored data is never overdue and never done — the badge stays
  // silent rather than fabricating a signal from an empty payload.
  if (!sessionsReady || !today) return states;

  const rows = Array.isArray(sessions) ? sessions : [];
  const pending = [];
  for (const st of states) {
    if (!st.entry || st.entry.kind !== 'benchmark') {
      st.status = 'quiet';
      continue;
    }
    const win = parseEventWindow(st.entry.date);
    if (!win) {
      st.status = 'quiet';
      continue;
    }
    st.window = { start: win.start, end: win.end };
    st.fuzzy = win.fuzzy;
    st.keywords = benchmarkKeywords(st.entry.name);
    pending.push(st);
  }

  // Claim order is chronological: an earlier benchmark takes the session first,
  // so one CP effort cannot silently clear two CP tests.
  pending.sort((a, b) =>
    a.window.start === b.window.start
      ? a.index - b.index
      : a.window.start < b.window.start
        ? -1
        : 1
  );

  const consumed = new Set();
  for (const st of pending) {
    const searchStart = addCalendarDays(st.window.start, -graceDays);
    const searchEnd = st.window.end > today ? st.window.end : today;
    const match =
      searchStart === null
        ? null
        : findMatch(
            rows,
            st.keywords,
            searchStart,
            searchEnd,
            consumed,
            st.window
          );
    if (match) {
      consumed.add(match.id);
      st.done = true;
      st.matchedSessionId = match.id;
    }

    if (st.done) {
      st.status = 'quiet';
    } else if (today > st.window.end) {
      st.status = 'overdue';
      st.daysOverdue = diffCalendarDays(st.window.end, today);
    } else {
      const until = diffCalendarDays(today, st.window.start);
      if (until !== null && until <= UPCOMING_WITHIN_DAYS) {
        st.status = 'upcoming';
        st.daysUntilStart = until;
      } else {
        st.status = 'quiet';
      }
    }
  }

  // Second pass: an overdue benchmark with a future planned session is not
  // being ignored, it has been moved. Only 'overdue' is an entry point — a
  // planned row never touches a done, upcoming or quiet benchmark. A SEPARATE
  // claim set from pass 1: one planned row must not clear two benchmarks.
  const claimed = new Set();
  for (const st of pending) {
    if (st.status !== 'overdue') continue;
    const hit = findPlannedMatch(rows, st.keywords, today, claimed);
    if (!hit) continue;
    claimed.add(hit.session.id);
    st.status = 'scheduled';
    st.rescheduledTo = hit.iso;
    st.plannedSessionId = hit.session.id;
  }

  return states;
}

// Loudest first: an overdue benchmark outranks one merely due soon, and both
// outrank one already rescheduled. Ties keep ladder order.
const SEVERITY_RANK = { overdue: 0, upcoming: 1, scheduled: 2 };

export function compareBenchmarkSeverity(a, b) {
  const ra = SEVERITY_RANK[a?.status] ?? 3;
  const rb = SEVERITY_RANK[b?.status] ?? 3;
  return ra === rb ? (a?.index ?? 0) - (b?.index ?? 0) : ra - rb;
}

export function selectUpcoming(states) {
  return (states ?? []).filter((s) => s && s.status === 'upcoming');
}
