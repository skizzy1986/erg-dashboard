import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { LIPID_REF } from '../constants/logs.js';
import { useVitals } from '../hooks/useVitals.js';
import { THEME } from '../constants/theme.js';
import { alpha } from '../utils/themeCss.js';
import { FONT } from '../constants/type.js';

const LIPID_SOURCES = [
  ...new Map(LIPID_REF.map((r) => [r.source.url, r.source])).values(),
];

function EmptyPanel({ children }) {
  return (
    <p
      style={{
        margin: 0,
        padding: '16px 0',
        textAlign: 'center',
        color: THEME.muted,
        fontSize: 13,
      }}
    >
      {children}
    </p>
  );
}

// ── RECOVERY VIEW — HRV/RHR/sleep readiness + trends ──────────
// Daily readiness composite, vitals trend charts, and placeholder panels for
// health records (their data arrives with a later DB slice). Vitals come from
// useVitals — they used to come from the static `recoveryLog` constant, so this
// screen showed June numbers while mobile showed today's. Baselines are the
// rolling personal ones, not two constants hand-set in June.
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
                border: `1px solid ${alpha(readiness.color, '40')}`,
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
                      fontFamily: FONT.mono,
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[rhrBaseline - 6, rhrBaseline + 8]}
                    tick={{
                      fontSize: 8,
                      fill: THEME.muted,
                      fontFamily: FONT.mono,
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
                      fontFamily: FONT.mono,
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
                      fontFamily: FONT.mono,
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
                  fontSize: 9,
                  letterSpacing: 3,
                  color: THEME.critical,
                  marginBottom: 4,
                }}
              >
                BLOOD PRESSURE
              </div>
              <EmptyPanel>No blood pressure readings yet.</EmptyPanel>
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
                  fontSize: 9,
                  letterSpacing: 3,
                  color: THEME.accent,
                  marginBottom: 4,
                }}
              >
                BLOODS · LIPID PANEL
              </div>
              <EmptyPanel>No lipid results yet.</EmptyPanel>
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
                    limit {m.target} {m.unit}
                  </span>
                </div>
              ))}
              <div
                style={{
                  fontSize: 10,
                  color: THEME.muted,
                  lineHeight: 1.6,
                  marginTop: 10,
                }}
              >
                Decision limits:{' '}
                {LIPID_SOURCES.map((s, i) => (
                  <span key={s.url}>
                    {i > 0 && ', '}
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: THEME.muted }}
                    >
                      {s.name}
                    </a>
                  </span>
                ))}
              </div>
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
                  fontSize: 9,
                  letterSpacing: 3,
                  color: THEME.accentAlt,
                  marginBottom: 4,
                }}
              >
                HORMONE PANEL
              </div>
              <EmptyPanel>No hormone results yet.</EmptyPanel>
            </div>

            {/* Injury Watch */}
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
                INJURY WATCH
              </div>
              <EmptyPanel>No injuries logged yet.</EmptyPanel>
            </div>
          </>
        );
      })()}
    </>
  );
}
