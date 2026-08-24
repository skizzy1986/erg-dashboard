import LogSessionForm from '../components/LogSessionForm.jsx';
import LogEntry from '../components/LogEntry.jsx';
import { SRPE_GUIDE } from '../constants/trainingConfig.js';
import { THEME } from '../constants/theme.js';

// ── LOG VIEW (session log form + sRPE reference + logged history) ──
export default function LogView({ logDisplaySessions, isWide, onSaved }) {
  return (
    <>
      <div
        style={{
          background: THEME.raised,
          border: `1px solid ${THEME.border}`,
          borderLeft: `3px solid ${THEME.caution}`,
          borderRadius: 6,
          padding: '11px 14px',
          marginBottom: 14,
          fontSize: 11,
          color: THEME.textSubtle,
          lineHeight: 1.6,
        }}
      >
        <span style={{ color: THEME.caution, fontWeight: 700 }}>
          SESSION LOG:{' '}
        </span>
        Share Concept2 links or Fitbod screenshots to add sessions. sRPE
        captured every session.
      </div>

      {/* Interactive log form — writes to the database */}
      <LogSessionForm onSaved={onSaved} />

      {/* sRPE scale reference */}
      <div
        style={{
          background: THEME.raised,
          border: `1px solid ${THEME.border}`,
          borderLeft: `3px solid ${THEME.warning}`,
          borderRadius: 6,
          padding: '12px 14px',
          marginBottom: 14,
        }}
      >
        <div
          style={{
            fontSize: 9,
            letterSpacing: 2,
            color: THEME.warning,
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
                  color: THEME.text,
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
            color: THEME.muted,
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
        {logDisplaySessions.map((entry, i) => (
          <LogEntry key={`${entry.date}-${entry.label}-${i}`} entry={entry} />
        ))}
      </div>
    </>
  );
}
