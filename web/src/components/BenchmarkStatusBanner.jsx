import { EVENT_LADDER } from '../constants/schedule.js';
import { THEME } from '../constants/theme.js';
import { useBenchmarkSessions } from '../hooks/useBenchmarkSessions.js';
import { deriveBenchmarkStatuses } from '../utils/benchmarkStatus.js';

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function shortDate(date) {
  return `${date.getDate()} ${MONTH_LABELS[date.getMonth()]}`;
}

function containerStyle(compact) {
  return {
    background: THEME.surfaceAlt,
    border: `1px solid ${THEME.divider}`,
    borderRadius: 6,
    padding: compact ? '8px 10px' : '12px 14px',
    marginTop: 14,
  };
}

function Heading() {
  return (
    <div
      style={{
        fontSize: 9,
        letterSpacing: 2,
        color: THEME.gold,
        marginBottom: 8,
      }}
    >
      BENCHMARKS
    </div>
  );
}

// Two signal states only: OVERDUE and UPCOMING. There is deliberately no
// affirmative "all clear" state — with nothing to say the component renders
// null, so an in-flight or failed session query cannot flash a false "done".
// The one non-signal state, BENCHMARK STATUS UNAVAILABLE, is a negative
// statement about the DATA and asserts nothing about the benchmarks.
export default function BenchmarkStatusBanner({
  entries = EVENT_LADDER,
  today,
  compact = false,
}) {
  const { data, isLoading, isError } = useBenchmarkSessions();

  // Evaluated before derivation, so exactly one code path reaches the
  // unavailable state and it can never co-render with a signal row. React
  // Query v5 sets isError only when the query holds no successful data, so a
  // background refetch failure cannot blank an already-correct banner.
  if (isError) {
    return (
      <div style={containerStyle(compact)}>
        {!compact && <Heading />}
        <div style={{ fontSize: 9, letterSpacing: 2, color: THEME.muted }}>
          BENCHMARK STATUS UNAVAILABLE
        </div>
      </div>
    );
  }

  const rows = deriveBenchmarkStatuses(entries, data ?? [], {
    today,
    sessionsReady: !isLoading && !isError,
  });
  const visible = rows.filter(
    (r) => r.status === 'overdue' || r.status === 'upcoming'
  );

  if (visible.length === 0) return null;

  return (
    <div style={containerStyle(compact)}>
      {!compact && <Heading />}
      {visible.map((r, i) => {
        const overdue = r.status === 'overdue';
        const accent = overdue ? THEME.orange : THEME.gold;
        return (
          <div key={r.entry.name}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 8,
                background: overdue ? `${THEME.orange}18` : `${THEME.gold}14`,
                border: overdue
                  ? `1px solid ${THEME.orange}55`
                  : `1px solid ${THEME.gold}44`,
                borderRadius: 4,
                padding: '6px 8px',
              }}
            >
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: 1,
                  color: accent,
                }}
              >
                {overdue ? '⚠ OVERDUE' : `● DUE IN ${r.daysUntil}d`}
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: accent }}>
                {r.entry.name}
              </span>
              <span style={{ fontSize: 10, color: THEME.text }}>
                {r.entry.date}
              </span>
              <span style={{ fontSize: 9, color: THEME.textSubtle }}>
                {overdue
                  ? `was due ${shortDate(r.window.overdueAfter)} · ${r.daysOverdue}d ago`
                  : `window opens ${shortDate(r.window.start)}`}
              </span>
            </div>
            {i < visible.length - 1 && (
              <div
                style={{
                  borderBottom: `1px solid ${THEME.divider}`,
                  margin: '6px 0',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
