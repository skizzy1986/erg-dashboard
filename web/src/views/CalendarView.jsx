import { useState } from 'react';
import WorkoutItem from '../components/WorkoutItem.jsx';
import BenchmarkBadge from '../components/BenchmarkBadge.jsx';
import BenchmarkLinkControl from '../components/BenchmarkLinkControl.jsx';
import {
  useBenchmarkStatuses,
  useBenchmarkDataUnavailable,
} from '../hooks/useBenchmarkStatuses.js';
import { useBenchmarkSessions } from '../hooks/useBenchmarkSessions.js';
import { useLinkBenchmarkSession } from '../hooks/useLinkBenchmarkSession.js';
import {
  getRosterMode,
  resolveDay,
  dayStatus,
  daySessions,
} from '../utils/schedule.js';
import { compareBenchmarkSeverity } from '../utils/benchmarkStatus.js';
import { MICROCYCLE, PHASE_CONTEXT } from '../constants/schedule.js';

// ── CALENDAR VIEW ──
export default function CalendarView({ loggedSessions, isWide }) {
  // Resolved once for the FULL ladder. Each state carries its own entry, so the
  // panel below renders from the states themselves — a badge cannot drift onto
  // the wrong row once the rows are re-ordered by severity.
  const benchmarkStatuses = useBenchmarkStatuses();
  const benchmarksUnavailable = useBenchmarkDataUnavailable();
  // Same query key useBenchmarkStatuses already reads, so react-query serves it
  // from cache — this is not a second request.
  const { data: benchmarkSessions } = useBenchmarkSessions();
  const link = useLinkBenchmarkSession();
  // One mutation serves every row, so remember which benchmark issued the write
  // and show its busy/error state against that row only.
  const [linkingKey, setLinkingKey] = useState(null);
  const linkError = link.isError
    ? link.error?.code === '23505'
      ? 'Another session already claims this benchmark'
      : link.error?.message || 'Could not save the link'
    : null;
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = [
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
  const now = new Date();
  const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // Window: 3 days back (to show recent completed work) → 14 forward.
  // Each day carries its own roster mode + completion status.
  const BACK = 3,
    FWD = 14;
  const days = [];
  let sawSwitch = false,
    firstMode = getRosterMode(today0);
  for (let i = -BACK; i < FWD; i++) {
    const d = new Date(today0);
    d.setDate(today0.getDate() + i);
    const dow = dayNames[d.getDay()];
    const mode = getRosterMode(d);
    if (i >= 0 && mode !== firstMode) sawSwitch = true;
    const sess = resolveDay(d); // override-aware
    const status = dayStatus(d, today0, loggedSessions); // done / today / upcoming / missed
    days.push({
      date: d,
      dow,
      sess,
      isToday: i === 0,
      isPast: i < 0,
      mode,
      isOverride: !!(sess && sess.override),
      status,
    });
  }
  const todayMode = firstMode;
  const todayCycle = MICROCYCLE[todayMode] || MICROCYCLE.home;
  // The whole ladder renders, ordered by severity (#228). It used to be capped
  // at the first five by position, which hid the 2k Test, the 1000m tune-ups
  // and the TARGET champs entirely — and meant a benchmark going overdue deep
  // in the ladder could never surface, however loud (#215). Severity order is
  // what keeps nine rows from being wallpaper: anything actionable floats.
  // .slice() still copies, so .sort() never mutates the memoized hook result.
  const visibleEvents = benchmarkStatuses
    .slice()
    .sort(compareBenchmarkSeverity);
  return (
    <>
      <div
        style={{
          background: '#2a2a48',
          border: '1px solid #4a4a68',
          borderLeft: '3px solid #00d4ff',
          borderRadius: 6,
          padding: '11px 14px',
          marginBottom: 14,
          fontSize: 11,
          color: '#aaaacc',
          lineHeight: 1.6,
        }}
      >
        <span style={{ color: '#00d4ff', fontWeight: 700 }}>YOUR WEEKS · </span>
        {todayCycle.label.split('—')[0].trim()} · {PHASE_CONTEXT.phaseLabel}.{' '}
        <span style={{ color: '#34d399' }}>✓ done</span> ·{' '}
        <span style={{ color: '#00d4ff' }}>● today</span> · upcoming.
        {sawSwitch ? ' Roster switches mid-view (home↔FIFO).' : ''}
      </div>
      <div
        style={{
          display: isWide ? 'grid' : 'flex',
          gridTemplateColumns: isWide ? '1fr 1fr' : undefined,
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {days.map((d, i) => {
          const sessions = daySessions(d.sess);
          const railObj = {
            top: d.dow.toUpperCase(),
            big: d.date.getDate(),
            bottom: monthNames[d.date.getMonth()],
          };
          const st = d.status.state;
          const statusColor =
            st === 'done'
              ? '#34d399'
              : st === 'today'
                ? '#00d4ff'
                : st === 'missed'
                  ? '#7e7e9a'
                  : '#6c6c88';
          const statusLabel =
            st === 'done'
              ? `✓ DONE${d.status.logged.length > 1 ? ' ×' + d.status.logged.length : ''}`
              : st === 'today'
                ? '● TODAY'
                : st === 'missed'
                  ? '— not logged'
                  : 'UPCOMING';
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 3,
                opacity:
                  st === 'missed' ? 0.5 : st === 'done' && d.isPast ? 0.85 : 1,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  paddingLeft: 54,
                  marginBottom: 1,
                }}
              >
                <span
                  style={{
                    fontSize: 7,
                    color: statusColor,
                    letterSpacing: 2,
                    fontWeight: 700,
                  }}
                >
                  {statusLabel}
                </span>
                {d.isOverride && (
                  <span
                    style={{
                      fontSize: 7,
                      color: '#ff6b35',
                      letterSpacing: 2,
                    }}
                  >
                    ⇄ SWAPPED
                  </span>
                )}
              </div>
              {sessions.length === 0 ? (
                <WorkoutItem
                  session={null}
                  rail={railObj}
                  highlight={d.isToday}
                  showRail={true}
                />
              ) : (
                sessions.map((s, j) => (
                  <WorkoutItem
                    key={j}
                    session={{ ...s, done: st === 'done' }}
                    rail={railObj}
                    highlight={d.isToday && j === 0}
                    showRail={j === 0}
                  />
                ))
              )}
            </div>
          );
        })}
      </div>

      {/* Upcoming events from the ladder */}
      <div
        style={{
          background: 'linear-gradient(135deg,#ffd70010,#1e1e30)',
          border: '1px solid #ffd70030',
          borderLeft: '3px solid #ffd700',
          borderRadius: 6,
          padding: '12px 14px',
          marginTop: 14,
        }}
      >
        <div
          style={{
            fontSize: 9,
            letterSpacing: 2,
            color: '#ffd700',
            marginBottom: 8,
          }}
        >
          UPCOMING EVENTS · SEASON 1 LADDER
        </div>
        {benchmarksUnavailable && (
          <div
            style={{
              fontSize: 9,
              letterSpacing: 2,
              color: '#7e7e9a',
              marginBottom: 8,
            }}
          >
            BENCHMARK STATUS UNAVAILABLE
          </div>
        )}
        {visibleEvents.map((bench, i) => {
          const e = bench.entry;
          const col =
            e.kind === 'TARGET'
              ? '#ff2d55'
              : e.kind === 'competition'
                ? '#ff6b35'
                : e.kind === 'optional'
                  ? '#a78bfa'
                  : '#00d4ff';
          return (
            <div
              key={bench.index}
              style={{
                display: 'flex',
                gap: 10,
                marginBottom: 6,
                paddingBottom: 6,
                borderBottom:
                  i < visibleEvents.length - 1 ? '1px solid #3e3e5a' : 'none',
              }}
            >
              <div
                style={{
                  width: 78,
                  flexShrink: 0,
                  fontSize: 9,
                  fontWeight: 700,
                  color: col,
                }}
              >
                {e.date}
              </div>
              <div
                style={{
                  flex: 1,
                  fontSize: 10,
                  color: '#aaaacc',
                  lineHeight: 1.4,
                }}
              >
                {e.name}
                <BenchmarkBadge
                  status={bench.status}
                  fuzzy={bench.fuzzy}
                  daysOverdue={bench.daysOverdue}
                  daysUntilStart={bench.daysUntilStart}
                  rescheduledTo={bench.rescheduledTo}
                />
                {/* status 'unknown' means the sessions read is pending or failed
                    (#188). Rendering then would flash LINK before flipping to
                    LINKED, and offer a picker over an empty candidate list. */}
                {e.kind === 'benchmark' && bench.status !== 'unknown' && (
                  <BenchmarkLinkControl
                    benchmarkKey={e.key}
                    benchmarkName={e.name}
                    linkedSessionId={bench.matchedSessionId}
                    sessions={benchmarkSessions ?? []}
                    onLink={(sessionId) => {
                      setLinkingKey(e.key);
                      link.mutate({ benchmarkKey: e.key, sessionId });
                    }}
                    busy={link.isPending && linkingKey === e.key}
                    error={linkingKey === e.key ? linkError : null}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
