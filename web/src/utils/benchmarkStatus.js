import { COMPLETED_STATUSES } from '../constants/sessionStatus.js';
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
    keywords: [],
  };
}

function findMatch(sessions, keywords, searchStart, searchEnd, consumed) {
  if (keywords.length === 0) return null;
  for (const s of sessions) {
    if (!s || !COMPLETED_STATUSES.includes(s.status)) continue;
    if (consumed.has(s.id)) continue;
    const iso = toISODate(s.date);
    if (!iso || iso < searchStart || iso > searchEnd) continue;
    const tokens = tokenize(s.label);
    if (tokens.some((t) => keywords.includes(t))) return s;
  }
  return null;
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
        : findMatch(rows, st.keywords, searchStart, searchEnd, consumed);
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

  return states;
}

export function selectUpcoming(states) {
  return (states ?? []).filter((s) => s && s.status === 'upcoming');
}
