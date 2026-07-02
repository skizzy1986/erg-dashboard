import { useState } from 'react';
import { HR_ZONES, EST_MHR, SRPE_SCALE } from '../constants/trainingConfig.js';
import {
  REP_SCHEMES,
  LOWER_DIFFERENTIATION,
  STRENGTH_PRINCIPLES,
} from '../constants/exercises.js';
import {
  MACRO_TARGETS,
  MF_PROGRAM,
  DEFICIT_PROGRAM,
  FUELLING,
  NUTRITION_PRINCIPLES,
} from '../constants/nutrition.js';
import { PHASES } from '../constants/schedule.js';
import { C, ICON } from '../constants/ui.js';
import {
  ERGZONE_FORMAT,
  BUILD1_SESSIONS,
  INTENSITY_EVOLUTION,
  VOLUME_EXTRAS,
  TECHNIQUE_WORK,
  MOVEMENT_SCREEN,
  MOBILITY_WARMUP,
} from '../constants/program.js';
import ProgramMicrocycle from './program/ProgramMicrocycle.jsx';
import ProgramYear from './program/ProgramYear.jsx';

export default function ProgramView({ expanded, setExpanded }) {
  const [progTab, setProgTab] = useState('phases');

  return (
    <>
      {/* Sub-nav */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {[
          ['phases', 'Phases'],
          ['week', '2-Wk Cycle'],
          ['year', 'Annual'],
        ].map(([v, label]) => (
          <button
            key={v}
            onClick={() => setProgTab(v)}
            style={{
              flex: 1,
              background: progTab === v ? '#4a4a68' : 'transparent',
              border: progTab === v ? '1px solid #00d4ff' : '1px solid #4a4a68',
              color: progTab === v ? '#00d4ff' : '#7e7e9a',
              borderRadius: 6,
              padding: '8px 4px',
              fontSize: 9,
              letterSpacing: 1,
              cursor: 'pointer',
              fontFamily: "'DM Mono',monospace",
            }}
          >
            {label.toUpperCase()}
          </button>
        ))}
      </div>

      {/* ─── 2-WEEK MICROCYCLE ─── */}
      {progTab === 'week' && <ProgramMicrocycle />}

      {/* ─── ANNUAL ARC ─── */}
      {progTab === 'year' && <ProgramYear />}

      {/* ─── PHASES (existing detail) ─── */}
      {progTab === 'phases' && (
        <>
          {/* Phase selector */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            {PHASES.map((p) => (
              <button
                key={p.id}
                onClick={() => setExpanded(p.id)}
                style={{
                  flex: 1,
                  background: expanded === p.id ? '#4a4a68' : 'transparent',
                  border:
                    expanded === p.id
                      ? `1px solid ${p.current ? '#00d4ff' : '#5a5a74'}`
                      : '1px solid #4a4a68',
                  color:
                    expanded === p.id
                      ? p.current
                        ? '#00d4ff'
                        : '#aaaacc'
                      : '#6c6c88',
                  borderRadius: 6,
                  padding: '9px 6px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  fontFamily: "'DM Mono',monospace",
                }}
              >
                <div
                  style={{
                    fontSize: 8,
                    letterSpacing: 2,
                    marginBottom: 2,
                    color: p.current ? '#00d4ff' : '#6c6c88',
                  }}
                >
                  {p.status}
                </div>
                <div style={{ fontSize: 9 }}>{p.name.split('—')[1].trim()}</div>
              </button>
            ))}
          </div>

          {/* Phase detail */}
          {PHASES.map(
            (phase) =>
              expanded === phase.id && (
                <div key={phase.id}>
                  {/* Phase header */}
                  <div
                    style={{
                      background: '#2a2a48',
                      border: `1px solid ${phase.current ? '#00d4ff30' : '#4a4a68'}`,
                      borderLeft: `3px solid ${phase.current ? '#00d4ff' : '#5a5a74'}`,
                      borderRadius: 6,
                      padding: '13px 16px',
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        marginBottom: 6,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: '#fff',
                        }}
                      >
                        {phase.name}
                      </div>
                      <div
                        style={{
                          fontSize: 9,
                          color: '#7e7e9a',
                          letterSpacing: 2,
                        }}
                      >
                        {phase.duration}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: '#aaaacc',
                        lineHeight: 1.7,
                        marginBottom: 8,
                      }}
                    >
                      {phase.principle}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: '#555568',
                        lineHeight: 1.6,
                        borderTop: '1px solid #4a4a68',
                        paddingTop: 8,
                      }}
                    >
                      📚 {phase.science}
                    </div>
                    {phase.test && (
                      <div
                        style={{
                          fontSize: 10,
                          color: phase.id === 'peak' ? '#ff2d55' : '#00d4ff',
                          lineHeight: 1.6,
                          borderTop: '1px solid #4a4a68',
                          paddingTop: 8,
                          marginTop: 8,
                        }}
                      >
                        ⏱️ <span style={{ fontWeight: 700 }}>TEST: </span>
                        {phase.test}
                      </div>
                    )}
                  </div>

                  {/* Weekly template */}
                  <div
                    style={{
                      fontSize: 9,
                      letterSpacing: 3,
                      color: '#7e7e9a',
                      marginBottom: 8,
                    }}
                  >
                    WEEKLY TEMPLATE
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                      marginBottom: 14,
                    }}
                  >
                    {phase.weekly.map((s, i) => {
                      const color = C[s.type] || '#888';
                      const isRest = s.type === 'Rest';
                      return (
                        <div
                          key={i}
                          onClick={() =>
                            setExpanded(
                              expanded === `${phase.id}-${i}`
                                ? phase.id
                                : `${phase.id}-${i}`
                            )
                          }
                          style={{
                            background:
                              expanded === `${phase.id}-${i}`
                                ? `${color}12`
                                : '#2a2a48',
                            border: `1px solid ${expanded === `${phase.id}-${i}` ? color + '50' : '#4a4a68'}`,
                            borderLeft: `3px solid ${color}`,
                            borderRadius: 6,
                            padding: '11px 14px',
                            cursor: isRest ? 'default' : 'pointer',
                            opacity: isRest ? 0.45 : 1,
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                              }}
                            >
                              <div
                                style={{
                                  width: 28,
                                  fontSize: 9,
                                  fontWeight: 700,
                                  color,
                                  letterSpacing: 1,
                                }}
                              >
                                {s.day}
                              </div>
                              <div style={{ fontSize: 14 }}>
                                {ICON[s.type] || '•'}
                              </div>
                              <div>
                                <div
                                  style={{
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color: '#fff',
                                  }}
                                >
                                  {s.label}
                                </div>
                                <div
                                  style={{
                                    fontSize: 10,
                                    color: '#7e7e9a',
                                  }}
                                >
                                  {s.detail}
                                </div>
                              </div>
                            </div>
                            {s.hr !== '—' && (
                              <div
                                style={{
                                  textAlign: 'right',
                                  flexShrink: 0,
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: 11,
                                    color,
                                    fontWeight: 600,
                                  }}
                                >
                                  {s.hr}
                                </div>
                                <div
                                  style={{
                                    fontSize: 9,
                                    color: '#6c6c88',
                                  }}
                                >
                                  {s.zone}
                                </div>
                              </div>
                            )}
                          </div>
                          {expanded === `${phase.id}-${i}` && !isRest && (
                            <div
                              style={{
                                marginTop: 10,
                                background: '#08080d',
                                borderRadius: 4,
                                padding: '9px 11px',
                                fontSize: 11,
                                color: '#aaaacc',
                                lineHeight: 1.7,
                              }}
                            >
                              📋 {s.notes}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )
          )}

          {/* Default state — no phase selected */}
          {!PHASES.some((p) => expanded === p.id) && (
            <div
              style={{
                textAlign: 'center',
                padding: '30px 0',
                color: '#5a5a74',
                fontSize: 12,
              }}
            >
              Select a phase above to view the weekly template
            </div>
          )}

          {/* ErgZone-compliant Build-1 sessions (queued) */}
          <div
            style={{
              background: '#2a2a48',
              border: '1px solid #00d4ff30',
              borderLeft: '3px solid #00d4ff',
              borderRadius: 6,
              padding: '14px 16px',
              marginBottom: 10,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 6,
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: 3,
                  color: '#00d4ff',
                }}
              >
                ERGZONE SESSIONS · QUEUED FOR BUILD 1
              </div>
              <div style={{ fontSize: 8, color: '#6c6c88' }}>Sept+</div>
            </div>
            <div
              style={{
                fontSize: 10,
                color: '#aaaacc',
                lineHeight: 1.5,
                marginBottom: 4,
              }}
            >
              {ERGZONE_FORMAT.note}
            </div>
            <div
              style={{
                fontSize: 9,
                color: '#888860',
                lineHeight: 1.5,
                marginBottom: 10,
              }}
            >
              🔓 {ERGZONE_FORMAT.unlock}
            </div>
            {BUILD1_SESSIONS.map((s, i) => (
              <div
                key={i}
                style={{
                  background: '#08080d',
                  borderLeft: `2px solid ${s.color}`,
                  borderRadius: 4,
                  padding: '10px 12px',
                  marginBottom: 6,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginBottom: 3,
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#e8e8f0',
                    }}
                  >
                    {s.name}
                  </span>
                  <span
                    style={{
                      fontSize: 8,
                      color: s.color,
                      letterSpacing: 1,
                    }}
                  >
                    {s.serves}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 9,
                    color: '#888',
                    lineHeight: 1.5,
                    marginBottom: 6,
                  }}
                >
                  {s.purpose}
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr',
                    gap: '2px 8px',
                    fontSize: 9,
                  }}
                >
                  <span style={{ color: '#7e7e9a' }}>Type</span>
                  <span style={{ color: '#aaaacc' }}>{s.type}</span>
                  <span style={{ color: '#7e7e9a' }}>Work</span>
                  <span style={{ color: '#e8e8f0', fontWeight: 600 }}>
                    {s.work}
                  </span>
                  <span style={{ color: '#7e7e9a' }}>Rest</span>
                  <span style={{ color: '#aaaacc' }}>{s.rest}</span>
                  <span style={{ color: '#7e7e9a' }}>Target</span>
                  <span style={{ color: s.color }}>{s.target}</span>
                  <span style={{ color: '#7e7e9a' }}>Rate</span>
                  <span style={{ color: '#aaaacc' }}>{s.rate}</span>
                  <span style={{ color: '#7e7e9a' }}>Warmup</span>
                  <span style={{ color: '#aaaacc' }}>{s.warmup}</span>
                </div>
              </div>
            ))}
            <div
              style={{
                fontSize: 8,
                color: '#6c6c88',
                lineHeight: 1.5,
                marginTop: 4,
                fontStyle: 'italic',
              }}
            >
              {ERGZONE_FORMAT.status}
            </div>
          </div>

          {/* Intensity model evolution — Rojabo */}
          <div
            style={{
              background: '#2a2a48',
              border: '1px solid #ff6b3530',
              borderLeft: '3px solid #ff6b35',
              borderRadius: 6,
              padding: '14px 16px',
              marginBottom: 10,
            }}
          >
            <div
              style={{
                fontSize: 9,
                letterSpacing: 3,
                color: '#ff6b35',
                marginBottom: 8,
              }}
            >
              INTENSITY MODEL · EVOLVES BY PHASE
            </div>
            <div
              style={{
                background: '#08080d',
                borderRadius: 4,
                padding: '9px 11px',
                marginBottom: 6,
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: '#00d4ff',
                  marginBottom: 2,
                }}
              >
                BASE (NOW) · HR-GOVERNED
              </div>
              <div
                style={{
                  fontSize: 9,
                  color: '#aaaacc',
                  lineHeight: 1.5,
                }}
              >
                {INTENSITY_EVOLUTION.base}
              </div>
            </div>
            <div
              style={{
                background: '#08080d',
                borderRadius: 4,
                padding: '9px 11px',
                marginBottom: 6,
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: '#ff6b35',
                  marginBottom: 2,
                }}
              >
                BUILD / RACE · STROKE-RATE / WATTS-FIXED
              </div>
              <div
                style={{
                  fontSize: 9,
                  color: '#aaaacc',
                  lineHeight: 1.5,
                }}
              >
                {INTENSITY_EVOLUTION.buildRace}
              </div>
            </div>
            <div
              style={{
                background: '#08080d',
                borderRadius: 4,
                padding: '9px 11px',
                marginBottom: 6,
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: '#ffd700',
                  marginBottom: 2,
                }}
              >
                🎯 POWER GUIDE · POST-CP-TEST
              </div>
              <div
                style={{
                  fontSize: 9,
                  color: '#aaaacc',
                  lineHeight: 1.5,
                }}
              >
                {INTENSITY_EVOLUTION.powerGuide}
              </div>
            </div>
            <div
              style={{
                fontSize: 8,
                color: '#7e7e9a',
                lineHeight: 1.5,
                fontStyle: 'italic',
              }}
            >
              Rojabo (Danish National Team method). {INTENSITY_EVOLUTION.why}
            </div>
          </div>

          {/* Optional volume extras */}
          <div
            style={{
              background: '#2a2a48',
              border: '1px solid #34d39930',
              borderLeft: '3px solid #34d399',
              borderRadius: 6,
              padding: '14px 16px',
              marginBottom: 10,
            }}
          >
            <div
              style={{
                fontSize: 9,
                letterSpacing: 3,
                color: '#34d399',
                marginBottom: 6,
              }}
            >
              OPTIONAL VOLUME EXTRAS · AFTERNOON ADD-ONS
            </div>
            <div
              style={{
                fontSize: 9,
                color: '#888860',
                lineHeight: 1.5,
                marginBottom: 10,
              }}
            >
              ⚠️ {VOLUME_EXTRAS.rules}
            </div>
            {VOLUME_EXTRAS.templates.map((t, i) => (
              <div
                key={i}
                style={{
                  background: '#08080d',
                  borderLeft: `2px solid ${t.color}`,
                  borderRadius: 4,
                  padding: '10px 12px',
                  marginBottom: 6,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginBottom: 4,
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: t.color,
                    }}
                  >
                    {t.name}
                  </span>
                  <span
                    style={{
                      fontSize: 8,
                      color: '#7e7e9a',
                      letterSpacing: 1,
                    }}
                  >
                    {t.focus}
                  </span>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr',
                    gap: '2px 8px',
                    fontSize: 9,
                    marginBottom: 5,
                  }}
                >
                  <span style={{ color: '#7e7e9a' }}>Build</span>
                  <span style={{ color: '#aaaacc' }}>
                    {t.type} · {t.work}
                  </span>
                  <span style={{ color: '#7e7e9a' }}>Target</span>
                  <span style={{ color: t.color }}>{t.target}</span>
                  <span style={{ color: '#7e7e9a' }}>Rate</span>
                  <span style={{ color: '#aaaacc' }}>{t.rate}</span>
                  <span style={{ color: '#7e7e9a' }}>Warmup</span>
                  <span style={{ color: '#aaaacc' }}>{t.warmup}</span>
                </div>
                <div
                  style={{
                    fontSize: 9,
                    color: '#888',
                    lineHeight: 1.5,
                    borderTop: '1px solid #3e3e5a',
                    paddingTop: 5,
                  }}
                >
                  🎯 {t.cues}
                </div>
              </div>
            ))}
          </div>

          {/* HR Zones */}
          <div
            style={{
              background: '#2a2a48',
              border: '1px solid #4a4a68',
              borderRadius: 6,
              padding: '14px 16px',
              marginBottom: 10,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: 3,
                  color: '#ff6b35',
                }}
              >
                HEART RATE ZONES
              </div>
              <div style={{ fontSize: 9, color: '#6c6c88' }}>
                Est. MHR {EST_MHR} bpm · confirm when tested
              </div>
            </div>
            {HR_ZONES.map((z) => (
              <div
                key={z.zone}
                style={{
                  display: 'flex',
                  gap: 10,
                  marginBottom: 8,
                  alignItems: 'flex-start',
                }}
              >
                <div
                  style={{
                    width: 28,
                    flexShrink: 0,
                    fontSize: 9,
                    fontWeight: 700,
                    color: z.color,
                    letterSpacing: 1,
                    paddingTop: 1,
                  }}
                >
                  {z.zone}
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      alignItems: 'baseline',
                      marginBottom: 2,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        color: '#fff',
                        fontWeight: 600,
                      }}
                    >
                      {z.bpm} bpm
                    </span>
                    <span style={{ fontSize: 9, color: '#6c6c88' }}>
                      {z.pct} MHR · {z.lactate}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: '#7e7e9a',
                      lineHeight: 1.5,
                    }}
                  >
                    {z.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Grey zone warning */}
          <div
            style={{
              background: '#1e1e30',
              border: '1px solid #ffd70030',
              borderLeft: '3px solid #ffd700',
              borderRadius: 6,
              padding: '11px 14px',
              fontSize: 11,
              color: '#888860',
              lineHeight: 1.6,
            }}
          >
            ⚠️ Avoid the grey zone (UT1 upper → AT, ~136–148 bpm). Most
            recreational athletes spend too much time here. It's taxing enough
            to accumulate fatigue but not intense enough to drive VO₂
            adaptation. Your natural negative-split pacing pattern drifts into
            this zone — use HR to stay below 136 on Z2 days.
          </div>

          {/* ── STRENGTH GUIDELINES ── */}
          <div
            style={{
              fontSize: 9,
              letterSpacing: 3,
              color: '#34d399',
              margin: '20px 0 8px',
            }}
          >
            STRENGTH FOR PERFORMANCE
          </div>

          {/* Rep schemes */}
          <div
            style={{
              background: '#2a2a48',
              border: '1px solid #4a4a68',
              borderRadius: 6,
              padding: '14px 16px',
              marginBottom: 10,
            }}
          >
            <div
              style={{
                fontSize: 9,
                letterSpacing: 2,
                color: '#7e7e9a',
                marginBottom: 12,
              }}
            >
              REP SCHEMES BY MOVEMENT TIER
            </div>
            {REP_SCHEMES.map((r) => (
              <div
                key={r.tier}
                style={{
                  marginBottom: 14,
                  paddingBottom: 14,
                  borderBottom: '1px solid #3e3e5a',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginBottom: 4,
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: r.color,
                    }}
                  >
                    {r.tier}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: '#fff',
                      fontWeight: 600,
                    }}
                  >
                    {r.reps} reps{' '}
                    <span style={{ color: '#7e7e9a', fontWeight: 400 }}>
                      · {r.rest}
                    </span>
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: '#aaaacc',
                    marginBottom: 4,
                  }}
                >
                  {r.lifts}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: '#7e7e9a',
                    lineHeight: 1.5,
                  }}
                >
                  {r.why}
                </div>
              </div>
            ))}
            <div
              style={{
                fontSize: 9,
                color: '#6c6c88',
                lineHeight: 1.5,
                fontStyle: 'italic',
              }}
            >
              Heavy low-rep compounds transfer best to the drive/pedal and
              interfere least with aerobic adaptation. Pump work stays on small
              muscles where fatigue cost is trivial.
            </div>
          </div>

          {/* Lower day differentiation */}
          <div
            style={{
              background: '#2a2a48',
              border: '1px solid #34d39930',
              borderLeft: '3px solid #34d399',
              borderRadius: 6,
              padding: '14px 16px',
              marginBottom: 10,
            }}
          >
            <div
              style={{
                fontSize: 9,
                letterSpacing: 2,
                color: '#34d399',
                marginBottom: 4,
              }}
            >
              LOWER DAY DIFFERENTIATION
            </div>
            <div
              style={{
                fontSize: 10,
                color: '#7e7e9a',
                marginBottom: 12,
                lineHeight: 1.5,
              }}
            >
              Daily undulating periodization — train legs twice without max CNS
              load both times. Protects recovery.
            </div>
            {LOWER_DIFFERENTIATION.map((d) => (
              <div key={d.day} style={{ marginBottom: 10 }}>
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
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#fff',
                    }}
                  >
                    {d.day}
                  </span>
                  <span style={{ fontSize: 10, color: '#34d399' }}>
                    {d.focus}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: '#aaaacc',
                    lineHeight: 1.6,
                  }}
                >
                  {d.detail}
                </div>
              </div>
            ))}
          </div>

          {/* Strength principles */}
          <div
            style={{
              background: '#2a2a48',
              border: '1px solid #4a4a68',
              borderRadius: 6,
              padding: '14px 16px',
              marginBottom: 10,
            }}
          >
            <div
              style={{
                fontSize: 9,
                letterSpacing: 2,
                color: '#7e7e9a',
                marginBottom: 10,
              }}
            >
              KEY PRINCIPLES
            </div>
            {STRENGTH_PRINCIPLES.map(([icon, text]) => (
              <div
                key={text}
                style={{
                  display: 'flex',
                  gap: 10,
                  marginBottom: 9,
                  fontSize: 11,
                  color: '#aaaacc',
                  lineHeight: 1.5,
                }}
              >
                <span style={{ flexShrink: 0 }}>{icon}</span>
                <span>{text}</span>
              </div>
            ))}
          </div>

          {/* Goal hierarchy note */}
          <div
            style={{
              background: '#1e1e30',
              border: '1px solid #f472b630',
              borderLeft: '3px solid #f472b6',
              borderRadius: 6,
              padding: '11px 14px',
              fontSize: 11,
              color: '#aaaacc',
              lineHeight: 1.6,
            }}
          >
            <span style={{ color: '#f472b6', fontWeight: 700 }}>
              GOAL HIERARCHY:{' '}
            </span>
            Lower body + pulling serve performance AND aesthetics — prioritise.
            Pressing & arms are aesthetic-only (antagonist to the rowing
            stroke). Keep them for the shirt-off goal, but know they don't buy
            rowing or cycling performance. Concurrent endurance + strength means
            each progresses at ~80% of its isolated potential — an accepted
            trade for training both.
          </div>

          {/* ── TECHNIQUE & SKILL ── */}
          <div
            style={{
              fontSize: 9,
              letterSpacing: 3,
              color: '#00d4ff',
              margin: '20px 0 8px',
            }}
          >
            TECHNIQUE, SKILL & RECOVERY
          </div>
          <div
            style={{
              background: '#1e1e30',
              border: '1px solid #00d4ff30',
              borderLeft: '3px solid #00d4ff',
              borderRadius: 6,
              padding: '11px 14px',
              marginBottom: 10,
              fontSize: 11,
              color: '#aaaacc',
              lineHeight: 1.6,
            }}
          >
            Technical efficiency gains cost zero recovery — a 2–3% stroke
            improvement is free speed at every intensity. These integrate into
            existing sessions; nothing added to the schedule.
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              marginBottom: 10,
            }}
          >
            {TECHNIQUE_WORK.map((t) => (
              <div
                key={t.name}
                style={{
                  background: '#2a2a48',
                  border: '1px solid #4a4a68',
                  borderLeft: `3px solid ${t.color}`,
                  borderRadius: 6,
                  padding: '12px 14px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginBottom: 4,
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: t.color,
                    }}
                  >
                    {t.name}
                  </span>
                  <span style={{ fontSize: 9, color: '#7e7e9a' }}>
                    {t.freq}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: '#aaaacc',
                    lineHeight: 1.6,
                    marginBottom: 5,
                  }}
                >
                  {t.how}
                </div>
                <div
                  style={{
                    fontSize: 9,
                    color: '#7e7e9a',
                    fontStyle: 'italic',
                  }}
                >
                  {t.why}
                </div>
              </div>
            ))}

            {/* Yoga & Foam Rolling */}
            <div
              style={{
                background: '#2a2a48',
                border: '1px solid #4a4a68',
                borderLeft: '3px solid #f472b6',
                borderRadius: 6,
                padding: '12px 14px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: 4,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#f472b6',
                  }}
                >
                  Foam Roll + Yoga
                </span>
                <span style={{ fontSize: 9, color: '#7e7e9a' }}>
                  Rest days · 15+20 min
                </span>
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: '#aaaacc',
                  lineHeight: 1.6,
                  marginBottom: 5,
                }}
              >
                Foam roll first (t-spine, lats, glutes, hamstrings, calves —
                30–60s on tight spots, not fast rolling). Then yoga. British
                Rowing study: lack of flexibility is the primary limiter for
                masters rowers. This directly addresses it.
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: '#aaaacc',
                  lineHeight: 1.5,
                  marginBottom: 8,
                }}
              >
                <span style={{ color: '#f472b6' }}>Resource: </span>Yoga with
                Kara — yoga4rowers.com (Masters Toolkit). Free trial. Also on
                YouTube (search "Yoga with Kara athletes recovery"). Optional:
                British Rowing's 3-stretch before-bed sequence on two-a-day
                nights.
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: '#aaaacc',
                  lineHeight: 1.5,
                }}
              >
                <span style={{ color: '#f472b6' }}>Pay attention to: </span>
                hip flexors (lunge poses), hamstring length (forward folds),
                t-spine rotation, child's pose hip depth. Note L/R differences —
                asymmetries show up first in yoga and show up later as injury.
              </div>
            </div>
          </div>

          {/* ── sRPE ── */}
          <div
            style={{
              background: '#2a2a48',
              border: '1px solid #ffd70030',
              borderLeft: '3px solid #ffd700',
              borderRadius: 6,
              padding: '13px 16px',
              marginBottom: 10,
            }}
          >
            <div
              style={{
                fontSize: 9,
                letterSpacing: 3,
                color: '#ffd700',
                marginBottom: 8,
              }}
            >
              sRPE · SUBJECTIVE MONITORING
            </div>
            <div
              style={{
                fontSize: 11,
                color: '#aaaacc',
                lineHeight: 1.7,
              }}
            >
              {SRPE_SCALE}
            </div>
            <div
              style={{
                fontSize: 9,
                color: '#7e7e9a',
                marginTop: 8,
                fontStyle: 'italic',
              }}
            >
              Subjective measures often catch overreaching before HRV does.
              Report the number with each session — it gets logged alongside the
              data.
            </div>
          </div>

          {/* ── MOVEMENT SCREEN ── */}
          <div
            style={{
              background: '#2a2a48',
              border: '1px solid #4a4a68',
              borderRadius: 6,
              padding: '14px 16px',
              marginBottom: 10,
            }}
          >
            <div
              style={{
                fontSize: 9,
                letterSpacing: 3,
                color: '#34d399',
                marginBottom: 4,
              }}
            >
              MOVEMENT SCREEN · MONTHLY (~10 MIN)
            </div>
            <div
              style={{
                fontSize: 9,
                color: '#7e7e9a',
                marginBottom: 12,
                lineHeight: 1.5,
              }}
            >
              Run on a rest Sunday. Log anything flagged — asymmetries and
              restrictions affect both injury risk and stroke length.
            </div>
            {MOVEMENT_SCREEN.map((m) => (
              <div
                key={m.test}
                style={{
                  marginBottom: 10,
                  paddingBottom: 10,
                  borderBottom: '1px solid #3e3e5a',
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#e8e8f0',
                    marginBottom: 3,
                  }}
                >
                  {m.test}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: '#aaaacc',
                    lineHeight: 1.5,
                  }}
                >
                  {m.look}
                </div>
                <div
                  style={{
                    fontSize: 9,
                    color: '#ff6b35',
                    marginTop: 3,
                  }}
                >
                  ⚑ {m.flag}
                </div>
              </div>
            ))}
            <div
              style={{
                fontSize: 9,
                letterSpacing: 2,
                color: '#7e7e9a',
                margin: '10px 0 8px',
              }}
            >
              PRE-LIFT MOBILITY (5–10 MIN, EVERY STRENGTH SESSION)
            </div>
            {MOBILITY_WARMUP.map((m) => (
              <div
                key={m}
                style={{
                  fontSize: 10,
                  color: '#aaaacc',
                  lineHeight: 1.7,
                  paddingLeft: 4,
                }}
              >
                · {m}
              </div>
            ))}
          </div>

          {/* ── NUTRITION ── */}
          <div
            style={{
              fontSize: 9,
              letterSpacing: 3,
              color: '#ff2d55',
              margin: '20px 0 8px',
            }}
          >
            NUTRITION · RECOMP
          </div>

          {/* Recomp framing */}
          <div
            style={{
              background: '#1e1e30',
              border: '1px solid #ff2d5530',
              borderLeft: '3px solid #ff2d55',
              borderRadius: 6,
              padding: '11px 14px',
              marginBottom: 10,
              fontSize: 11,
              color: '#aaaacc',
              lineHeight: 1.6,
            }}
          >
            <span style={{ color: '#ff2d55', fontWeight: 700 }}>
              THE WINDOW:{' '}
            </span>
            Simultaneous fat loss + muscle gain is hardest for lean, trained
            lifters — but your rapid strength PRs signal a return-to-training
            phase, exactly when recomp works best. Ride it while it lasts.
            Logged in MacroFactor — its adaptive expenditure suits variable
            training load.{' '}
            <span style={{ color: '#7e7e9a' }}>
              Not dietitian advice — general framework.
            </span>
          </div>

          {/* Macro targets */}
          <div
            style={{
              background: '#2a2a48',
              border: '1px solid #4a4a68',
              borderRadius: 6,
              padding: '14px 16px',
              marginBottom: 10,
            }}
          >
            <div
              style={{
                fontSize: 9,
                letterSpacing: 2,
                color: '#7e7e9a',
                marginBottom: 12,
              }}
            >
              DAILY MACRO TARGETS · ~94KG
            </div>
            {MACRO_TARGETS.map((m) => (
              <div
                key={m.macro}
                style={{
                  marginBottom: 12,
                  paddingBottom: 12,
                  borderBottom: '1px solid #3e3e5a',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginBottom: 4,
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: m.color,
                    }}
                  >
                    {m.macro}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: '#fff',
                      fontWeight: 600,
                    }}
                  >
                    {m.target}{' '}
                    <span style={{ color: '#7e7e9a', fontWeight: 400 }}>
                      · {m.rule}
                    </span>
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: '#7e7e9a',
                    lineHeight: 1.5,
                  }}
                >
                  {m.note}
                </div>
              </div>
            ))}
            <div
              style={{
                fontSize: 9,
                color: '#6c6c88',
                lineHeight: 1.5,
                fontStyle: 'italic',
              }}
            >
              Currently MAINTENANCE (avg ~3,030/day) until clean TDEE confirms.
              Deficit (0.3kg/wk) starts after. Protein → carbs → fat priority.
            </div>
          </div>

          {/* Live MacroFactor periodized program */}
          <div
            style={{
              background: '#2a2a48',
              border: '1px solid #34d39930',
              borderLeft: '3px solid #34d399',
              borderRadius: 6,
              padding: '14px 16px',
              marginBottom: 10,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: 2,
                  color: '#34d399',
                }}
              >
                LIVE PROGRAM · PERIODIZED (MacroFactor)
              </div>
              <div style={{ fontSize: 8, color: '#6c6c88' }}>
                avg ~3,030 · maintenance
              </div>
            </div>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 10,
              }}
            >
              <thead>
                <tr style={{ borderBottom: '1px solid #4a4a68' }}>
                  {['Day', 'Training', 'Cal', 'P', 'C', 'F'].map((h) => (
                    <td
                      key={h}
                      style={{
                        padding: '4px 5px',
                        color: '#7e7e9a',
                        fontSize: 8,
                        letterSpacing: 1,
                        textAlign:
                          h === 'Day' || h === 'Training' ? 'left' : 'right',
                      }}
                    >
                      {h}
                    </td>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MF_PROGRAM.map((d, i) => {
                  const hot = d.cal >= 3200;
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid #1e1e30' }}>
                      <td
                        style={{
                          padding: '5px 5px',
                          color: '#e8e8f0',
                          fontWeight: 700,
                        }}
                      >
                        {d.day}
                      </td>
                      <td style={{ padding: '5px 5px', color: '#888' }}>
                        {d.train}
                      </td>
                      <td
                        style={{
                          padding: '5px 5px',
                          color: hot ? '#34d399' : '#aaaacc',
                          fontWeight: hot ? 700 : 400,
                          textAlign: 'right',
                        }}
                      >
                        {d.cal}
                      </td>
                      <td
                        style={{
                          padding: '5px 5px',
                          color: '#ff2d55',
                          textAlign: 'right',
                        }}
                      >
                        {d.p}
                      </td>
                      <td
                        style={{
                          padding: '5px 5px',
                          color: '#00d4ff',
                          textAlign: 'right',
                        }}
                      >
                        {d.c}
                      </td>
                      <td
                        style={{
                          padding: '5px 5px',
                          color: '#ffd700',
                          textAlign: 'right',
                        }}
                      >
                        {d.f}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div
              style={{
                fontSize: 8,
                color: '#7e7e9a',
                lineHeight: 1.5,
                marginTop: 8,
                fontStyle: 'italic',
              }}
            >
              Protein locked 200g all days. Carbs periodized to load (395 on
              two-a-day/long-row, 280 rest). MacroFactor's own expenditure est.
              lags at 2,136 (near RMR) — hold ~3,030 via Collaborative override;
              weight trend settles it.
            </div>
          </div>

          {/* Queued deficit program */}
          <div
            style={{
              background: 'linear-gradient(135deg,#ff6b3512,#1e1e30)',
              border: '1px solid #ff6b3540',
              borderLeft: '3px solid #ff6b35',
              borderRadius: 6,
              padding: '14px 16px',
              marginBottom: 10,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 6,
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: 2,
                  color: '#ff6b35',
                }}
              >
                QUEUED · DEFICIT PROGRAM (LEAN PHASE)
              </div>
              <div style={{ fontSize: 8, color: '#6c6c88' }}>~0.25kg/wk</div>
            </div>
            <div
              style={{
                fontSize: 9,
                color: '#ffd700',
                lineHeight: 1.5,
                marginBottom: 8,
              }}
            >
              🔒 {DEFICIT_PROGRAM.trigger}
            </div>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 10,
              }}
            >
              <thead>
                <tr style={{ borderBottom: '1px solid #4a4a68' }}>
                  {['Day', 'Cal', 'P', 'C', 'F', 'vs maint'].map((h) => (
                    <td
                      key={h}
                      style={{
                        padding: '4px 5px',
                        color: '#7e7e9a',
                        fontSize: 8,
                        letterSpacing: 1,
                        textAlign:
                          h === 'Day'
                            ? 'left'
                            : h === 'vs maint'
                              ? 'right'
                              : 'right',
                      }}
                    >
                      {h}
                    </td>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DEFICIT_PROGRAM.days.map((d, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #1e1e30' }}>
                    <td
                      style={{
                        padding: '5px',
                        color: '#e8e8f0',
                        fontWeight: 700,
                      }}
                    >
                      {d.day}
                    </td>
                    <td
                      style={{
                        padding: '5px',
                        color: '#aaaacc',
                        textAlign: 'right',
                      }}
                    >
                      {d.cal}
                    </td>
                    <td
                      style={{
                        padding: '5px',
                        color: '#ff2d55',
                        textAlign: 'right',
                      }}
                    >
                      {d.p}
                    </td>
                    <td
                      style={{
                        padding: '5px',
                        color: '#00d4ff',
                        textAlign: 'right',
                      }}
                    >
                      {d.c}
                    </td>
                    <td
                      style={{
                        padding: '5px',
                        color: '#ffd700',
                        textAlign: 'right',
                      }}
                    >
                      {d.f}
                    </td>
                    <td
                      style={{
                        padding: '5px',
                        color: '#888',
                        textAlign: 'right',
                        fontSize: 8,
                      }}
                    >
                      {d.cut}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div
              style={{
                fontSize: 9,
                letterSpacing: 2,
                color: '#ff6b35',
                marginTop: 10,
                marginBottom: 6,
              }}
            >
              GUARDRAILS
            </div>
            {DEFICIT_PROGRAM.guardrails.map((g, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  gap: 8,
                  marginBottom: 5,
                  fontSize: 9,
                  color: '#aaaacc',
                  lineHeight: 1.5,
                }}
              >
                <span style={{ color: '#ff6b35', flexShrink: 0 }}>·</span>
                <span>{g}</span>
              </div>
            ))}
            <div
              style={{
                fontSize: 9,
                color: '#888860',
                lineHeight: 1.5,
                marginTop: 8,
              }}
            >
              📍 {DEFICIT_PROGRAM.phase}
            </div>
            <div
              style={{
                fontSize: 9,
                color: '#34d399',
                lineHeight: 1.5,
                marginTop: 6,
                fontStyle: 'italic',
              }}
            >
              💡 {DEFICIT_PROGRAM.note}
            </div>
          </div>

          {/* Nutrition principles */}
          <div
            style={{
              background: '#2a2a48',
              border: '1px solid #4a4a68',
              borderRadius: 6,
              padding: '14px 16px',
              marginBottom: 10,
            }}
          >
            <div
              style={{
                fontSize: 9,
                letterSpacing: 2,
                color: '#7e7e9a',
                marginBottom: 10,
              }}
            >
              KEY PRINCIPLES
            </div>
            {NUTRITION_PRINCIPLES.map(([icon, text]) => (
              <div
                key={text}
                style={{
                  display: 'flex',
                  gap: 10,
                  marginBottom: 9,
                  fontSize: 11,
                  color: '#aaaacc',
                  lineHeight: 1.5,
                }}
              >
                <span style={{ flexShrink: 0 }}>{icon}</span>
                <span>{text}</span>
              </div>
            ))}
          </div>

          {/* Fuelling by session type */}
          <div
            style={{
              background: '#2a2a48',
              border: '1px solid #f472b630',
              borderLeft: '3px solid #f472b6',
              borderRadius: 6,
              padding: '14px 16px',
              marginBottom: 10,
            }}
          >
            <div
              style={{
                fontSize: 9,
                letterSpacing: 2,
                color: '#f472b6',
                marginBottom: 10,
              }}
            >
              FUELLING BY SESSION TYPE
            </div>
            {FUELLING.byType.map((f, i) => (
              <div
                key={i}
                style={{
                  background: '#08080d',
                  borderLeft: `2px solid ${f.color}`,
                  borderRadius: 4,
                  padding: '9px 11px',
                  marginBottom: 6,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: f.color,
                    marginBottom: 3,
                  }}
                >
                  {f.type}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: '#aaaacc',
                    lineHeight: 1.5,
                  }}
                >
                  {f.guide}
                </div>
              </div>
            ))}
            <div
              style={{
                fontSize: 9,
                color: '#888860',
                lineHeight: 1.5,
                marginTop: 4,
              }}
            >
              🥩 {FUELLING.protein}
            </div>
          </div>

          {/* Hydration */}
          <div
            style={{
              background: '#2a2a48',
              border: '1px solid #00d4ff30',
              borderLeft: '3px solid #00d4ff',
              borderRadius: 6,
              padding: '14px 16px',
              marginBottom: 10,
            }}
          >
            <div
              style={{
                fontSize: 9,
                letterSpacing: 2,
                color: '#00d4ff',
                marginBottom: 10,
              }}
            >
              💧 HYDRATION · WA HEAT
            </div>
            {FUELLING.hydration.map((h, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  gap: 10,
                  marginBottom: 7,
                  fontSize: 10,
                  color: '#aaaacc',
                  lineHeight: 1.5,
                }}
              >
                <span style={{ color: '#00d4ff', flexShrink: 0 }}>·</span>
                <span>{h}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
