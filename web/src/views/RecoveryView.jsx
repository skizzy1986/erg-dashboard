import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  bpLog,
  bloodsLog,
  LIPID_REF,
  HORMONE_REF,
  NIGGLES,
} from '../constants/logs.js';
import { bpCategory } from '../utils/formatting.js';
import { useVitals } from '../hooks/useVitals.js';
import { THEME } from '../constants/theme.js';

// ── RECOVERY VIEW — HRV/RHR/sleep readiness + trends ──────────
// Daily readiness composite, vitals trend charts, blood-pressure log,
// and niggle/blood tracking. Vitals come from useVitals — they used to come
// from the static `recoveryLog` constant, so this screen showed June numbers
// while mobile showed today's. Baselines are the rolling personal ones, not
// two constants hand-set in June.
export default function RecoveryView({ isWide }) {
  const {
    latest: today,
    readiness,
    personalBaselines,
    vitalsHistory,
    hasPersonalBaselines,
    tsbNow,
    isLoading: vitalsPending,
  } = useVitals();
  const rhrBaseline = personalBaselines.rhrBaseline;
  const hrvBaseline = personalBaselines.hrvBaseline;
  // Labelled per metric: HRV coverage is far sparser than RHR, so one flag for
  // both would present the population default as the athlete's own average.
  const rhrNote = personalBaselines.rhrPersonal ? 'your avg' : 'default';
  const hrvNote = personalBaselines.hrvPersonal ? 'your avg' : 'default';
  return (
    <>
      {(() => {
        if (!today)
          return (
            <div
              style={{
                padding: '40px 0',
                textAlign: 'center',
                color: THEME.muted,
                fontSize: 13,
              }}
            >
              {vitalsPending ? 'Loading vitals…' : 'VITALS UNAVAILABLE'}
            </div>
          );
        return (
          <>
            {/* Readiness composite */}
            <div
              style={{
                background: THEME.raised,
                border: `1px solid ${readiness.color}40`,
                borderLeft: `3px solid ${readiness.color}`,
                borderRadius: 6,
                padding: '16px',
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 9,
                      letterSpacing: 3,
                      color: THEME.muted,
                      marginBottom: 4,
                    }}
                  >
                    READINESS · {today.date}
                  </div>
                  <div
                    style={{
                      fontSize: 32,
                      fontWeight: 700,
                      color: readiness.color,
                      letterSpacing: -1,
                    }}
                  >
                    {readiness.score == null ? '—' : readiness.score}
                    <span style={{ fontSize: 14, color: THEME.muted }}>
                      /100
                    </span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: readiness.color,
                      letterSpacing: 1,
                    }}
                  >
                    {readiness.status}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: THEME.muted,
                      marginTop: 4,
                      maxWidth: 140,
                      lineHeight: 1.4,
                    }}
                  >
                    {readiness.status === 'NO DATA'
                      ? 'No RHR reading — nothing to score'
                      : readiness.status === 'READY'
                        ? 'Train as planned'
                        : readiness.status === 'CAUTION'
                          ? 'Train but monitor — consider easing intensity'
                          : 'Prioritise recovery — reduce or rest'}
                  </div>
                </div>
              </div>
              <div
                style={{
                  marginTop: 12,
                  paddingTop: 12,
                  borderTop: `1px solid ${THEME.border}`,
                  fontSize: 10,
                  color: THEME.muted,
                  lineHeight: 1.5,
                }}
              >
                Composite of RHR vs baseline, HRV vs baseline, sleep, and
                training load (TSB{' '}
                {tsbNow == null
                  ? 'unavailable — excluded from this score'
                  : (tsbNow > 0 ? '+' : '') + tsbNow}
                ). Heuristic, not validated — cross-check against sRPE and how
                you actually feel.{' '}
                {hasPersonalBaselines
                  ? 'Baselines are your own rolling 28-day trimmed mean.'
                  : 'Fewer than 14 days of vitals, so population defaults are standing in for your baselines — treat the score as directional.'}
              </div>
            </div>

            {/* Current metrics */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${isWide ? 4 : 2},1fr)`,
                gap: 8,
                marginBottom: 12,
              }}
            >
              {[
                [
                  'RESTING HR',
                  `${today.rhr} bpm`,
                  `${rhrNote} ${rhrBaseline}`,
                  today.rhr <= rhrBaseline + 2
                    ? THEME.positive
                    : today.rhr <= rhrBaseline + 5
                      ? THEME.caution
                      : THEME.critical,
                ],
                [
                  'HRV',
                  today.hrv != null ? `${today.hrv} ms` : '—',
                  today.hrv != null
                    ? `${hrvNote} ${hrvBaseline}`
                    : 'needs overnight wear',
                  today.hrv == null
                    ? THEME.textFaint
                    : today.hrv >= hrvBaseline - 3
                      ? THEME.positive
                      : today.hrv >= hrvBaseline - 8
                        ? THEME.caution
                        : THEME.critical,
                ],
                [
                  'SLEEP',
                  today.sleep != null ? `${today.sleep}h` : '—',
                  today.sleep != null ? `target 7h+` : 'needs overnight wear',
                  today.sleep == null
                    ? THEME.textFaint
                    : today.sleep >= 7
                      ? THEME.positive
                      : today.sleep >= 6.5
                        ? THEME.caution
                        : THEME.critical,
                ],
                [
                  'SLEEP SCORE',
                  today.sleepScore != null ? `${today.sleepScore}` : '—',
                  `Fitbit`,
                  today.sleepScore == null
                    ? THEME.textFaint
                    : today.sleepScore >= 80
                      ? THEME.positive
                      : today.sleepScore >= 70
                        ? THEME.caution
                        : THEME.critical,
                ],
              ].map(([k, v, sub, c]) => (
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
                      letterSpacing: 2,
                      marginBottom: 4,
                    }}
                  >
                    {k}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: c }}>
                    {v}
                  </div>
                  <div
                    style={{
                      fontSize: 9,
                      color: THEME.textFaint,
                      marginTop: 2,
                    }}
                  >
                    {sub}
                  </div>
                </div>
              ))}
            </div>

            {/* RHR trend */}
            <div
              style={{
                background: THEME.raised,
                border: `1px solid ${THEME.border}`,
                borderRadius: 6,
                padding: '14px 16px',
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: 3,
                  color: THEME.warning,
                  marginBottom: 12,
                }}
              >
                RESTING HR TREND
              </div>
              <ResponsiveContainer width="100%" height={150}>
                <LineChart
                  data={vitalsHistory}
                  margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                >
                  <XAxis
                    dataKey="date"
                    tick={{
                      fontSize: 9,
                      fill: THEME.muted,
                      fontFamily: "'DM Mono',monospace",
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[rhrBaseline - 6, rhrBaseline + 8]}
                    tick={{
                      fontSize: 8,
                      fill: THEME.muted,
                      fontFamily: "'DM Mono',monospace",
                    }}
                    axisLine={false}
                    tickLine={false}
                    width={26}
                  />
                  <Tooltip
                    contentStyle={{
                      background: THEME.raised,
                      border: `1px solid ${THEME.border}`,
                      borderRadius: 6,
                      fontSize: 11,
                      fontFamily: "'DM Mono',monospace",
                    }}
                  />
                  <ReferenceLine
                    y={rhrBaseline}
                    stroke={THEME.warning}
                    strokeDasharray="3 3"
                    strokeOpacity={0.4}
                    label={{
                      value: 'baseline',
                      position: 'insideTopRight',
                      fontSize: 8,
                      fill: THEME.warning,
                      fontFamily: "'DM Mono',monospace",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="rhr"
                    stroke={THEME.warning}
                    strokeWidth={2}
                    dot={{ r: 3, fill: THEME.warning }}
                    name="RHR"
                  />
                </LineChart>
              </ResponsiveContainer>
              <div style={{ marginTop: 8, fontSize: 9, color: THEME.muted }}>
                Lower is better. A rising trend over several days = accumulating
                fatigue. HRV trend builds as more nights are logged.
              </div>
            </div>

            {/* Sleep callout */}
            <div
              style={{
                background: THEME.raised,
                border: `1px solid ${THEME.critical}30`,
                borderLeft: `3px solid ${THEME.critical}`,
                borderRadius: 6,
                padding: '13px 16px',
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: 3,
                  color: THEME.critical,
                  marginBottom: 6,
                }}
              >
                SLEEP · PRIORITY FIX
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: THEME.textSubtle,
                  lineHeight: 1.6,
                }}
              >
                Last night:{' '}
                <span style={{ color: THEME.caution, fontWeight: 700 }}>
                  6h19m
                </span>{' '}
                (221 light / 57 deep / 96 REM). Bed 22:15 (good), but woke 05:05
                — short total. REM strong. Single short night, not a concern
                with HRV rebounding (25→33) — but sleep is the lever to protect
                hardest this week given home stress. Watch if the early wake
                repeats.
              </div>
            </div>

            {/* Data status note */}
            <div
              style={{
                background: THEME.surfaceAlt,
                border: `1px solid ${THEME.positive}30`,
                borderLeft: `3px solid ${THEME.positive}`,
                borderRadius: 6,
                padding: '11px 14px',
                fontSize: 11,
                color: THEME.muted,
                lineHeight: 1.6,
              }}
            >
              ✅ Overnight wear working — RHR, HRV, and sleep now logging. First
              HRV reading 32ms (provisional baseline 38, low side — consistent
              with current fatigue). RHR 58 is good, below baseline. Keep
              wearing overnight; baselines firm up over ~2 weeks and the
              readiness score becomes fully weighted.
            </div>

            {/* Blood Pressure */}
            <div
              style={{
                background: THEME.raised,
                border: `1px solid ${THEME.border}`,
                borderRadius: 6,
                padding: '14px 16px',
                marginTop: 12,
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
                    color: THEME.critical,
                  }}
                >
                  BLOOD PRESSURE
                </div>
                <div style={{ fontSize: 9, color: THEME.textFaint }}>
                  on 75mg irbesartan
                </div>
              </div>
              <div
                style={{
                  fontSize: 9,
                  color: THEME.muted,
                  marginBottom: 12,
                  lineHeight: 1.5,
                }}
              >
                Building a clean record for GP review (~36kg lost: 130→94kg).
                Best reading = AM, seated, 5min rest, pre-coffee, pre-training.
              </div>
              {bpLog
                .slice()
                .reverse()
                .map((b, i) => {
                  const cat = bpCategory(b.sys, b.dia);
                  return (
                    <div
                      key={i}
                      style={{
                        marginBottom: 8,
                        padding: '10px 12px',
                        background: THEME.field,
                        borderRadius: 4,
                        border: `1px solid ${b.clean ? THEME.border : `${THEME.textDim}20`}`,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <span
                            style={{
                              fontSize: 18,
                              fontWeight: 700,
                              color: cat.color,
                            }}
                          >
                            {b.sys}/{b.dia}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              color: THEME.muted,
                              marginLeft: 8,
                            }}
                          >
                            {b.pulse} bpm
                          </span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div
                            style={{
                              fontSize: 10,
                              color: cat.color,
                              fontWeight: 600,
                            }}
                          >
                            {cat.label}
                          </div>
                          <div style={{ fontSize: 9, color: THEME.textFaint }}>
                            {b.date} · {b.context}
                          </div>
                        </div>
                      </div>
                      {!b.clean && (
                        <div
                          style={{
                            fontSize: 9,
                            color: THEME.muted,
                            marginTop: 6,
                            fontStyle: 'italic',
                          }}
                        >
                          Not a clean resting reading — post-gym + coffee both
                          raise BP. True resting likely lower.
                        </div>
                      )}
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
                  marginTop: 4,
                }}
              >
                ⚠️ Do not change medication without your GP. A fortnight of
                clean morning readings + your weight loss is exactly the
                evidence for a supervised medication review. Heavy lifting:
                breathe through reps, no Valsalva/breath-holding under load.
              </div>
            </div>

            {/* Bloods / Cholesterol */}
            <div
              style={{
                background: THEME.raised,
                border: `1px solid ${THEME.border}`,
                borderRadius: 6,
                padding: '14px 16px',
                marginTop: 12,
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
                    color: THEME.accent,
                  }}
                >
                  BLOODS · LIPID PANEL
                </div>
                <div style={{ fontSize: 9, color: THEME.textFaint }}>
                  GP test pending
                </div>
              </div>
              <div
                style={{
                  fontSize: 9,
                  color: THEME.muted,
                  marginBottom: 12,
                  lineHeight: 1.5,
                }}
              >
                Fast 9–12h before the test (confirm with lab). Avoid a hard
                session the day before for the cleanest triglyceride reading —
                schedule it after a FIFO maintenance day.
              </div>
              {bloodsLog.length === 0 ? (
                <div>
                  {LIPID_REF.map((m) => (
                    <div
                      key={m.marker}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        padding: '7px 0',
                        borderBottom: `1px solid ${THEME.divider}`,
                      }}
                    >
                      <span style={{ fontSize: 11, color: m.color }}>
                        {m.marker}
                      </span>
                      <span style={{ fontSize: 10, color: THEME.muted }}>
                        target {m.target} {m.unit} ·{' '}
                        <span style={{ color: THEME.textFaint }}>pending</span>
                      </span>
                    </div>
                  ))}
                  <div
                    style={{
                      fontSize: 10,
                      color: THEME.muted,
                      lineHeight: 1.6,
                      marginTop: 10,
                      fontStyle: 'italic',
                    }}
                  >
                    Results populate here once your panel returns. Weight loss
                    of your magnitude usually lowers triglycerides and raises
                    HDL — strong supporting evidence alongside the BP record.
                  </div>
                </div>
              ) : (
                <div>{/* results render when populated */}</div>
              )}
            </div>

            {/* Hormone panel */}
            <div
              style={{
                background: THEME.raised,
                border: `1px solid ${THEME.border}`,
                borderRadius: 6,
                padding: '14px 16px',
                marginTop: 12,
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
                  HORMONE PANEL
                </div>
                <div style={{ fontSize: 9, color: THEME.textFaint }}>
                  via GP → endocrinologist
                </div>
              </div>
              <div
                style={{
                  fontSize: 9,
                  color: THEME.muted,
                  marginBottom: 12,
                  lineHeight: 1.5,
                }}
              >
                Morning, fasted, rested day (not post-session). Same draw as
                lipids if possible.
              </div>
              {HORMONE_REF.map((h) => (
                <div
                  key={h.marker}
                  style={{
                    padding: '7px 0',
                    borderBottom: `1px solid ${THEME.divider}`,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                    }}
                  >
                    <span style={{ fontSize: 11, color: THEME.accentAlt }}>
                      {h.marker}
                    </span>
                    <span style={{ fontSize: 9, color: THEME.textFaint }}>
                      pending
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 9,
                      color: THEME.muted,
                      lineHeight: 1.4,
                      marginTop: 2,
                    }}
                  >
                    {h.note}
                  </div>
                </div>
              ))}
              <div
                style={{
                  fontSize: 10,
                  color: THEME.muted,
                  lineHeight: 1.6,
                  borderTop: `1px solid ${THEME.divider}`,
                  paddingTop: 10,
                  marginTop: 6,
                }}
              >
                ⚠️{' '}
                <span style={{ color: THEME.accentAlt }}>
                  Ask GP for an endocrinologist referral
                </span>{' '}
                — prior testicular cancer + orchiectomy is a specific,
                clinically relevant reason to assess this properly. A single
                testicle often compensates fully, but it warrants checking. TRT,
                if ever appropriate, is a specialist decision based on confirmed
                low levels + symptoms — never self-directed. Be open with the
                doctor about your training load and goals.
              </div>
            </div>

            {/* Niggles / Injury Watch */}
            <div
              style={{
                background: THEME.raised,
                border: `1px solid ${THEME.border}`,
                borderRadius: 6,
                padding: '14px 16px',
                marginTop: 12,
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: 3,
                  color: THEME.warning,
                  marginBottom: 4,
                }}
              >
                NIGGLES · INJURY WATCH
              </div>
              <div
                style={{
                  fontSize: 9,
                  color: THEME.muted,
                  marginBottom: 12,
                  lineHeight: 1.5,
                }}
              >
                Tracked proactively. Professional guidance leads — this captures
                the plan, not replaces the physio.
              </div>
              {NIGGLES.map((n) => (
                <div
                  key={n.area}
                  style={{
                    marginBottom: 12,
                    paddingBottom: 12,
                    borderBottom: `1px solid ${THEME.divider}`,
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
                        color: THEME.text,
                      }}
                    >
                      {n.area}
                    </span>
                    <span
                      style={{
                        fontSize: 9,
                        color: n.color,
                        letterSpacing: 1,
                      }}
                    >
                      {n.status}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: THEME.textSubtle,
                      lineHeight: 1.6,
                      marginBottom: 5,
                    }}
                  >
                    {n.detail}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: n.color,
                      lineHeight: 1.5,
                    }}
                  >
                    👁 {n.watch}
                  </div>
                </div>
              ))}
            </div>
          </>
        );
      })()}
    </>
  );
}
