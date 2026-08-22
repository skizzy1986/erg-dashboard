import { useState } from 'react';
import { C, ICON } from '../constants/ui.js';
import { THEME } from '../constants/theme.js';

export default function LogEntry({ entry, done = false }) {
  const [open, setOpen] = useState(false);
  const color = C[entry.type] || THEME.grey;
  const isErg = !!entry._isErg;
  const planned = entry.status === 'planned';
  const cancelled = entry.status === 'cancelled';
  // Flat erg metrics replaced the removed `splits` field. Planned erg rows
  // carry null metrics — we show the prescription (label + coach_note) instead.
  const hasErgMetrics =
    entry.distance_m != null || entry.avg_watts != null || entry.avg_hr != null;
  const fmtDist = (m) =>
    m == null
      ? '—'
      : m >= 1000
        ? `${(m / 1000).toFixed(m % 1000 === 0 ? 0 : 1)}km`
        : `${m}m`;
  return (
    <div
      style={{
        borderTop: `1px solid ${open ? color + '50' : THEME.border}`,
        borderRight: `1px solid ${open ? color + '50' : THEME.border}`,
        borderBottom: `1px solid ${open ? color + '50' : THEME.border}`,
        borderLeft: cancelled
          ? `3px dotted ${THEME.muted}`
          : `3px ${planned ? 'dashed' : 'solid'} ${color}`,
        borderRadius: 6,
        overflow: 'hidden',
        background: open ? `${color}10` : THEME.raised,
        opacity: done || cancelled ? 0.5 : 1,
      }}
    >
      <div
        onClick={() => setOpen(!open)}
        style={{
          padding: '13px 14px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 11,
            minWidth: 0,
            flex: 1,
          }}
        >
          <div style={{ fontSize: 15, flexShrink: 0 }}>
            {ICON[entry.type] || '•'}
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: THEME.white,
                lineHeight: 1.3,
                textDecoration: cancelled ? 'line-through' : undefined,
              }}
            >
              {entry.label}
              {done && (
                <span
                  style={{
                    marginLeft: 8,
                    fontSize: 8,
                    letterSpacing: 1.5,
                    fontWeight: 700,
                    color: THEME.green,
                    border: `1px solid ${THEME.green}66`,
                    borderRadius: 3,
                    padding: '1px 5px',
                    verticalAlign: 'middle',
                  }}
                >
                  ✓ DONE
                </span>
              )}
              {planned && !done && (
                <span
                  style={{
                    marginLeft: 8,
                    fontSize: 8,
                    letterSpacing: 1.5,
                    fontWeight: 700,
                    color,
                    border: `1px solid ${color}66`,
                    borderRadius: 3,
                    padding: '1px 5px',
                    verticalAlign: 'middle',
                  }}
                >
                  PLANNED
                </span>
              )}
              {cancelled && !done && (
                <span
                  style={{
                    marginLeft: 8,
                    fontSize: 8,
                    letterSpacing: 1.5,
                    fontWeight: 700,
                    color: THEME.muted,
                    border: `1px solid ${THEME.muted}66`,
                    borderRadius: 3,
                    padding: '1px 5px',
                    verticalAlign: 'middle',
                  }}
                >
                  CANCELLED
                </span>
              )}
            </div>
            <div style={{ fontSize: 11, color: THEME.muted }}>
              {entry.date}
              {entry.duration ? ` · ${entry.duration}` : ''}
              {entry.srpe != null && (
                <span style={{ color: THEME.gold }}> · sRPE {entry.srpe}</span>
              )}
            </div>
          </div>
        </div>
        {isErg && hasErgMetrics && (
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            {entry.avg_watts != null && (
              <div style={{ fontSize: 12, fontWeight: 700, color }}>
                {entry.avg_watts}W
              </div>
            )}
            <div style={{ fontSize: 10, color: THEME.muted }}>
              {fmtDist(entry.distance_m)}
              {entry.avg_hr != null ? ` · ${entry.avg_hr}bpm` : ''}
            </div>
          </div>
        )}
        {!isErg && entry.prs > 0 && (
          <div
            style={{
              background: `${color}20`,
              border: `1px solid ${color}40`,
              borderRadius: 4,
              padding: '3px 7px',
              flexShrink: 0,
              fontSize: 10,
              color,
              fontWeight: 700,
              letterSpacing: 1,
              whiteSpace: 'nowrap',
            }}
          >
            🏆 {entry.prs}
          </div>
        )}
      </div>
      {open && (
        <div style={{ padding: '0 16px 14px' }}>
          {isErg ? (
            hasErgMetrics ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4,1fr)',
                  gap: 6,
                  marginBottom: entry.coachNote ? 10 : 0,
                }}
              >
                {[
                  ['DURATION', entry.duration || '—'],
                  ['DISTANCE', fmtDist(entry.distance_m)],
                  [
                    'AVG WATTS',
                    entry.avg_watts != null ? `${entry.avg_watts}W` : '—',
                  ],
                  ['AVG HR', entry.avg_hr != null ? `${entry.avg_hr}` : '—'],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    style={{
                      background: THEME.bg,
                      borderRadius: 4,
                      padding: '7px 8px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 8,
                        color: THEME.muted,
                        letterSpacing: 2,
                        marginBottom: 2,
                      }}
                    >
                      {k}
                    </div>
                    <div style={{ fontSize: 11, color, fontWeight: 600 }}>
                      {v}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  fontSize: 10,
                  color: THEME.muted,
                  fontStyle: 'italic',
                  marginBottom: entry.coachNote ? 8 : 0,
                }}
              >
                {planned
                  ? 'Prescription — targets below.'
                  : cancelled
                    ? 'Cancelled — this session was not completed.'
                    : 'No metrics logged for this session.'}
              </div>
            )
          ) : entry.exercises ? (
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 11,
                tableLayout: 'fixed',
              }}
            >
              <thead>
                <tr style={{ borderBottom: `1px solid ${THEME.border}` }}>
                  {[
                    ['Exercise', '42%'],
                    ['Top Wt', '19%'],
                    ['Vol', '20%'],
                    ['1RM', '19%'],
                  ].map(([h, w]) => (
                    <td
                      key={h}
                      style={{
                        padding: '5px 4px',
                        color: THEME.muted,
                        fontSize: 9,
                        letterSpacing: 0.5,
                        width: w,
                      }}
                    >
                      {h}
                    </td>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entry.exercises.map((ex, i) => (
                  <tr
                    key={i}
                    style={{ borderBottom: `1px solid ${THEME.surfaceAlt}` }}
                  >
                    <td
                      style={{
                        padding: '6px 4px',
                        color: ex.pr ? THEME.gold : THEME.textSubtle,
                        wordBreak: 'break-word',
                        lineHeight: 1.3,
                      }}
                    >
                      {ex.pr && '🏆 '}
                      {ex.name}
                    </td>
                    <td
                      style={{
                        padding: '6px 4px',
                        color: THEME.text,
                        fontWeight: ex.pr ? 700 : 400,
                        wordBreak: 'break-word',
                      }}
                    >
                      {ex.weight}
                    </td>
                    <td
                      style={{
                        padding: '6px 4px',
                        color: THEME.textSubtle,
                        wordBreak: 'break-word',
                      }}
                    >
                      {ex.volume}
                    </td>
                    <td
                      style={{
                        padding: '6px 4px',
                        color: THEME.textSubtle,
                        wordBreak: 'break-word',
                      }}
                    >
                      {ex.e1rm}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div
              style={{
                fontSize: 10,
                color: THEME.muted,
                fontStyle: 'italic',
                marginBottom: entry.coachNote ? 8 : 0,
              }}
            >
              {planned
                ? 'Prescription — targets below.'
                : entry.duration
                  ? `Session · ${entry.duration}`
                  : 'Session logged.'}
            </div>
          )}
          {entry.coachNote && (
            <div
              style={{
                marginTop: 10,
                background: THEME.bg,
                borderRadius: 4,
                padding: '10px 12px',
                fontSize: 11,
                color: '#ffaa44',
                lineHeight: 1.7,
              }}
            >
              {entry.coachNote}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
