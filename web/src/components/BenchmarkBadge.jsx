import { toLogDate } from '../utils/dateFormat.js';
import { THEME } from '../constants/theme.js';
import { alpha } from '../utils/themeCss.js';

// Presentational only — props in, no hooks, no data access.
const COLOURS = {
  overdue: THEME.critical,
  upcoming: THEME.caution,
  scheduled: THEME.accentAlt,
};

export default function BenchmarkBadge({
  status,
  fuzzy = false,
  daysOverdue = null,
  daysUntilStart = null,
  rescheduledTo = null,
}) {
  const colour = COLOURS[status];
  if (!colour) return null;

  const parts = [];
  if (status === 'overdue') {
    parts.push('OVERDUE');
    if (typeof daysOverdue === 'number' && daysOverdue > 0) {
      parts.push(`${daysOverdue}d`);
    }
  } else if (status === 'scheduled') {
    // Explicitly branched, never folded into the trailing else: a scheduled
    // benchmark falling through to the upcoming branch would read 'DUE'.
    parts.push('↻ RESCHEDULED');
    if (rescheduledTo) parts.push(toLogDate(rescheduledTo));
    if (typeof daysOverdue === 'number' && daysOverdue > 0) {
      parts.push(`${daysOverdue}d OVERDUE`);
    }
  } else {
    parts.push('DUE');
    if (typeof daysUntilStart === 'number') {
      parts.push(daysUntilStart > 0 ? `${daysUntilStart}d` : 'NOW');
    }
    if (fuzzy) parts.push('exact date TBD');
  }

  return (
    <span
      style={{
        fontSize: 8,
        letterSpacing: 1,
        fontWeight: 700,
        padding: '1px 5px',
        borderRadius: 3,
        border: `1px solid ${alpha(colour, '40')}`,
        color: colour,
        background: alpha(colour, '15'),
        whiteSpace: 'nowrap',
        marginLeft: 6,
        display: 'inline-block',
      }}
    >
      {parts.join(' · ')}
    </span>
  );
}
