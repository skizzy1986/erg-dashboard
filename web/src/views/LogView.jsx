import LogSessionForm from '../components/LogSessionForm.jsx';
import LogEntry from '../components/LogEntry.jsx';
import { SRPE_GUIDE } from '../constants/trainingConfig.js';

// ── LOG VIEW ──────────────────────────────────────────────────
export default function LogView({ loggedSessions, fetchSessions, isWide }) {
  return (
    <>
      <div
        style={{
          background: '#2a2a48',
          border: '1px solid #4a4a68',
          borderLeft: '3px solid #ffd700',
          borderRadius: 6,
          padding: '11px 14px',
          marginBottom: 14,
          fontSize: 11,
          color: '#aaaacc',
          lineHeight: 1.6,
        }}
      >
        <span style={{ color: '#ffd700', fontWeight: 700 }}>SESSION LOG: </span>
        Share Concept2 links or Fitbod screenshots to add sessions. sRPE
        captured every session.
      </div>

      {/* Interactive log form — writes to the database */}
      <LogSessionForm onSaved={fetchSessions} />

      {/* sRPE scale reference */}
      <div
        style={{
          background: '#2a2a48',
          border: '1px solid #4a4a68',
          borderLeft: '3px solid #ff6b35',
          borderRadius: 6,
          padding: '12px 14px',
          marginBottom: 14,
        }}
      >
        <div
          style={{
            fontSize: 9,
            letterSpacing: 2,
            color: '#ff6b35',
            marginBottom: 8,
          }}
        >
          sRPE SCALE · TALK-TEST ANCHORED (asked every session)
        </div>
        {SRPE_GUIDE.map((s, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              gap: 10,
              marginBottom: 6,
              alignItems: 'baseline',
            }}
          >
            <span
              style={{
                flexShrink: 0,
                width: 30,
                fontSize: 12,
                fontWeight: 700,
                color: s.color,
              }}
            >
              {s.range}
            </span>
            <div style={{ flex: 1 }}>
              <span
                style={{
                  fontSize: 11,
                  color: '#e8e8f0',
                  fontWeight: 600,
                }}
              >
                {s.label}
              </span>
              <span style={{ fontSize: 10, color: '#888', marginLeft: 6 }}>
                — {s.anchor}
              </span>
            </div>
          </div>
        ))}
        <div
          style={{
            fontSize: 8,
            color: '#7e7e9a',
            lineHeight: 1.5,
            marginTop: 6,
            fontStyle: 'italic',
          }}
        >
          Over-rating easy work is the common error — anchor to the talk test.
          TRIANGULATION: sRPE (felt) + Strava RE (HR-dist) + watts/HR (output)
          cross-checked every session. All agree = confidence; diverge = early
          fatigue/stress signal.
        </div>
      </div>
      <div
        style={{
          display: isWide ? 'grid' : 'flex',
          gridTemplateColumns: isWide ? '1fr 1fr' : undefined,
          flexDirection: 'column',
          gap: 6,
          alignItems: isWide ? 'start' : undefined,
        }}
      >
        {loggedSessions.map((entry, i) => (
          <LogEntry key={`${entry.date}-${entry.label}-${i}`} entry={entry} />
        ))}
      </div>
    </>
  );
}
