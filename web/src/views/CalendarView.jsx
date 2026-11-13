import { Plural, Trans, useLingui } from '@lingui/react/macro';
import { plural } from '@lingui/core/macro';
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
// es-CO's abbreviations, written down rather than asked of Intl: ICU data
// differs by browser and version ("sep." in one, "sept." in another), and the
// rail fits three letters without the trailing point. Fixed calendar words,
// not prose, so a plain table beside the English rather than catalog messages.
const RAIL_NAMES = {
  en: { days: DAY_NAMES, months: MONTH_NAMES },
  es: {
    days: ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'],
    months: [
      'ene',
      'feb',
      'mar',
      'abr',
      'may',
      'jun',
      'jul',
      'ago',
      'sep',
      'oct',
      'nov',
      'dic',
    ],
  },
};
function railNames(date, lang) {
  const names = RAIL_NAMES[lang] ?? RAIL_NAMES.en;
  return {
    top: names.days[date.getDay()].toUpperCase(),
    bottom: names.months[date.getMonth()],
  };
}

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
  const { t, i18n } = useLingui();
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
        <Trans comment="Calendar legend: the window shown, all capitals">
          LAST 3 DAYS · TODAY · NEXT 13 ·
        </Trans>{' '}
      </span>
      <span style={{ color: THEME.positive }}>
        <Trans comment="Calendar legend">✓ done</Trans>
      </span>{' '}
      <Trans comment="Calendar legend, after the done mark">
        · planned · ⊘ cancelled
      </Trans>
    </div>
  );

  if (dbStatus === 'loading') {
    return (
      <>
        {banner}
        {statusLine(t`Loading sessions…`)}
      </>
    );
  }
  // A refetch after a save can fail while App still holds the earlier rows;
  // keep showing them rather than blanking a calendar that already loaded.
  const hasRows =
    loggedSessions.length + plannedSessions.length + cancelledSessions.length >
    0;
  const staleError = dbStatus === 'error' && hasRows;
  if (dbStatus === 'error' && !hasRows) {
    return (
      <>
        {banner}
        {statusLine(t`Sessions could not be loaded.`)}
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
      {staleError &&
        statusLine(t`Couldn't refresh sessions — showing what loaded earlier.`)}
      <div
        style={{
          display: isWide ? 'grid' : 'flex',
          gridTemplateColumns: isWide ? '1fr 1fr' : undefined,
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {days.map((d, i) => {
          const names = railNames(d.date, i18n.locale);
          const railObj = {
            top: names.top,
            big: d.date.getDate(),
            bottom: names.bottom,
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
          const doneCount = d.done.length;
          const cancelledCount = d.cancelled.length;
          const statusLabel = doneCount
            ? t({
                comment: 'Day badge, all capitals: sessions done that day',
                message: plural(doneCount, {
                  one: '✓ DONE',
                  other: `✓ DONE ×${doneCount}`,
                }),
              })
            : d.planned.length
              ? t({ message: 'PLANNED', comment: 'Day badge, all capitals' })
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
                    <Plural
                      value={cancelledCount}
                      one={`⊘ ${cancelledCount} CANCELLED`}
                      other={`⊘ ${cancelledCount} CANCELLED`}
                    />
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
      {empty && statusLine(t`No sessions in this window.`)}
    </>
  );
}
