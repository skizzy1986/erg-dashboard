import {
  COMPLETED_STATUSES,
  PLANNED_STATUS,
} from '../constants/sessionStatus.js';
import { toISODate } from './dateFormat.js';
import {
  benchmarkKeywords,
  diffCalendarDays,
  parseEventWindow,
  tokenize,
} from './eventWindow.js';

// Pure resolver: given the event ladder and the session rows, decide which
// benchmarks are overdue, due soon, rescheduled, or quiet. `today` is
// INJECTED — nothing below the hook layer reads the clock, so every case is
// reproducible.
//
// Two passes over disjoint row sets, and the split is the whole design:
//
//   Pass 1 — DONE, from COMPLETED rows, by EXPLICIT LINK only (#188). A
//   completed session carries the ladder entry's slug in
//   sessions.benchmark_key. Label text is never read to CLEAR a benchmark, so
//   no wording can clear one and no wording can stop one clearing. The link
//   also ignores the window: a test logged weeks late still counts, because a
//   date gate would be a second implicit input in a different costume.
//
//   Pass 2 — RESCHEDULED, from PLANNED rows, by label keywords (#192). A
//   planned row is a commitment, never evidence: it can only move a badge from
//   'overdue' to 'scheduled', never to 'done'. Keyword matching is safe here
//   precisely because the worst case is a badge that says "moved" instead of
//   "late" — it can never fabricate a completed benchmark.
//
// So the invariant is not "label text is never read", it is: label text is
// never read to clear a benchmark, only to reschedule one. The status gates of
// the two passes are disjoint and must never be merged.
//
// Neither pass lets payload order change an outcome: pass 1 keys on
// benchmark_key with a lowest-id tie-break, pass 2 picks the earliest ISO date
// with a lowest-id tie-break.

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

// Whole-token membership plus the ride-elevation exclusion. Used by the PLANNED
// pass only — the completed pass reads benchmark_key and never a label.
function labelMatches(label, keywords) {
  const tokens = tokenize(label);
  if (!tokens.some((t) => keywords.includes(t))) return false;
  return !hasRideDistance(tokens);
}

// At most one completed session per key, lowest id wins a collision. `id` is a
// bigint identity column — always present, always comparable, independent of
// payload order. NOT earliest date: sessions.date is TEXT and needs a parse
// that can fail. The partial unique index sessions_one_session_per_benchmark
// makes a collision impossible at the database; this keeps the resolver
// deterministic anyway, against a stale cache or a client ahead of the
// migration.
function buildLinkIndex(rows) {
  const byKey = new Map();
  for (const row of rows) {
    if (!row) continue;
    const key = row.benchmark_key;
    if (typeof key !== 'string' || key === '') continue;
    if (!COMPLETED_STATUSES.includes(row.status)) continue;
    const held = byKey.get(key);
    if (held === undefined || row.id < held.id) byKey.set(key, row);
  }
  return byKey;
}

// The rescheduling counterpart: the soonest FUTURE planned session that names
// the benchmark. A planned row is a commitment, never evidence — it can only
// move a badge from 'overdue' to 'scheduled', never to 'done', so the status
// gate here is PLANNED_STATUS and must never be merged with the link pass's.
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
  const { today, sessionsReady } = options ?? {};
  const states = entries.map(baseState);

  // Loading or errored data is never overdue and never done — the badge stays
  // silent rather than fabricating a signal from an empty payload.
  if (!sessionsReady || !today) return states;

  const rows = Array.isArray(sessions) ? sessions : [];
  const links = buildLinkIndex(rows);
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

  // Chronological, so that when two overdue benchmarks could both claim the
  // same planned session in pass 2, the earlier one takes it.
  pending.sort((a, b) =>
    a.window.start === b.window.start
      ? a.index - b.index
      : a.window.start < b.window.start
        ? -1
        : 1
  );

  for (const st of pending) {
    const linked = st.entry.key ? links.get(st.entry.key) : undefined;
    if (linked) {
      st.done = true;
      st.matchedSessionId = linked.id;
      st.status = 'quiet';
      continue;
    }

    if (today > st.window.end) {
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
