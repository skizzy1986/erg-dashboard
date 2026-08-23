import { useState } from 'react';
import { COMPLETED_STATUSES } from '../constants/sessionStatus.js';
import { THEME } from '../constants/theme.js';
import { toISODate } from '../utils/dateFormat.js';

// props:
//   benchmarkKey    — string, required. The ladder entry's slug.
//   benchmarkName   — string, required. For the aria-labels.
//   linkedSessionId — number | null. Pass bench.matchedSessionId.
//   sessions        — array of { id, date, label, status, benchmark_key }.
//   onLink          — (sessionId | null) => void.
//   busy            — bool. Disables the control while the write is in flight.
//   error           — string | null. Rendered inline; keeps the select open.
//
// Presentational: no hooks beyond its own open/closed state, no data access.
// The parent owns the mutation, so a failure comes back as `error` text rather
// than being swallowed here — a 23505 means another session already claims this
// benchmark, and the reader has to be told that.
export default function BenchmarkLinkControl({
  benchmarkKey,
  benchmarkName,
  linkedSessionId = null,
  sessions = [],
  onLink,
  busy = false,
  error = null,
}) {
  const [open, setOpen] = useState(false);
  // An error keeps the select on screen, so the retry is one click away rather
  // than behind a re-expand.
  const expanded = open || Boolean(error);
  const linked = linkedSessionId != null;

  // The server orders sessions.date as TEXT, so the payload is not
  // chronological. Sort here rather than trust it; the resolver no longer sorts
  // at all. Ties on date break on the higher id — the later row of that day.
  const candidates = sessions
    .filter((s) => s && COMPLETED_STATUSES.includes(s.status))
    .slice()
    .sort((a, b) => {
      const ai = toISODate(a.date);
      const bi = toISODate(b.date);
      if (ai !== bi) return ai < bi ? 1 : -1;
      return b.id - a.id;
    });

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        aria-expanded={expanded}
        aria-label={`Link a session to ${benchmarkName}`}
        style={{
          border: 'none',
          background: 'none',
          padding: 0,
          cursor: busy ? 'default' : 'pointer',
          fontFamily: 'inherit',
          fontSize: 9,
          letterSpacing: 1,
          fontWeight: 700,
          marginLeft: 6,
          color: linked ? THEME.green : THEME.textFaint,
        }}
      >
        {linked ? 'LINKED ✓' : 'LINK'}
      </button>
      {expanded && (
        <select
          aria-label={`Session for ${benchmarkName}`}
          value={linked ? String(linkedSessionId) : ''}
          disabled={busy}
          onChange={(ev) => onLink(Number(ev.target.value) || null)}
          style={{
            display: 'block',
            background: THEME.field,
            border: `1px solid ${THEME.border}`,
            color: THEME.text,
            borderRadius: 4,
            fontSize: 10,
            padding: '4px 6px',
            fontFamily: 'inherit',
            marginTop: 4,
          }}
        >
          <option value="">— not done —</option>
          {candidates.map((s) => {
            // A row already claimed by ANOTHER benchmark stays visible but
            // unselectable, so the state is legible instead of the session
            // simply vanishing. The partial unique index is the half that holds.
            const otherKey =
              s.benchmark_key && s.benchmark_key !== benchmarkKey
                ? s.benchmark_key
                : null;
            return (
              <option
                key={s.id}
                value={String(s.id)}
                disabled={Boolean(otherKey)}
              >
                {`${s.date} — ${s.label}${otherKey ? ` (linked: ${otherKey})` : ''}`}
              </option>
            );
          })}
        </select>
      )}
      {error && (
        <div style={{ fontSize: 9, color: THEME.red, marginTop: 3 }}>
          {error}
        </div>
      )}
    </>
  );
}
