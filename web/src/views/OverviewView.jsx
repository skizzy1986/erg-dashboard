import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import WorkoutItem from '../components/WorkoutItem.jsx';
import LogEntry from '../components/LogEntry.jsx';
import LoadTooltip from '../components/LoadTooltip.jsx';
import { deriveTargets } from '../utils/trainingLoad.js';
import { assessMacro, macroColor } from '../utils/formatting.js';
import {
  getRosterMode,
  logEntriesForDate,
  getToday,
  getUpcomingSessions,
  daySessions,
} from '../utils/schedule.js';
import {
  evaluateRules,
  checkConsistency,
  autoregulate,
  calcReadiness,
} from '../utils/analysis.js';
import { HR130_POWER } from '../constants/trainingConfig.js';
import { NUTRITION_TARGETS } from '../constants/nutrition.js';
import { PHASE_CONTEXT } from '../constants/schedule.js';
import { nutritionLog, recoveryLog } from '../constants/logs.js';
import { ADAPTIVE_RULES, RULE_EVOLUTION } from '../constants/coaching.js';

export default function OverviewView({
  latest,
  tsbColor,
  loadData,
  loggedSessions,
  latestErg,
  latestSquat,
  totalErgDist,
  totalSessions,
  ftp,
  isWide,
  nowTick,
}) {
  return (
    <>
      {/* ── CONDENSED TODAY STATUS STRIP (live, mobile-first) ── */}
      {(() => {
        const t = getToday(getRosterMode(nowTick)); // roster auto-switches home/FIFO by date
        const todayRec = recoveryLog[recoveryLog.length - 1];
        const lastSrpe = (() => {
          for (let i = 0; i < loggedSessions.length; i++) {
            if (loggedSessions[i].srpe != null) return loggedSessions[i].srpe;
          }
          return null;
        })();
        const fired = evaluateRules(todayRec, lastSrpe, latest.tsb);
        const readiness = calcReadiness(todayRec, latest.tsb);
        const sig = autoregulate(latest.tsb, readiness, fired);
        const upcoming = getUpcomingSessions(nowTick, loggedSessions);
        return (
          <div
            style={{
              background: 'linear-gradient(135deg,#1e1e30,#2a2a48)',
              border: `1px solid ${sig.color}50`,
              borderRadius: 8,
              padding: '14px 16px',
              marginBottom: 14,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 10,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#fff',
                  }}
                >
                  {t.dateStr}
                </div>
                <div
                  style={{
                    fontSize: 9,
                    color: '#7e7e9a',
                    letterSpacing: 1,
                    marginTop: 1,
                  }}
                >
                  {PHASE_CONTEXT.phaseLabel} · wk {PHASE_CONTEXT.weeksIn}/
                  {PHASE_CONTEXT.weeksTotal} ·{' '}
                  {t.cycleLabel.split('—')[0].trim()}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: sig.color,
                  }}
                >
                  ● {sig.signal}
                </div>
                <div style={{ fontSize: 9, color: '#7e7e9a' }}>
                  readiness{' '}
                  {readiness && readiness.score != null ? readiness.score : '—'}
                </div>
              </div>
            </div>
            {t.today &&
              (() => {
                const todaySessions = daySessions(t.today);
                const todayLogged = logEntriesForDate(
                  new Date(),
                  loggedSessions
                );
                const isDone = todayLogged.length > 0;
                return (
                  <div style={{ marginBottom: 8 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 7,
                        marginBottom: 5,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 8,
                          color: t.cycleColor,
                          letterSpacing: 2,
                        }}
                      >
                        TODAY · {t.todayKey}
                      </span>
                      {isDone && (
                        <span
                          style={{
                            fontSize: 8,
                            color: '#34d399',
                            letterSpacing: 1,
                            fontWeight: 700,
                          }}
                        >
                          ✓ {todayLogged.length} LOGGED
                        </span>
                      )}
                    </div>
                    {todaySessions.length === 0 ? (
                      <div
                        style={{
                          background: '#08080d',
                          borderRadius: 5,
                          padding: '10px 12px',
                          fontSize: 11,
                          color: '#6c6c88',
                        }}
                      >
                        Rest day — no scheduled session.
                      </div>
                    ) : (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 4,
                        }}
                      >
                        {todaySessions.map((s, j) => (
                          <WorkoutItem
                            key={j}
                            session={{ ...s, done: isDone }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            <div
              style={{
                fontSize: 8,
                color: '#7e7e9a',
                letterSpacing: 2,
                marginBottom: 5,
              }}
            >
              UPCOMING
            </div>
            {upcoming.length === 0 ? (
              <div style={{ fontSize: 10, color: '#6c6c88' }}>
                No more scheduled sessions in the next 3 days.
              </div>
            ) : (
              upcoming.map((u, i) => {
                const dayDiff = Math.round(
                  (new Date(
                    u.when.getFullYear(),
                    u.when.getMonth(),
                    u.when.getDate()
                  ) -
                    new Date(
                      nowTick.getFullYear(),
                      nowTick.getMonth(),
                      nowTick.getDate()
                    )) /
                    86400000
                );
                const whenLabel =
                  dayDiff === 0 ? 'Today' : dayDiff === 1 ? 'Tomorrow' : u.dow;
                const slotColor = i === 0 ? '#00d4ff' : '#888';
                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '5px 0',
                      borderTop: i > 0 ? '1px solid #3e3e5a' : 'none',
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontSize: 10,
                          color: '#aaaacc',
                          lineHeight: 1.3,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {u.label}
                      </div>
                      <div style={{ fontSize: 8, color: '#6c6c88' }}>
                        {u.slot}
                      </div>
                    </div>
                    <div
                      style={{
                        textAlign: 'right',
                        flexShrink: 0,
                        marginLeft: 10,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: slotColor,
                        }}
                      >
                        {whenLabel}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Recently completed — last few logged sessions at a glance */}
            {(() => {
              const recent = loggedSessions.slice(0, 4);
              if (recent.length === 0) return null;
              return (
                <>
                  <div
                    style={{
                      fontSize: 8,
                      color: '#34d399',
                      letterSpacing: 2,
                      margin: '12px 0 5px',
                    }}
                  >
                    RECENTLY COMPLETED
                  </div>
                  {recent.map((e, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '4px 0',
                        borderTop: i > 0 ? '1px solid #3e3e5a' : 'none',
                      }}
                    >
                      <div
                        style={{
                          minWidth: 0,
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <span
                          style={{
                            color: '#34d399',
                            fontSize: 10,
                            flexShrink: 0,
                          }}
                        >
                          ✓
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            color: '#7a9a8a',
                            lineHeight: 1.3,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {e.label}
                        </span>
                      </div>
                      <div
                        style={{
                          textAlign: 'right',
                          flexShrink: 0,
                          marginLeft: 10,
                          display: 'flex',
                          gap: 6,
                          alignItems: 'center',
                        }}
                      >
                        {e.srpe && (
                          <span style={{ fontSize: 8, color: '#7e7e9a' }}>
                            sRPE {e.srpe}
                          </span>
                        )}
                        {e.prs > 0 && (
                          <span style={{ fontSize: 8, color: '#ffd700' }}>
                            🏆{e.prs}
                          </span>
                        )}
                        <span style={{ fontSize: 9, color: '#7e7e9a' }}>
                          {e.date.slice(0, -3)}
                        </span>
                      </div>
                    </div>
                  ))}
                </>
              );
            })()}
          </div>
        );
      })()}

      {/* Phase context — where you are in the arc */}
      <div
        style={{
          background: 'linear-gradient(135deg,#00d4ff15,#1e1e30)',
          border: '1px solid #00d4ff40',
          borderRadius: 6,
          padding: '13px 16px',
          marginBottom: 16,
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
          <span style={{ fontSize: 13, fontWeight: 700, color: '#00d4ff' }}>
            {PHASE_CONTEXT.phaseLabel}
          </span>
          <span style={{ fontSize: 9, color: '#7e7e9a' }}>
            wk {PHASE_CONTEXT.weeksIn}/{PHASE_CONTEXT.weeksTotal} ·{' '}
            {PHASE_CONTEXT.window}
          </span>
        </div>
        {/* Arc strip */}
        <div style={{ display: 'flex', gap: 3, marginBottom: 8 }}>
          {PHASE_CONTEXT.arc.map((p) => (
            <div
              key={p.phase}
              style={{
                flex: p.phase === 'RACE' ? 1.3 : 1,
                background: p.active ? '#00d4ff' : '#2a2a48',
                border: `1px solid ${p.active ? '#00d4ff' : '#4a4a68'}`,
                borderRadius: 3,
                padding: '5px 4px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: 7,
                  fontWeight: 700,
                  color: p.active ? '#08080d' : '#7e7e9a',
                  letterSpacing: 0.5,
                }}
              >
                {p.phase}
              </div>
              <div
                style={{
                  fontSize: 6,
                  color: p.active ? '#08080d99' : '#6c6c88',
                }}
              >
                {p.window}
              </div>
            </div>
          ))}
        </div>
        <div
          style={{
            fontSize: 10,
            color: '#aaaacc',
            lineHeight: 1.5,
            marginBottom: 5,
          }}
        >
          <span style={{ color: '#00d4ff' }}>Doing: </span>
          {PHASE_CONTEXT.doing}
        </div>
        <div
          style={{
            fontSize: 10,
            color: '#aaaacc',
            lineHeight: 1.5,
            marginBottom: 5,
          }}
        >
          <span style={{ color: '#00d4ff' }}>Why now: </span>
          {PHASE_CONTEXT.why}
        </div>
        <div
          style={{
            fontSize: 10,
            color: '#888860',
            lineHeight: 1.5,
            marginBottom: 5,
          }}
        >
          ⏸ {PHASE_CONTEXT.notYet}
        </div>
        <div
          style={{
            fontSize: 9,
            color: '#7e7e9a',
            lineHeight: 1.5,
            borderTop: '1px solid #3e3e5a',
            paddingTop: 6,
          }}
        >
          Next gate: {PHASE_CONTEXT.nextGate}
        </div>
      </div>

      {/* Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${isWide ? 4 : 2},1fr)`,
          gap: 8,
          marginBottom: 16,
        }}
      >
        {[
          ['SESSIONS LOGGED', totalSessions, 'erg + strength'],
          [
            'ERG DISTANCE',
            `${(totalErgDist / 1000).toFixed(0)}km`,
            'logged total',
          ],
          [
            'LATEST WATTS',
            latestErg?.avg_watts ? `${latestErg.avg_watts}W` : '—',
            'working avg power',
          ],
          ['SQUAT e1RM', `${latestSquat.e1rm}kg`, `as of ${latestSquat.date}`],
        ].map(([k, v, sub]) => (
          <div
            key={k}
            style={{
              background: '#2a2a48',
              border: '1px solid #4a4a68',
              borderRadius: 6,
              padding: '11px 13px',
            }}
          >
            <div
              style={{
                fontSize: 8,
                color: '#7e7e9a',
                letterSpacing: 3,
                marginBottom: 4,
              }}
            >
              {k}
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: '#fff',
                letterSpacing: -0.5,
              }}
            >
              {v}
            </div>
            <div style={{ fontSize: 9, color: '#6c6c88', marginTop: 2 }}>
              {sub}
            </div>
          </div>
        ))}
      </div>

      {/* Adaptive Decision Engine */}
      {(() => {
        const todayRec = recoveryLog[recoveryLog.length - 1];
        const lastSrpe = (() => {
          for (let i = 0; i < loggedSessions.length; i++) {
            if (loggedSessions[i].srpe != null) return loggedSessions[i].srpe;
          }
          return null;
        })();
        const fired = evaluateRules(todayRec, lastSrpe, latest.tsb);
        const consistency = checkConsistency(fired, false);
        return (
          <div
            style={{
              background: 'linear-gradient(135deg,#a78bfa12,#1e1e30)',
              border: '1px solid #a78bfa40',
              borderRadius: 6,
              padding: '14px 16px',
              marginBottom: 16,
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
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: 3,
                  color: '#a78bfa',
                }}
              >
                ⚙️ ADAPTIVE ENGINE
              </div>
              <div style={{ fontSize: 8, color: '#7e7e9a' }}>
                {ADAPTIVE_RULES.length} rules · evolving
              </div>
            </div>
            <div
              style={{
                fontSize: 9,
                color: '#7e7e9a',
                marginBottom: 10,
                lineHeight: 1.5,
              }}
            >
              Codified decision rules from our work. Transparent — every flag
              traces to a rule + its origin. Reads current data; surfaces what's
              firing now.
            </div>

            {/* Currently firing */}
            <div
              style={{
                fontSize: 8,
                letterSpacing: 2,
                color: fired.length ? '#ff6b35' : '#34d399',
                marginBottom: 6,
              }}
            >
              {fired.length
                ? `⚑ ${fired.length} FLAG${fired.length > 1 ? 'S' : ''} FIRING NOW`
                : '✅ NOTHING FLAGGED — CLEAR TO TRAIN AS PLANNED'}
            </div>
            {fired.map((f, i) => (
              <div
                key={`${f.id}-${i}`}
                style={{
                  background: '#08080d',
                  borderLeft: '2px solid #ff6b35',
                  borderRadius: 3,
                  padding: '7px 10px',
                  marginBottom: 4,
                }}
              >
                <span
                  style={{
                    fontSize: 9,
                    color: '#ff6b35',
                    fontWeight: 700,
                  }}
                >
                  {f.id}{' '}
                </span>
                <span style={{ fontSize: 10, color: '#aaaacc' }}>{f.msg}</span>
              </div>
            ))}

            {consistency.conflict && (
              <div
                style={{
                  background: '#1a0d0d',
                  border: '1px solid #ff2d5550',
                  borderRadius: 3,
                  padding: '7px 10px',
                  marginBottom: 4,
                  fontSize: 10,
                  color: '#ffaaaa',
                }}
              >
                {consistency.msg}
              </div>
            )}

            {/* Ruleset (collapsed summary) */}
            <details style={{ marginTop: 10 }}>
              <summary
                style={{
                  fontSize: 9,
                  color: '#a78bfa',
                  cursor: 'pointer',
                  letterSpacing: 1,
                }}
              >
                VIEW FULL RULESET ({ADAPTIVE_RULES.length})
              </summary>
              <div style={{ marginTop: 8 }}>
                {ADAPTIVE_RULES.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      background: '#08080d',
                      borderRadius: 3,
                      padding: '8px 10px',
                      marginBottom: 4,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                      }}
                    >
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: '#e8e8f0',
                        }}
                      >
                        {r.id} · {r.domain}
                      </span>
                      <span
                        style={{
                          fontSize: 8,
                          color: r.tier === 1 ? '#34d399' : '#ffd700',
                        }}
                      >
                        T{r.tier}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 9,
                        color: '#aaaacc',
                        lineHeight: 1.5,
                        marginTop: 2,
                      }}
                    >
                      {r.rule}
                    </div>
                    <div
                      style={{
                        fontSize: 9,
                        color: '#888860',
                        lineHeight: 1.5,
                        marginTop: 2,
                      }}
                    >
                      → {r.action}
                    </div>
                    <div
                      style={{
                        fontSize: 8,
                        color: '#6c6c88',
                        lineHeight: 1.4,
                        marginTop: 2,
                        fontStyle: 'italic',
                      }}
                    >
                      origin: {r.origin}
                    </div>
                  </div>
                ))}
                <div
                  style={{
                    fontSize: 8,
                    letterSpacing: 2,
                    color: '#7e7e9a',
                    margin: '10px 0 5px',
                  }}
                >
                  RULESET EVOLUTION
                </div>
                {RULE_EVOLUTION.map((e, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: 9,
                      color: '#7e7e9a',
                      lineHeight: 1.5,
                      marginBottom: 3,
                      paddingLeft: 4,
                    }}
                  >
                    <span style={{ color: '#a78bfa' }}>{e.date}</span> ·{' '}
                    {e.change}
                  </div>
                ))}
              </div>
            </details>
          </div>
        );
      })()}

      {/* Today's Prescription — live targets + autoregulation */}
      {(() => {
        const todayRec = recoveryLog[recoveryLog.length - 1];
        const lastSrpe = (() => {
          for (let i = 0; i < loggedSessions.length; i++) {
            if (loggedSessions[i].srpe != null) return loggedSessions[i].srpe;
          }
          return null;
        })();
        const fired = evaluateRules(todayRec, lastSrpe, latest.tsb);
        const readiness = calcReadiness(todayRec, latest.tsb);
        const auto = autoregulate(latest.tsb, readiness, fired);
        const t = deriveTargets(HR130_POWER);
        return (
          <div
            style={{
              background: `linear-gradient(135deg,${auto.color}12,#1e1e30)`,
              border: `1px solid ${auto.color}50`,
              borderRadius: 6,
              padding: '14px 16px',
              marginBottom: 16,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: 3,
                  color: auto.color,
                }}
              >
                TODAY'S PRESCRIPTION · AUTOREGULATED
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: auto.color,
                  letterSpacing: 1,
                }}
              >
                ● {auto.signal}
              </div>
            </div>
            <div
              style={{
                fontSize: 11,
                color: '#aaaacc',
                lineHeight: 1.6,
                marginBottom: 10,
              }}
            >
              {auto.guidance}
            </div>

            {/* Live-computed targets */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2,1fr)',
                gap: 8,
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  background: '#08080d',
                  borderRadius: 4,
                  padding: '9px 11px',
                }}
              >
                <div
                  style={{
                    fontSize: 8,
                    color: '#7e7e9a',
                    letterSpacing: 2,
                    marginBottom: 2,
                  }}
                >
                  UT1 TARGET (LIVE)
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: '#00d4ff',
                  }}
                >
                  {t.ut1Low}–{t.ut1High}W
                </div>
                <div
                  style={{
                    fontSize: 8,
                    color: '#6c6c88',
                    marginTop: 1,
                  }}
                >
                  pacer cue {t.pacerCue}W · HR 130
                </div>
              </div>
              <div
                style={{
                  background: '#08080d',
                  borderRadius: 4,
                  padding: '9px 11px',
                }}
              >
                <div
                  style={{
                    fontSize: 8,
                    color: '#7e7e9a',
                    letterSpacing: 2,
                    marginBottom: 2,
                  }}
                >
                  UT2 TARGET (LIVE)
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: '#34d399',
                  }}
                >
                  {t.ut2Low}–{t.ut2High}W
                </div>
                <div
                  style={{
                    fontSize: 8,
                    color: '#6c6c88',
                    marginTop: 1,
                  }}
                >
                  easy · HR &lt;125
                </div>
              </div>
            </div>
            <div style={{ fontSize: 8, color: '#6c6c88', lineHeight: 1.5 }}>
              Targets computed from {t.source}. Recompute automatically as new
              HR130 points land. ● {auto.signal} fuses TSB (
              {latest.tsb > 0 ? '+' : ''}
              {latest.tsb}), readiness, and fired rules.{' '}
              <span style={{ color: '#7e7e9a' }}>
                TSB rests on estimated CP until the test — direction meaningful,
                absolute soft.
              </span>
            </div>
          </div>
        );
      })()}

      {/* Training Load Chart */}
      <div
        style={{
          background: '#2a2a48',
          border: '1px solid #4a4a68',
          borderRadius: 6,
          padding: '14px 16px',
          marginBottom: 16,
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
          <div style={{ fontSize: 9, letterSpacing: 3, color: '#ff6b35' }}>
            TRAINING LOAD
          </div>
          <div style={{ fontSize: 9, color: '#6c6c88' }}>
            Est. FTP {ftp}W · update after threshold test
          </div>
        </div>

        {/* Current values */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3,1fr)',
            gap: 6,
            marginBottom: 12,
            marginTop: 8,
          }}
        >
          {[
            ['CTL', 'Fitness', latest.ctl, '#00d4ff'],
            ['ATL', 'Fatigue', latest.atl, '#ff6b35'],
            ['TSB', 'Form', (latest.tsb > 0 ? '+' : '') + latest.tsb, tsbColor],
          ].map(([k, sub, v, c]) => (
            <div
              key={k}
              style={{
                background: '#08080d',
                borderRadius: 4,
                padding: '8px 10px',
              }}
            >
              <div
                style={{
                  fontSize: 8,
                  color: '#7e7e9a',
                  letterSpacing: 2,
                }}
              >
                {k} <span style={{ color: '#5a5a74' }}>{sub}</span>
              </div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: c,
                  marginTop: 2,
                }}
              >
                {v}
              </div>
            </div>
          ))}
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={160}>
          <LineChart
            data={loadData}
            margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
          >
            <XAxis
              dataKey="date"
              tick={{
                fontSize: 8,
                fill: '#7e7e9a',
                fontFamily: "'DM Mono',monospace",
              }}
              axisLine={false}
              tickLine={false}
              interval={Math.floor(loadData.length / 5)}
            />
            <YAxis
              tick={{
                fontSize: 8,
                fill: '#7e7e9a',
                fontFamily: "'DM Mono',monospace",
              }}
              axisLine={false}
              tickLine={false}
              width={28}
            />
            <Tooltip content={<LoadTooltip />} />
            <ReferenceLine y={0} stroke="#4a4a68" strokeDasharray="2 2" />
            <Line
              type="monotone"
              dataKey="ctl"
              stroke="#00d4ff"
              strokeWidth={2}
              dot={false}
              name="CTL"
            />
            <Line
              type="monotone"
              dataKey="atl"
              stroke="#ff6b35"
              strokeWidth={2}
              dot={false}
              name="ATL"
            />
            <Line
              type="monotone"
              dataKey="tsb"
              stroke={tsbColor}
              strokeWidth={1.5}
              dot={false}
              strokeDasharray="4 2"
              name="TSB"
            />
          </LineChart>
        </ResponsiveContainer>

        {/* TSB status */}
        <div
          style={{
            marginTop: 8,
            fontSize: 10,
            color: '#7e7e9a',
            lineHeight: 1.5,
          }}
        >
          {latest.tsb > 10
            ? '✅ Fresh — good form, ready for hard sessions'
            : latest.tsb > -10
              ? '⚡ Neutral — balanced load and recovery'
              : latest.tsb > -30
                ? '⚠️ Fatigued — normal mid-week training load. Protect Thursday rest.'
                : "🔴 High fatigue — rest day is critical. Don't add sessions."}
        </div>
        <div
          style={{
            marginTop: 6,
            fontSize: 9,
            color: '#5a5a74',
            lineHeight: 1.5,
          }}
        >
          CTL builds over 42 days — values will be underestimated until ~6 weeks
          of data. TSS calibrated to Est. FTP {ftp}W; update after first
          threshold session for accuracy.
        </div>
      </div>

      {/* Nutrition Status */}
      <div
        style={{
          background: '#2a2a48',
          border: '1px solid #4a4a68',
          borderRadius: 6,
          padding: '14px 16px',
          marginBottom: 16,
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
          <div style={{ fontSize: 9, letterSpacing: 3, color: '#ff2d55' }}>
            NUTRITION STATUS
          </div>
          <div style={{ fontSize: 9, color: '#6c6c88' }}>
            Share MacroFactor screenshot to update
          </div>
        </div>
        {nutritionLog
          .slice(-2)
          .reverse()
          .map((day, i) => {
            const t = NUTRITION_TARGETS[day.dayType];
            const calS = assessMacro(day.cal, t.cal);
            const proS = assessMacro(day.protein, t.protein);
            const fatS = assessMacro(day.fat, t.fat);
            const carS = assessMacro(day.carbs, t.carbs);
            const isToday = i === 0;
            return (
              <div
                key={day.date}
                style={{
                  marginBottom: 8,
                  padding: '10px 12px',
                  background: isToday ? '#1e1e30' : '#08080d',
                  borderRadius: 4,
                  border: `1px solid ${isToday ? '#ff2d5530' : '#3e3e5a'}`,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: 8,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#fff',
                    }}
                  >
                    {day.date}
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      color: '#7e7e9a',
                      letterSpacing: 1,
                    }}
                  >
                    {day.dayType === 'two-a-day'
                      ? 'TWO-A-DAY'
                      : day.dayType === 'training'
                        ? 'TRAINING'
                        : 'REST'}
                  </span>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4,1fr)',
                    gap: 4,
                  }}
                >
                  {[
                    ['CAL', day.cal, `${t.cal[0]}–${t.cal[1]}`, calS],
                    [
                      'PRO',
                      `${day.protein}g`,
                      `${t.protein[0]}–${t.protein[1]}g`,
                      proS,
                    ],
                    ['FAT', `${day.fat}g`, `${t.fat[0]}–${t.fat[1]}g`, fatS],
                    [
                      'CARB',
                      `${day.carbs}g`,
                      `${t.carbs[0]}–${t.carbs[1]}g`,
                      carS,
                    ],
                  ].map(([label, val, target, status]) => (
                    <div
                      key={label}
                      style={{
                        background: '#2a2a48',
                        borderRadius: 3,
                        padding: '6px 6px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: 8,
                          color: '#7e7e9a',
                          letterSpacing: 1,
                          marginBottom: 2,
                        }}
                      >
                        {label}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: macroColor(status),
                        }}
                      >
                        {val}
                      </div>
                      <div
                        style={{
                          fontSize: 8,
                          color: '#5a5a74',
                          marginTop: 1,
                        }}
                      >
                        {target}
                      </div>
                      <div style={{ fontSize: 10, marginTop: 1 }}>{status}</div>
                    </div>
                  ))}
                </div>
                {day.burn &&
                  (() => {
                    const net = day.cal - day.burn;
                    const netColor =
                      Math.abs(net) <= 300
                        ? '#ffd700'
                        : net < 0
                          ? '#34d399'
                          : '#ff6b35';
                    return (
                      <div
                        style={{
                          marginTop: 8,
                          paddingTop: 8,
                          borderTop: '1px solid #3e3e5a',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span style={{ fontSize: 9, color: '#7e7e9a' }}>
                          Intake {day.cal} − burn ~{day.burn} (±15%)
                        </span>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: netColor,
                          }}
                        >
                          {net > 0 ? '+' : ''}
                          {net}{' '}
                          <span style={{ fontSize: 9, color: '#7e7e9a' }}>
                            {Math.abs(net) <= 300
                              ? '~maintenance'
                              : net < 0
                                ? 'deficit'
                                : 'surplus'}
                          </span>
                        </span>
                      </div>
                    );
                  })()}
              </div>
            );
          })}
        <div
          style={{
            fontSize: 10,
            color: '#7e7e9a',
            lineHeight: 1.6,
            borderTop: '1px solid #3e3e5a',
            paddingTop: 10,
          }}
        >
          ✅ <span style={{ color: '#34d399' }}>Expenditure confirmed:</span>{' '}
          Fitbit device data (2,650–4,050/day) matches the bottom-up model
          (~3,140 avg) — two independent methods agree. MacroFactor's 1,948
          estimate is ~1,200 kcal low. Eat at maintenance during calibration,
          then 0.3kg/week deficit (~2,800/day avg). Protein 190g constant.
        </div>
        <div
          style={{
            fontSize: 10,
            color: '#7e7e9a',
            lineHeight: 1.6,
            borderTop: '1px solid #3e3e5a',
            paddingTop: 10,
            marginTop: 2,
          }}
        >
          📅 <span style={{ color: '#00d4ff' }}>Tracking cadence:</span> Daily
          CSVs through calibration (~to Jun 24) while baselines set — RHR, HRV,
          sleep, TDEE, Z2 power. After that, switch CSV export to week-view and
          share weekly (Sun review prompt set). Daily detail is for calibration,
          not forever.
        </div>
      </div>

      <div
        style={{
          fontSize: 9,
          letterSpacing: 3,
          color: '#7e7e9a',
          marginBottom: 8,
        }}
      >
        RECENT SESSIONS
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          marginBottom: 16,
        }}
      >
        {loggedSessions.slice(0, 4).map((entry, i) => (
          <LogEntry key={`${entry.date}-${entry.label}-${i}`} entry={entry} />
        ))}
      </div>

      {/* Sequencing rules */}
      <div
        style={{
          background: '#2a2a48',
          border: '1px solid #4a4a68',
          borderRadius: 6,
          padding: '14px 16px',
        }}
      >
        <div
          style={{
            fontSize: 9,
            letterSpacing: 3,
            color: '#34d399',
            marginBottom: 10,
          }}
        >
          SEQUENCING RULES
        </div>
        {[
          ['✅', 'Upper strength + any erg session — same day fine'],
          ['✅', 'Z2 erg AM → lower strength PM (6hr gap)'],
          ['⚠️', 'Lower strength → Z2 erg next morning — OK'],
          ['❌', 'Hard erg + lower strength — same day'],
          ['❌', 'Hard erg + lower strength — adjacent days'],
          ['❌', 'Leg accessories in upper sessions'],
          [
            '📝',
            'Report sRPE (1–10) with every session — UT2 should feel 3–4, UT1 5–6',
          ],
          [
            '🚴',
            'Occasional bike ride = valid UT2 substitute (variability protects against overuse)',
          ],
        ].map(([icon, rule]) => (
          <div
            key={rule}
            style={{
              display: 'flex',
              gap: 10,
              marginBottom: 6,
              fontSize: 11,
              color: '#aaaacc',
              lineHeight: 1.5,
            }}
          >
            <span style={{ flexShrink: 0 }}>{icon}</span>
            <span>{rule}</span>
          </div>
        ))}
      </div>
    </>
  );
}
