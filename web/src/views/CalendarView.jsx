import WorkoutItem from '../components/WorkoutItem.jsx';
import { logEntriesForDate } from '../utils/dateFormat.js';
import { THEME } from '../constants/theme.js';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
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
const BACK = 3;
const FWD = 14;

const statusLine = (text) => (
  <div style={{ fontSize: 11, color: THEME.textSubtle, padding: '4px 0' }}>
    {text}
  </div>
);

// ── CALENDAR VIEW ──
// Reads sessions rows only. Each day shows what the DB holds for it — completed,
// planned, cancelled — and infers nothing: a past planned row reads PLANNED.
export default function CalendarView({
  loggedSessions = [],
  plannedSessions = [],
  cancelledSessions = [],
  dbStatus = 'ok',
  isWide,
}) {
  const banner = (
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
        LAST 3 DAYS · NEXT 14 ·{' '}
      </span>
      <span style={{ color: THEME.positive }}>✓ done</span> · planned · ⊘
      cancelled
    </div>
  );

  if (dbStatus === 'loading') {
    return (
      <>
        {banner}
        {statusLine('Loading sessions…')}
      </>
    );
  }
  if (dbStatus === 'error') {
    return (
      <>
        {banner}
        {statusLine('Sessions could not be loaded.')}
      </>
    );
  }

  const now = new Date();
  const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = [];
  for (let i = -BACK; i < FWD; i++) {
    const d = new Date(today0);
    d.setDate(today0.getDate() + i);
    days.push({
      date: d,
      isToday: i === 0,
      isPast: i < 0,
      done: logEntriesForDate(d, loggedSessions),
      planned: logEntriesForDate(d, plannedSessions),
      cancelled: logEntriesForDate(d, cancelledSessions),
    });
  }
  const empty = days.every(
    (d) => !d.done.length && !d.planned.length && !d.cancelled.length
  );

  return (
    <>
      {banner}
      <div
        style={{
          display: isWide ? 'grid' : 'flex',
          gridTemplateColumns: isWide ? '1fr 1fr' : undefined,
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {days.map((d, i) => {
          const railObj = {
            top: DAY_NAMES[d.date.getDay()].toUpperCase(),
            big: d.date.getDate(),
            bottom: MONTH_NAMES[d.date.getMonth()],
          };
          const rows = [
            ...d.done.map((s) => ({
              label: s.label,
              note: s.coachNote,
              done: true,
            })),
            ...d.planned.map((s) => ({
              label: s.label,
              note: s.coachNote,
              done: false,
            })),
            ...d.cancelled.map((s) => ({
              label: '⊘ ' + s.label,
              note: s.coachNote,
              done: false,
            })),
          ];
          const statusLabel = d.done.length
            ? `✓ DONE${d.done.length > 1 ? ' ×' + d.done.length : ''}`
            : d.planned.length
              ? 'PLANNED'
              : '';
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 3,
                opacity: d.done.length && d.isPast ? 0.85 : 1,
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
                    color: d.done.length ? THEME.positive : THEME.textFaint,
                    letterSpacing: 2,
                    fontWeight: 700,
                  }}
                >
                  {statusLabel}
                </span>
                {d.cancelled.length > 0 && (
                  <span
                    style={{
                      fontSize: 7,
                      color: THEME.textSubtle,
                      letterSpacing: 2,
                      fontWeight: 700,
                    }}
                  >
                    ⊘ {d.cancelled.length} CANCELLED
                  </span>
                )}
              </div>
              {rows.length === 0 ? (
                <WorkoutItem
                  session={null}
                  rail={railObj}
                  highlight={d.isToday}
                  showRail={true}
                />
              ) : (
                rows.map((s, j) => (
                  <WorkoutItem
                    key={j}
                    session={s}
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
      {empty && statusLine('No sessions in this window.')}
    </>
  );
}
