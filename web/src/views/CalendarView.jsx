import WorkoutItem from '../components/WorkoutItem.jsx';
import {
  getRosterMode,
  resolveDay,
  dayStatus,
  daySessions,
  logEntriesForDate,
} from '../utils/schedule.js';
import { MICROCYCLE, PHASE_CONTEXT } from '../constants/schedule.js';
import { THEME } from '../constants/theme.js';

// ── CALENDAR VIEW ──
export default function CalendarView({
  loggedSessions,
  cancelledSessions = [],
  isWide,
}) {
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
    // Same status-blind date matcher the completed count runs through, fed the
    // pre-filtered cancelled list — so the two counts cannot drift apart on the
    // unpadded M/D/YY key, and schedule.js never learns about status.
    const cancelledCount = logEntriesForDate(d, cancelledSessions).length;
    days.push({
      date: d,
      dow,
      sess,
      isToday: i === 0,
      isPast: i < 0,
      mode,
      isOverride: !!(sess && sess.override),
      status,
      cancelledCount,
    });
  }
  const todayMode = firstMode;
  const todayCycle = MICROCYCLE[todayMode] || MICROCYCLE.home;
  return (
    <>
      <div
        style={{
          background: THEME.raised,
          border: `1px solid ${THEME.border}`,
          borderLeft: `3px solid ${THEME.accent}`,
          borderRadius: 6,
          padding: '11px 14px',
          marginBottom: 14,
          fontSize: 11,
          color: THEME.textSubtle,
          lineHeight: 1.6,
        }}
      >
        <span style={{ color: THEME.accent, fontWeight: 700 }}>
          YOUR WEEKS ·{' '}
        </span>
        {todayCycle.label.split('—')[0].trim()} · {PHASE_CONTEXT.phaseLabel}.{' '}
        <span style={{ color: THEME.positive }}>✓ done</span> ·{' '}
        <span style={{ color: THEME.accent }}>● today</span> · upcoming.
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
              ? THEME.positive
              : st === 'today'
                ? THEME.accent
                : st === 'missed'
                  ? THEME.muted
                  : THEME.textFaint;
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
                  st === 'missed'
                    ? d.cancelledCount > 0
                      ? 0.75
                      : 0.5
                    : st === 'done' && d.isPast
                      ? 0.85
                      : 1,
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
                {d.cancelledCount > 0 && (
                  <span
                    style={{
                      fontSize: 7,
                      color: THEME.textSubtle,
                      letterSpacing: 2,
                      fontWeight: 700,
                    }}
                  >
                    ⊘ {d.cancelledCount} CANCELLED
                  </span>
                )}
                {d.isOverride && (
                  <span
                    style={{
                      fontSize: 7,
                      color: THEME.warning,
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
    </>
  );
}
