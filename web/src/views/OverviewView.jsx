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
} from '../utils/analysis.js';
import { HR130_POWER } from '../constants/trainingConfig.js';
import { NUTRITION_TARGETS } from '../constants/nutrition.js';
import { PHASE_CONTEXT } from '../constants/schedule.js';
import { nutritionLog } from '../constants/logs.js';
import { useVitals } from '../hooks/useVitals.js';
import { useAnchors } from '../hooks/useAnchors.js';
import { ADAPTIVE_RULES, RULE_EVOLUTION } from '../constants/coaching.js';
import { THEME } from '../constants/theme.js';
import { alpha } from '../utils/themeCss.js';
import { FONT } from '../constants/type.js';

export default function OverviewView({
  latest,
  loadUnavailable,
  tsbColor,
  loadData,
  loggedSessions,
  latestErg,
  latestSquat,
  totalErgDist,
  totalSessions,
  isWide,
  nowTick,
}) {
  // `latest` is null when the training-load read fails or returns no sessions.
  // evaluateRules/autoregulate/calcReadiness all guard `tsb != null`, so the
  // rules engine degrades to "no TSB signal" rather than reading a fabricated 0.
  const tsbNow = latest?.tsb ?? null;
  // Vitals were read from the static `recoveryLog` constant here, so the home
  // screen scored readiness off June data. Same hook, same single readiness
  // definition, as RecoveryView and mobile.
  const { latest: todayRec, readiness, personalBaselines } = useVitals();
  // Was a hardcoded 190 threaded down from App.jsx. Load is measured against
  // the live rowing CP and bike FTP anchors, so a fixed 190 both drifted from
  // the real value and misdescribed the calculation.
  const { cp, ftp, cpAvailable } = useAnchors();
  return (
    <>
      {/* ── CONDENSED TODAY STATUS STRIP (live, mobile-first) ── */}
      {(() => {
        const t = getToday(getRosterMode(nowTick)); // roster auto-switches home/FIFO by date
        const lastSrpe = (() => {
          for (let i = 0; i < loggedSessions.length; i++) {
            if (loggedSessions[i].srpe != null) return loggedSessions[i].srpe;
          }
          return null;
        })();
        const fired = evaluateRules(
          todayRec,
          lastSrpe,
          tsbNow,
          personalBaselines
        );
        const sig = autoregulate(tsbNow, readiness, fired);
        const upcoming = getUpcomingSessions(nowTick, loggedSessions);
        return (
          <div
            style={{
              background: `linear-gradient(135deg,${THEME.surfaceAlt},${THEME.raised})`,
              border: `1px solid ${alpha(sig.color, '50')}`,
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
                    color: THEME.textStrong,
                  }}
                >
                  {t.dateStr}
                </div>
                <div
                  style={{
                    fontSize: 9,
                    color: THEME.muted,
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
                <div style={{ fontSize: 9, color: THEME.muted }}>
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
                            color: THEME.positive,
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
                          background: THEME.field,
                          borderRadius: 5,
                          padding: '10px 12px',
                          fontSize: 11,
                          color: THEME.textFaint,
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
                color: THEME.muted,
                letterSpacing: 2,
                marginBottom: 5,
              }}
            >
              UPCOMING
            </div>
            {upcoming.length === 0 ? (
              <div style={{ fontSize: 10, color: THEME.textFaint }}>
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
                const slotColor = i === 0 ? THEME.accent : THEME.neutralAccent;
                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '5px 0',
                      borderTop: i > 0 ? `1px solid ${THEME.divider}` : 'none',
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontSize: 10,
                          color: THEME.textSubtle,
                          lineHeight: 1.3,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {u.label}
                      </div>
                      <div style={{ fontSize: 8, color: THEME.textFaint }}>
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
                      color: THEME.positive,
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
                        borderTop:
                          i > 0 ? `1px solid ${THEME.divider}` : 'none',
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
                            color: THEME.positive,
                            fontSize: 10,
                            flexShrink: 0,
                          }}
                        >
                          ✓
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            color: THEME.positive,
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
                          <span style={{ fontSize: 8, color: THEME.muted }}>
                            sRPE {e.srpe}
                          </span>
                        )}
                        {e.prs > 0 && (
                          <span style={{ fontSize: 8, color: THEME.caution }}>
                            🏆{e.prs}
                          </span>
                        )}
                        <span style={{ fontSize: 9, color: THEME.muted }}>
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
          background: `linear-gradient(135deg,${alpha(THEME.accent, '15')},${THEME.surfaceAlt})`,
          border: `1px solid ${alpha(THEME.accent, '40')}`,
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
          <span style={{ fontSize: 13, fontWeight: 700, color: THEME.accent }}>
            {PHASE_CONTEXT.phaseLabel}
          </span>
          <span style={{ fontSize: 9, color: THEME.muted }}>
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
                background: p.active ? THEME.accent : THEME.raised,
                border: `1px solid ${p.active ? THEME.accent : THEME.border}`,
                borderRadius: 3,
                padding: '5px 4px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: 7,
                  fontWeight: 700,
                  color: p.active ? THEME.field : THEME.muted,
                  letterSpacing: 0.5,
                }}
              >
                {p.phase}
              </div>
              <div
                style={{
                  fontSize: 6,
                  color: p.active ? THEME.field : THEME.textFaint,
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
            color: THEME.textSubtle,
            lineHeight: 1.5,
            marginBottom: 5,
          }}
        >
          <span style={{ color: THEME.accent }}>Doing: </span>
          {PHASE_CONTEXT.doing}
        </div>
        <div
          style={{
            fontSize: 10,
            color: THEME.textSubtle,
            lineHeight: 1.5,
            marginBottom: 5,
          }}
        >
          <span style={{ color: THEME.accent }}>Why now: </span>
          {PHASE_CONTEXT.why}
        </div>
        <div
          style={{
            fontSize: 10,
            color: THEME.muted,
            lineHeight: 1.5,
            marginBottom: 5,
          }}
        >
          ⏸ {PHASE_CONTEXT.notYet}
        </div>
        <div
          style={{
            fontSize: 9,
            color: THEME.muted,
            lineHeight: 1.5,
            borderTop: `1px solid ${THEME.divider}`,
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
              background: THEME.raised,
              border: `1px solid ${THEME.border}`,
              borderRadius: 6,
              padding: '11px 13px',
            }}
          >
            <div
              style={{
                fontSize: 8,
                color: THEME.muted,
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
                color: THEME.textStrong,
                letterSpacing: -0.5,
              }}
            >
              {v}
            </div>
            <div style={{ fontSize: 9, color: THEME.textFaint, marginTop: 2 }}>
              {sub}
            </div>
          </div>
        ))}
      </div>

      {/* Adaptive Decision Engine */}
      {(() => {
        const lastSrpe = (() => {
          for (let i = 0; i < loggedSessions.length; i++) {
            if (loggedSessions[i].srpe != null) return loggedSessions[i].srpe;
          }
          return null;
        })();
        const fired = evaluateRules(
          todayRec,
          lastSrpe,
          tsbNow,
          personalBaselines
        );
        const consistency = checkConsistency(fired, false);
        return (
          <div
            style={{
              background: `linear-gradient(135deg,${alpha(THEME.accentAlt, '12')},${THEME.surfaceAlt})`,
              border: `1px solid ${alpha(THEME.accentAlt, '40')}`,
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
                  color: THEME.accentAlt,
                }}
              >
                ⚙️ ADAPTIVE ENGINE
              </div>
              <div style={{ fontSize: 8, color: THEME.muted }}>
                {ADAPTIVE_RULES.length} rules · evolving
              </div>
            </div>
            <div
              style={{
                fontSize: 9,
                color: THEME.muted,
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
                color: fired.length ? THEME.warning : THEME.positive,
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
                  background: THEME.field,
                  borderLeft: `2px solid ${THEME.warning}`,
                  borderRadius: 3,
                  padding: '7px 10px',
                  marginBottom: 4,
                }}
              >
                <span
                  style={{
                    fontSize: 9,
                    color: THEME.warning,
                    fontWeight: 700,
                  }}
                >
                  {f.id}{' '}
                </span>
                <span style={{ fontSize: 10, color: THEME.textSubtle }}>
                  {f.msg}
                </span>
              </div>
            ))}

            {consistency.conflict && (
              <div
                style={{
                  background:
                    'color-mix(in srgb, var(--color-critical) 12%, var(--color-bg))',
                  border: `1px solid ${alpha(THEME.critical, '50')}`,
                  borderRadius: 3,
                  padding: '7px 10px',
                  marginBottom: 4,
                  fontSize: 10,
                  color: THEME.critical,
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
                  color: THEME.accentAlt,
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
                      background: THEME.field,
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
                          color: THEME.text,
                        }}
                      >
                        {r.id} · {r.domain}
                      </span>
                      <span
                        style={{
                          fontSize: 8,
                          color: r.tier === 1 ? THEME.positive : THEME.caution,
                        }}
                      >
                        T{r.tier}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 9,
                        color: THEME.textSubtle,
                        lineHeight: 1.5,
                        marginTop: 2,
                      }}
                    >
                      {r.rule}
                    </div>
                    <div
                      style={{
                        fontSize: 9,
                        color: THEME.muted,
                        lineHeight: 1.5,
                        marginTop: 2,
                      }}
                    >
                      → {r.action}
                    </div>
                    <div
                      style={{
                        fontSize: 8,
                        color: THEME.textFaint,
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
                    color: THEME.muted,
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
                      color: THEME.muted,
                      lineHeight: 1.5,
                      marginBottom: 3,
                      paddingLeft: 4,
                    }}
                  >
                    <span style={{ color: THEME.accentAlt }}>{e.date}</span> ·{' '}
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
        const lastSrpe = (() => {
          for (let i = 0; i < loggedSessions.length; i++) {
            if (loggedSessions[i].srpe != null) return loggedSessions[i].srpe;
          }
          return null;
        })();
        const fired = evaluateRules(
          todayRec,
          lastSrpe,
          tsbNow,
          personalBaselines
        );
        const auto = autoregulate(tsbNow, readiness, fired);
        const t = deriveTargets(HR130_POWER);
        return (
          <div
            style={{
              background: `linear-gradient(135deg,${alpha(auto.color, '12')},${THEME.surfaceAlt})`,
              border: `1px solid ${alpha(auto.color, '50')}`,
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
                color: THEME.textSubtle,
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
                  background: THEME.field,
                  borderRadius: 4,
                  padding: '9px 11px',
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
                  UT1 TARGET (LIVE)
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: THEME.accent,
                  }}
                >
                  {t.ut1Low}–{t.ut1High}W
                </div>
                <div
                  style={{
                    fontSize: 8,
                    color: THEME.textFaint,
                    marginTop: 1,
                  }}
                >
                  pacer cue {t.pacerCue}W · HR 130
                </div>
              </div>
              <div
                style={{
                  background: THEME.field,
                  borderRadius: 4,
                  padding: '9px 11px',
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
                  UT2 TARGET (LIVE)
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: THEME.positive,
                  }}
                >
                  {t.ut2Low}–{t.ut2High}W
                </div>
                <div
                  style={{
                    fontSize: 8,
                    color: THEME.textFaint,
                    marginTop: 1,
                  }}
                >
                  easy · HR &lt;125
                </div>
              </div>
            </div>
            <div
              style={{ fontSize: 8, color: THEME.textFaint, lineHeight: 1.5 }}
            >
              Targets computed from {t.source}. Recompute automatically as new
              HR130 points land. ● {auto.signal} fuses TSB (
              {tsbNow == null
                ? 'unavailable'
                : (tsbNow > 0 ? '+' : '') + tsbNow}
              ), readiness, and fired rules.{' '}
              <span style={{ color: THEME.muted }}>
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
          background: THEME.raised,
          border: `1px solid ${THEME.border}`,
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
          <div style={{ fontSize: 9, letterSpacing: 3, color: THEME.warning }}>
            TRAINING LOAD
          </div>
          <div style={{ fontSize: 9, color: THEME.textFaint }}>
            {cpAvailable
              ? `Rowing CP ${cp}W · bike FTP ${ftp ?? '—'}W`
              : 'CP unavailable'}
          </div>
        </div>
        {loadUnavailable && (
          <div
            style={{
              fontSize: 9,
              letterSpacing: 2,
              color: THEME.muted,
              marginTop: 6,
            }}
          >
            TRAINING LOAD UNAVAILABLE
          </div>
        )}

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
            ['CTL', 'Fitness', latest ? latest.ctl : '—', THEME.accent],
            ['ATL', 'Fatigue', latest ? latest.atl : '—', THEME.warning],
            [
              'TSB',
              'Form',
              latest ? (latest.tsb > 0 ? '+' : '') + latest.tsb : '—',
              tsbColor,
            ],
          ].map(([k, sub, v, c]) => (
            <div
              key={k}
              style={{
                background: THEME.field,
                borderRadius: 4,
                padding: '8px 10px',
              }}
            >
              <div
                style={{
                  fontSize: 8,
                  color: THEME.muted,
                  letterSpacing: 2,
                }}
              >
                {k} <span style={{ color: THEME.textDim }}>{sub}</span>
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
                fill: THEME.muted,
                fontFamily: FONT.mono,
              }}
              axisLine={false}
              tickLine={false}
              interval={Math.floor(loadData.length / 5)}
            />
            <YAxis
              tick={{
                fontSize: 8,
                fill: THEME.muted,
                fontFamily: FONT.mono,
              }}
              axisLine={false}
              tickLine={false}
              width={28}
            />
            <Tooltip content={<LoadTooltip />} />
            <ReferenceLine y={0} stroke={THEME.border} strokeDasharray="2 2" />
            <Line
              type="monotone"
              dataKey="ctl"
              stroke={THEME.accent}
              strokeWidth={2}
              dot={false}
              name="CTL"
            />
            <Line
              type="monotone"
              dataKey="atl"
              stroke={THEME.warning}
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
            color: THEME.muted,
            lineHeight: 1.5,
          }}
        >
          {tsbNow == null
            ? 'No training-load reading — form status unknown.'
            : tsbNow > 10
              ? '✅ Fresh — good form, ready for hard sessions'
              : tsbNow > -10
                ? '⚡ Neutral — balanced load and recovery'
                : tsbNow > -30
                  ? '⚠️ Fatigued — normal mid-week training load. Protect Thursday rest.'
                  : "🔴 High fatigue — rest day is critical. Don't add sessions."}
        </div>
        <div
          style={{
            marginTop: 6,
            fontSize: 9,
            color: THEME.textDim,
            lineHeight: 1.5,
          }}
        >
          CTL builds over 42 days — values will be underestimated until ~6 weeks
          of data.{' '}
          {cpAvailable
            ? `Power-derived load is measured against rowing CP ${cp}W and bike FTP ${ftp ?? '—'}W; revalidate with a test to sharpen it.`
            : 'Power-derived load is unavailable while the CP anchor cannot be read.'}
        </div>
      </div>

      {/* Nutrition Status */}
      <div
        style={{
          background: THEME.raised,
          border: `1px solid ${THEME.border}`,
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
          <div style={{ fontSize: 9, letterSpacing: 3, color: THEME.critical }}>
            NUTRITION STATUS
          </div>
          <div style={{ fontSize: 9, color: THEME.textFaint }}>
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
                  background: isToday ? THEME.surfaceAlt : THEME.field,
                  borderRadius: 4,
                  border: `1px solid ${isToday ? alpha(THEME.critical, '30') : THEME.divider}`,
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
                      color: THEME.textStrong,
                    }}
                  >
                    {day.date}
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      color: THEME.muted,
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
                        background: THEME.raised,
                        borderRadius: 3,
                        padding: '6px 6px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: 8,
                          color: THEME.muted,
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
                          color: THEME.textDim,
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
                        ? THEME.caution
                        : net < 0
                          ? THEME.positive
                          : THEME.warning;
                    return (
                      <div
                        style={{
                          marginTop: 8,
                          paddingTop: 8,
                          borderTop: `1px solid ${THEME.divider}`,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span style={{ fontSize: 9, color: THEME.muted }}>
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
                          <span style={{ fontSize: 9, color: THEME.muted }}>
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
            color: THEME.muted,
            lineHeight: 1.6,
            borderTop: `1px solid ${THEME.divider}`,
            paddingTop: 10,
          }}
        >
          ✅{' '}
          <span style={{ color: THEME.positive }}>Expenditure confirmed:</span>{' '}
          Fitbit device data (2,650–4,050/day) matches the bottom-up model
          (~3,140 avg) — two independent methods agree. MacroFactor's 1,948
          estimate is ~1,200 kcal low. Eat at maintenance during calibration,
          then 0.3kg/week deficit (~2,800/day avg). Protein 190g constant.
        </div>
        <div
          style={{
            fontSize: 10,
            color: THEME.muted,
            lineHeight: 1.6,
            borderTop: `1px solid ${THEME.divider}`,
            paddingTop: 10,
            marginTop: 2,
          }}
        >
          📅 <span style={{ color: THEME.accent }}>Tracking cadence:</span>{' '}
          Daily CSVs through calibration (~to Jun 24) while baselines set — RHR,
          HRV, sleep, TDEE, Z2 power. After that, switch CSV export to week-view
          and share weekly (Sun review prompt set). Daily detail is for
          calibration, not forever.
        </div>
      </div>

      <div
        style={{
          fontSize: 9,
          letterSpacing: 3,
          color: THEME.muted,
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
          background: THEME.raised,
          border: `1px solid ${THEME.border}`,
          borderRadius: 6,
          padding: '14px 16px',
        }}
      >
        <div
          style={{
            fontSize: 9,
            letterSpacing: 3,
            color: THEME.positive,
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
              color: THEME.textSubtle,
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
