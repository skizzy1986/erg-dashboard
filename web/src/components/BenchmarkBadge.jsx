// Presentational only — props in, no hooks, no data access.
const COLOURS = { overdue: '#ff2d55', upcoming: '#ffd700' };

export default function BenchmarkBadge({
  status,
  fuzzy = false,
  daysOverdue = null,
  daysUntilStart = null,
}) {
  const colour = COLOURS[status];
  if (!colour) return null;

  const parts = [];
  if (status === 'overdue') {
    parts.push('OVERDUE');
    if (typeof daysOverdue === 'number' && daysOverdue > 0) {
      parts.push(`${daysOverdue}d`);
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
        border: `1px solid ${colour}40`,
        color: colour,
        background: `${colour}15`,
        whiteSpace: 'nowrap',
        marginLeft: 6,
        display: 'inline-block',
      }}
    >
      {parts.join(' · ')}
    </span>
  );
}
