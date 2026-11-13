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
import { useBpReadings } from '../hooks/useBpReadings.js';
import { useLabResults } from '../hooks/useLabResults.js';
import { useInjuries } from '../hooks/useInjuries.js';
import HealthRecordCard from '../components/HealthRecordCard.jsx';
import {
  groupLabDraws,
  formatLabValue,
  formatLabRange,
  orderInjuries,
} from '../utils/healthRecords.js';
import { toLogDate, clockTime } from '../utils/dateFormat.js';
import { THEME } from '../constants/theme.js';
import { alpha } from '../utils/themeCss.js';
import { FONT } from '../constants/type.js';

const LIPID_SOURCES = [
  ...new Map(LIPID_REF.map((r) => [r.source.url, r.source])).values(),
];

const rowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  gap: 8,
  padding: '7px 0',
  borderBottom: `1px solid ${THEME.divider}`,
};

function RecordRow({ label, value, sub }) {
  return (
    <div style={{ borderBottom: `1px solid ${THEME.divider}` }}>
      <div style={{ ...rowStyle, borderBottom: 'none' }}>
        <span style={{ fontSize: 11, color: THEME.text }}>{label}</span>
        <span style={{ fontSize: 11, color: THEME.text, textAlign: 'right' }}>
          {value}
        </span>
      </div>
      {sub && (
        <div
          style={{
            fontSize: 10,
            color: THEME.muted,
            paddingBottom: 7,
            marginTop: -3,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

// The latest draw only; earlier draws stay in the table for a later trend view.
function LatestDraw({ draw }) {
  return (
    <>
      <div style={{ fontSize: 10, color: THEME.muted, margin: '4px 0' }}>
        Collected {toLogDate(draw.collectedOn)}
      </div>
      {draw.markers.map((m) => (
        <RecordRow
          key={m.id}
          label={m.marker}
          value={formatLabValue(m)}
          sub={[formatLabRange(m), m.note].filter(Boolean).join(' · ')}
        />
      ))}
    </>
  );
}

function bpRow(r) {
  const d = new Date(r.measured_at);
  const pulse = r.pulse_bpm != null ? ` · ${r.pulse_bpm} bpm` : '';
  const sub = [r.context, r.clean ? 'clean' : null].filter(Boolean).join(' · ');
  return (
    <RecordRow
      key={r.id}
      label={`${toLogDate(d)} ${clockTime(d)}`}
      value={`${r.sys_mmhg}/${r.dia_mmhg} mmHg${pulse}`}
      sub={sub}
    />
  );
}

function injuryRow(r) {
  const side = r.side ? ` (${r.side})` : '';
  const dates = [
    r.onset_on ? `since ${toLogDate(r.onset_on)}` : null,
    r.resolved_on ? `resolved ${toLogDate(r.resolved_on)}` : null,
  ];
  return (
    <RecordRow
      key={r.id}
      label={`${r.region}${side}`}
      value={r.status.toUpperCase()}
      sub={[...dates, r.note].filter(Boolean).join(' · ')}
    />
  );
}

function HealthSections() {
  const bp = useBpReadings();
  const labs = useLabResults();
  const injuries = useInjuries();
  const lipid = groupLabDraws(labs.rows, 'lipid')[0];
  const hormone = groupLabDraws(labs.rows, 'hormone')[0];
  return (
    <>
      <HealthRecordCard
        title="BLOOD PRESSURE"
        accent={THEME.critical}
        query={bp}
        isEmpty={bp.rows.length === 0}
        emptyText="No blood pressure readings yet."
      >
        {bp.rows.map(bpRow)}
      </HealthRecordCard>

      <HealthRecordCard
        title="BLOODS · LIPID PANEL"
        accent={THEME.accent}
        query={labs}
        isEmpty={!lipid}
        emptyText="No lipid results yet."
        footer={
          <>
            {LIPID_REF.map((m) => (
              <div key={m.marker} style={rowStyle}>
                <span style={{ fontSize: 11, color: m.color }}>{m.marker}</span>
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
          </>
        }
      >
        {lipid && <LatestDraw draw={lipid} />}
      </HealthRecordCard>

      <HealthRecordCard
        title="HORMONE PANEL"
        accent={THEME.accentAlt}
        query={labs}
        isEmpty={!hormone}
        emptyText="No hormone results yet."
      >
        {hormone && <LatestDraw draw={hormone} />}
      </HealthRecordCard>

      <HealthRecordCard
        title="INJURY WATCH"
        accent={THEME.warning}
        query={injuries}
        isEmpty={injuries.rows.length === 0}
        emptyText="No injuries logged yet."
      >
        {orderInjuries(injuries.rows).map(injuryRow)}
      </HealthRecordCard>
    </>
  );
}

// ── RECOVERY VIEW — HRV/RHR/sleep readiness + trends ──────────
// Daily readiness composite and vitals trend charts, then the health-record
// cards (bp_readings, lab_results, injuries) read from the DB. The health cards
// sit outside the vitals gate: a day with no vitals still shows them. Vitals come from
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
          </>
        );
      })()}
      <HealthSections />
    </>
  );
}
