import { useState } from 'react';
import { mobilityLog } from '../constants/logs.js';
import {
  MOBILITY_ROUTINES,
  MOBILITY_STREAK_NOTE,
} from '../constants/mobility.js';

export default function MobilityView() {
  const [mobOpen, setMobOpen] = useState(null);

  return (
    <>
      <div
        style={{
          background: 'linear-gradient(135deg,#a78bfa15,#1e1e30)',
          border: '1px solid #a78bfa40',
          borderLeft: '3px solid #a78bfa',
          borderRadius: 6,
          padding: '13px 16px',
          marginBottom: 14,
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: '#a78bfa',
            marginBottom: 5,
          }}
        >
          🧘 MOBILITY — a training pillar
        </div>
        <div style={{ fontSize: 11, color: '#aaaacc', lineHeight: 1.6 }}>
          Not accessory work. With the left hamstring/glute rehab, mobility is
          load-bearing for staying healthy enough to train. The pre-session
          prime especially — it's rehab activation disguised as a warm-up.
        </div>
      </div>

      {/* Routines library */}
      <div
        style={{
          fontSize: 9,
          letterSpacing: 3,
          color: '#a78bfa',
          marginBottom: 8,
        }}
      >
        ROUTINES · ON HAND
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          marginBottom: 18,
        }}
      >
        {MOBILITY_ROUTINES.map((r) => {
          const isOpen = mobOpen === r.id;
          return (
            <div
              key={r.id}
              style={{
                background: isOpen ? `${r.color}10` : '#2a2a48',
                border: `1px solid ${isOpen ? r.color + '50' : '#4a4a68'}`,
                borderLeft: `3px solid ${r.color}`,
                borderRadius: 6,
                overflow: 'hidden',
              }}
            >
              <div
                onClick={() => setMobOpen(isOpen ? null : r.id)}
                style={{
                  padding: '12px 14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 11,
                  }}
                >
                  <span style={{ fontSize: 16 }}>{r.icon}</span>
                  <div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: '#fff',
                      }}
                    >
                      {r.name}
                    </div>
                    <div
                      style={{
                        fontSize: 9,
                        color: '#7e7e9a',
                        marginTop: 1,
                      }}
                    >
                      {r.when}
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: 10, color: '#7e7e9a' }}>
                  {isOpen ? '▲' : '▼'}
                </span>
              </div>
              {isOpen && (
                <div style={{ padding: '0 14px 14px' }}>
                  <div
                    style={{
                      fontSize: 10,
                      color: '#888',
                      lineHeight: 1.6,
                      marginBottom: 10,
                      fontStyle: 'italic',
                    }}
                  >
                    {r.why}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                      marginBottom: 10,
                    }}
                  >
                    {r.blocks.map((b, j) => (
                      <div
                        key={j}
                        style={{
                          background: '#08080d',
                          borderRadius: 5,
                          padding: '9px 11px',
                          borderLeft: b.rehab
                            ? '2px solid #34d399'
                            : '2px solid transparent',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            gap: 8,
                            alignItems: 'baseline',
                            marginBottom: 3,
                          }}
                        >
                          <span
                            style={{
                              color: r.color,
                              flexShrink: 0,
                              fontSize: 11,
                              fontWeight: 700,
                            }}
                          >
                            {j + 1}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              color: '#e8e8f0',
                              fontWeight: 600,
                            }}
                          >
                            {b.move}
                            {b.rehab && (
                              <span
                                style={{
                                  color: '#34d399',
                                  fontSize: 9,
                                  fontWeight: 700,
                                }}
                              >
                                {' '}
                                · REHAB
                              </span>
                            )}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: 10,
                            color: '#888',
                            lineHeight: 1.6,
                            paddingLeft: 19,
                          }}
                        >
                          {b.visual}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div
                    style={{
                      background: '#08080d',
                      borderLeft: `2px solid ${r.color}`,
                      borderRadius: 4,
                      padding: '9px 11px',
                      fontSize: 10,
                      color: '#aaaacc',
                      lineHeight: 1.6,
                    }}
                  >
                    📋 {r.note}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Tracking log */}
      <div
        style={{
          fontSize: 9,
          letterSpacing: 3,
          color: '#a78bfa',
          marginBottom: 8,
        }}
      >
        RECENT · TRACKED
      </div>
      <div
        style={{
          background: '#1e1e30',
          border: '1px solid #a78bfa30',
          borderLeft: '3px solid #a78bfa',
          borderRadius: 6,
          padding: '10px 13px',
          marginBottom: 10,
          fontSize: 10,
          color: '#888',
          lineHeight: 1.6,
        }}
      >
        {MOBILITY_STREAK_NOTE}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {mobilityLog.map((m, i) => {
          const r = MOBILITY_ROUTINES.find((x) => x.id === m.type);
          const col = r ? r.color : '#888';
          return (
            <div
              key={i}
              style={{
                background: '#2a2a48',
                border: '1px solid #4a4a68',
                borderLeft: `3px solid ${col}`,
                borderRadius: 6,
                padding: '11px 14px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 4,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 9,
                  }}
                >
                  <span style={{ fontSize: 14 }}>{r ? r.icon : '•'}</span>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#fff',
                    }}
                  >
                    {m.label}
                  </div>
                </div>
                <div style={{ fontSize: 10, color: '#7e7e9a' }}>
                  {m.date} · {m.duration}
                </div>
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: '#aaaacc',
                  lineHeight: 1.5,
                  paddingLeft: 23,
                }}
              >
                {m.note}
              </div>
            </div>
          );
        })}
      </div>
      <div
        style={{
          marginTop: 12,
          background: '#1e1e30',
          border: '1px solid #4a4a68',
          borderRadius: 6,
          padding: '11px 14px',
          fontSize: 10,
          color: '#7e7e9a',
          textAlign: 'center',
          lineHeight: 1.6,
        }}
      >
        Report mobility sessions in chat to log them here. Pre-session prime +
        foam roll + yoga all count.
      </div>
    </>
  );
}
