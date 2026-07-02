import LogEntry from '../components/LogEntry.jsx';

// ── PLAN VIEW (today + future prescriptions from status='planned') ──
export default function PlanView({ plannedSessions, loggedKeys, isWide }) {
  // session dates are "M/D/YY" → Date for sorting/today-filtering
  const parsePlanDate = (k) => {
    const [m, d, y] = (k || '').split('/').map(Number);
    return new Date(2000 + (y || 0), (m || 1) - 1, d || 1);
  };
  const now = new Date();
  const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const items = plannedSessions
    .map((e) => ({
      e,
      dt: parsePlanDate(e.date),
      done: loggedKeys.has(`${e.date}|${e.type}`),
    }))
    .filter((x) => x.dt >= today0)
    .sort((a, b) => a.dt - b.dt);
  return (
    <>
      <div
        style={{
          background: '#2a2a48',
          border: '1px solid #4a4a68',
          borderLeft: '3px dashed #00d4ff',
          borderRadius: 6,
          padding: '11px 14px',
          marginBottom: 14,
          fontSize: 11,
          color: '#aaaacc',
          lineHeight: 1.6,
        }}
      >
        <span style={{ color: '#00d4ff', fontWeight: 700 }}>THE PLAN. </span>
        Upcoming prescriptions from Coach (today forward). A dashed border marks
        a planned session; tap any card for the targets. Cards mark ✓ done once
        you log the matching session.
      </div>
      {items.length === 0 ? (
        <div
          style={{
            background: '#2a2a48',
            border: '1px solid #4a4a68',
            borderRadius: 6,
            padding: '18px 16px',
            fontSize: 11,
            color: '#7e7e9a',
            textAlign: 'center',
          }}
        >
          No upcoming planned sessions.
        </div>
      ) : (
        <div
          style={{
            display: isWide ? 'grid' : 'flex',
            gridTemplateColumns: isWide ? '1fr 1fr' : undefined,
            flexDirection: 'column',
            gap: 6,
            alignItems: isWide ? 'start' : undefined,
          }}
        >
          {items.map(({ e, done }, i) => (
            <LogEntry
              key={`plan-${e.date}-${e.label}-${i}`}
              entry={e}
              done={done}
            />
          ))}
        </div>
      )}
    </>
  );
}
