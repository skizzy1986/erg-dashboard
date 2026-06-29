import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { std, mean } from 'mathjs';
import ErgTooltip from '../components/ErgTooltip.jsx';
import LogEntry from '../components/LogEntry.jsx';
import PaceTrendChart from '../components/PaceTrendChart.jsx';
import {
  CRITICAL_POWER,
  POWER_DURATION,
  FTP_TEST,
  CALIBRATION_STATUS,
  PACE_ZONES,
  HR130_POWER,
} from '../constants/trainingConfig.js';
import { formatPace } from '../utils/pace.js';
import { useErgSessions } from '../hooks/useErgSessions.js';

// ── ERG TREND DATA ─────────────────────────────────────────────
// workingPace in seconds/500m (excludes warmup split)
const ergTrend = [
  {
    date: '5/22',
    dist: '5k',
    pace: 147.9,
    watts: 110,
    label: '5k',
    hardPush: false,
  },
  {
    date: '5/24',
    dist: '5k',
    pace: 145.4,
    watts: 115,
    label: '5k',
    hardPush: false,
  },
  {
    date: '5/25',
    dist: '10k',
    pace: 130.4,
    watts: 163,
    label: '10k',
    hardPush: true,
  },
  {
    date: '6/4',
    dist: '10k',
    pace: 134.8,
    watts: 143,
    label: '10k',
    hardPush: false,
  },
  {
    date: '6/5',
    dist: '10k',
    pace: 125.1,
    watts: 181,
    label: '10k',
    hardPush: true,
  },
  {
    date: '6/6',
    dist: '10k',
    pace: 141.3,
    watts: 125,
    label: '10k',
    hardPush: false,
  },
  {
    date: '6/8',
    dist: '60m',
    pace: 136.2,
    watts: 134,
    label: '60m',
    hardPush: false,
  },
  {
    date: '6/9',
    dist: '30m',
    pace: 132.1,
    watts: 152,
    label: '30m',
    hardPush: false,
  },
  {
    date: '6/10',
    dist: '45m',
    pace: 134.1,
    watts: 145,
    label: '45m',
    hardPush: false,
  },
  {
    date: '6/12',
    dist: '45m',
    pace: 132.3,
    watts: 151,
    label: '45m',
    hardPush: false,
  },
  {
    date: '6/13',
    dist: '60m',
    pace: 132.5,
    watts: 150,
    label: '60m',
    hardPush: false,
  },
];

// ── BAROMETER REGRESSION (mathjs) ─────────────────────────────
function analyzeBarometer(points) {
  // Fit the CLEAN anchor points only (exclude flagged setup artifacts).
  const actual = points.filter((p) => p.type === 'actual' && !p.setupArtifact);
  if (actual.length < 3) return null; // not enough to fit honestly
  const epoch = new Date('2026/' + actual[0].date).getTime();
  const xs = actual.map(
    (p) => (new Date('2026/' + p.date).getTime() - epoch) / 86400000
  );
  const ys = actual.map((p) => p.watts);
  const n = xs.length;
  const mx = mean(xs),
    my = mean(ys);
  let num = 0,
    den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  const slope = den === 0 ? 0 : num / den; // W per day
  const intercept = my - slope * mx;
  const preds = xs.map((x) => slope * x + intercept);
  const ssRes = ys.reduce((s, y, i) => s + (y - preds[i]) ** 2, 0);
  const ssTot = ys.reduce((s, y) => s + (y - my) ** 2, 0);
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
  const residSd = n > 2 ? Math.sqrt(ssRes / (n - 2)) : 0; // residual std error = the noise floor
  // Plateau read: mean + spread of the clean anchors = the honest "current level"
  const currentLevel = Math.round(my);
  const spread = +std(ys).toFixed(1);
  // Interpret honestly: a slope only means something if the fit (R²) supports
  // it. Low R² with a tight spread = plateau, not a trend.
  let verdict;
  if (r2 < 0.5 || Math.abs(slope * 7) < 2)
    verdict =
      'PLATEAU — engine settled at ~' +
      currentLevel +
      'W (low R² + tight spread = a real repeatable level, not still climbing). Expected late-base; the gain is banked. Next real signal = end-of-base 5k.';
  else if (slope * 7 >= 2)
    verdict =
      'STILL RISING (~' +
      +(slope * 7).toFixed(1) +
      "W/wk) — but early gains decelerate; don't extrapolate linearly.";
  else
    verdict =
      'DIPPING — watch fatigue/consistency, recheck on a fresh clean anchor.';
  return {
    slopePerWeek: +(slope * 7).toFixed(1),
    r2: +r2.toFixed(2),
    residSd: +residSd.toFixed(1),
    spread,
    nPoints: n,
    currentLevel,
    verdict,
  };
}

const HR130_ANALYSIS = analyzeBarometer(HR130_POWER);

// Projection band for end of base (~12 weeks, early Sep). Conservative→optimistic.
const HR130_PROJECTION = {
  startWatts: 151, // current clean baseline (6/12)
  endLow: 165, // conservative end-of-base
  endHigh: 180, // optimistic end-of-base
  endDate: 'early Sep',
  note: 'Projection assumes consistent execution + sleep holding. Early-phase return gains slow over time. 4 clean points now (134→145→151→149 at HR130), incl. Strava-verified. We replace this with real data at the end-of-base 5k benchmark. Watch actual vs band.',
};

const card = {
  background: '#2a2a48',
  border: '1px solid #4a4a68',
  borderRadius: 6,
  padding: '14px 16px',
  marginBottom: 12,
};

const statCard = {
  background: '#08080d',
  borderRadius: 4,
  padding: '8px 9px',
};

const statLabel = {
  fontSize: 8,
  color: '#7e7e9a',
  letterSpacing: 2,
  marginBottom: 2,
};

function withinLast7Days(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  const cutoff = new Date(now.getTime() - 7 * 86400000);
  return d >= cutoff && d <= now;
}

export default function ErgView({ tsbNow, ctlNow }) {
  const [tidScope, setTidScope] = useState(30);
  const ergQuery = useErgSessions();
  const sessions = ergQuery.data ?? [];

  const hr130Now =
    [...HR130_POWER].filter((p) => !p.setupArtifact).pop()?.watts ?? null;
  const sessionsThisWeek = sessions.filter((s) =>
    withinLast7Days(s.date)
  ).length;
  const tsbColor =
    tsbNow > 5 ? '#34d399' : tsbNow >= -10 ? '#ffd700' : '#ff2d55';

  // SECTION 2 — pace improvement summary
  const paced = sessions.filter((s) => s.pace_500m != null);
  let paceSummary = null;
  if (paced.length >= 6) {
    const chrono = [...paced].reverse();
    const first3 = chrono.slice(0, 3);
    const last3 = chrono.slice(-3);
    const avg = (arr) => arr.reduce((a, s) => a + s.pace_500m, 0) / arr.length;
    const oldAvg = avg(first3);
    const newAvg = avg(last3);
    const delta = newAvg - oldAvg;
    paceSummary = { oldAvg, newAvg, delta };
  }

  // SECTION 4 — zone distribution
  const scoped = tidScope === 30 ? sessions.slice(0, 30) : sessions;
  const zoned = scoped.filter((s) => s.zone != null);
  const zoneCounts = ['UT2', 'UT1', 'AT', 'TR', 'AN']
    .map((z) => ({
      zone: z,
      count: zoned.filter((s) => s.zone === z).length,
      color: PACE_ZONES.find((p) => p.zone === z)?.color ?? '#666',
    }))
    .filter((z) => z.count > 0);
  const total = zoneCounts.reduce((acc, z) => acc + z.count, 0);

  return (
    <>
      {/* ── SECTION 1 · PERFORMANCE SUMMARY ── */}
      <div style={card}>
        <div
          style={{
            fontSize: 9,
            letterSpacing: 3,
            color: '#00d4ff',
            marginBottom: 10,
          }}
        >
          PERFORMANCE SUMMARY
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4,1fr)',
            gap: 6,
          }}
        >
          <div style={statCard}>
            <div style={statLabel}>FITNESS (CTL)</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#00d4ff' }}>
              {ctlNow != null ? Math.round(ctlNow) : '—'}
            </div>
          </div>
          <div style={statCard}>
            <div style={statLabel}>HR130 POWER</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#34d399' }}>
              {hr130Now != null ? `${hr130Now}W` : '—'}
            </div>
          </div>
          <div style={statCard}>
            <div style={statLabel}>SESSIONS / WK</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#a78bfa' }}>
              {sessionsThisWeek}
            </div>
          </div>
          <div style={statCard}>
            <div style={statLabel}>FORM (TSB)</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: tsbColor }}>
              {tsbNow != null ? tsbNow : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 2 · PACE ANALYTICS ── */}
      <div style={card}>
        <div
          style={{
            fontSize: 9,
            letterSpacing: 3,
            color: '#00d4ff',
            marginBottom: 4,
          }}
        >
          PACE ANALYTICS · /500m
        </div>
        <div style={{ fontSize: 9, color: '#6c6c88', marginBottom: 10 }}>
          Split per 500m from logged power. Lower = faster. Zone bands shaded.
        </div>
        <PaceTrendChart data={sessions} paceZones={PACE_ZONES} />
        <div
          style={{
            marginTop: 8,
            fontSize: 10,
            color: '#7e7e9a',
            lineHeight: 1.6,
          }}
        >
          {paceSummary ? (
            <>
              <span style={{ color: '#aaaacc' }}>First 3 → last 3: </span>
              {formatPace(paceSummary.oldAvg)} →{' '}
              {formatPace(paceSummary.newAvg)}{' '}
              <span
                style={{
                  color: paceSummary.delta < 0 ? '#34d399' : '#ff6b35',
                  fontWeight: 700,
                }}
              >
                ({paceSummary.delta < 0 ? '' : '+'}
                {paceSummary.delta.toFixed(1)}s
                {paceSummary.delta < 0 ? ' faster' : ' slower'})
              </span>
            </>
          ) : (
            'More sessions needed for trend analysis.'
          )}
        </div>
      </div>

      {/* ── SECTION 3 · POWER ANALYTICS ── */}
      <div
        style={{
          background: '#2a2a48',
          border: '1px solid #4a4a68',
          borderRadius: 6,
          padding: '14px 16px',
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontSize: 9,
            letterSpacing: 3,
            color: '#00d4ff',
            marginBottom: 4,
          }}
        >
          WORKING POWER TREND · WATTS
        </div>
        <div style={{ fontSize: 9, color: '#6c6c88', marginBottom: 10 }}>
          Drag-factor independent — true cross-session comparison. ● hard push ○
          Z2
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart
            data={ergTrend}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          >
            <XAxis
              dataKey="date"
              tick={{
                fontSize: 9,
                fill: '#7e7e9a',
                fontFamily: "'DM Mono',monospace",
              }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[110, 200]}
              tick={{
                fontSize: 9,
                fill: '#7e7e9a',
                fontFamily: "'DM Mono',monospace",
              }}
              tickFormatter={(v) => `${v}W`}
              axisLine={false}
              tickLine={false}
              width={38}
            />
            <Tooltip content={<ErgTooltip />} />
            <ReferenceLine
              y={150}
              stroke="#34d399"
              strokeDasharray="3 3"
              strokeOpacity={0.35}
              label={{
                value: 'Z2 top',
                position: 'insideTopRight',
                fontSize: 8,
                fill: '#34d399',
                fontFamily: "'DM Mono',monospace",
              }}
            />
            <ReferenceLine
              y={125}
              stroke="#00d4ff"
              strokeDasharray="3 3"
              strokeOpacity={0.35}
              label={{
                value: 'Z2 base',
                position: 'insideBottomRight',
                fontSize: 8,
                fill: '#00d4ff',
                fontFamily: "'DM Mono',monospace",
              }}
            />
            <Line
              type="monotone"
              dataKey="watts"
              stroke="#00d4ff"
              strokeWidth={2}
              dot={(props) => {
                const { cx, cy, payload } = props;
                return payload.hardPush ? (
                  <circle
                    key={cx}
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill="#00d4ff"
                    stroke="#08080d"
                    strokeWidth={1}
                  />
                ) : (
                  <circle
                    key={cx}
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill="#08080d"
                    stroke="#00d4ff"
                    strokeWidth={2}
                  />
                );
              }}
              activeDot={{ r: 5, fill: '#00d4ff' }}
            />
          </LineChart>
        </ResponsiveContainer>
        <div
          style={{
            marginTop: 8,
            fontSize: 9,
            color: '#7e7e9a',
            lineHeight: 1.5,
          }}
        >
          Z2 watt targets (DF 125, HR ceiling 136): UT1 working sessions
          143–150W (pacer 143–145W — bumped from 140 after 6/12 showed 151W at
          HR130), UT2 easy/FIFO 125–135W (pacer 130W). Set pacer on watts; let
          HR cap at 136. Engine is climbing — re-check targets weekly.
        </div>
      </div>

      {/* Power @ HR130 — key barometer + projection */}
      <div
        style={{
          background: '#2a2a48',
          border: '1px solid #34d39930',
          borderLeft: '3px solid #34d399',
          borderRadius: 6,
          padding: '14px 16px',
          marginBottom: 12,
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
          ⭐ POWER @ HR130 · KEY BAROMETER
        </div>
        <div style={{ fontSize: 9, color: '#6c6c88', marginBottom: 10 }}>
          The truest single fitness metric — watts at your HR130 anchor. Rising
          = engine growing. Actual vs end-of-base projection.
        </div>

        {/* Current + projection numbers */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3,1fr)',
            gap: 6,
            marginBottom: 12,
          }}
        >
          {[
            [
              'NOW',
              `${HR130_PROJECTION.startWatts}W`,
              '6/12 baseline',
              '#34d399',
            ],
            [
              'PROJECTED',
              `${HR130_PROJECTION.endLow}–${HR130_PROJECTION.endHigh}W`,
              HR130_PROJECTION.endDate,
              '#00d4ff',
            ],
            [
              'GAIN',
              `+${HR130_PROJECTION.endLow - HR130_PROJECTION.startWatts}–${HR130_PROJECTION.endHigh - HR130_PROJECTION.startWatts}W`,
              'over base',
              '#ffd700',
            ],
          ].map(([k, v, sub, c]) => (
            <div
              key={k}
              style={{
                background: '#08080d',
                borderRadius: 4,
                padding: '8px 9px',
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
                {k}
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: c }}>{v}</div>
              <div style={{ fontSize: 8, color: '#6c6c88', marginTop: 1 }}>
                {sub}
              </div>
            </div>
          ))}
        </div>

        {/* Mini chart of actuals */}
        <ResponsiveContainer width="100%" height={120}>
          <LineChart
            data={HR130_POWER}
            margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
          >
            <XAxis
              dataKey="date"
              tick={{
                fontSize: 9,
                fill: '#7e7e9a',
                fontFamily: "'DM Mono',monospace",
              }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[120, 185]}
              tick={{
                fontSize: 8,
                fill: '#7e7e9a',
                fontFamily: "'DM Mono',monospace",
              }}
              tickFormatter={(v) => `${v}W`}
              axisLine={false}
              tickLine={false}
              width={32}
            />
            <Tooltip
              contentStyle={{
                background: '#2a2a48',
                border: '1px solid #4a4a68',
                borderRadius: 6,
                fontSize: 11,
                fontFamily: "'DM Mono',monospace",
              }}
            />
            <ReferenceLine
              y={165}
              stroke="#00d4ff"
              strokeDasharray="3 3"
              strokeOpacity={0.3}
              label={{
                value: 'proj. low',
                position: 'insideTopRight',
                fontSize: 8,
                fill: '#00d4ff',
                fontFamily: "'DM Mono',monospace",
              }}
            />
            <ReferenceLine
              y={180}
              stroke="#00d4ff"
              strokeDasharray="3 3"
              strokeOpacity={0.3}
              label={{
                value: 'proj. high',
                position: 'insideTopRight',
                fontSize: 8,
                fill: '#00d4ff',
                fontFamily: "'DM Mono',monospace",
              }}
            />
            <Line
              type="monotone"
              dataKey="watts"
              stroke="#34d399"
              strokeWidth={2}
              dot={{
                r: 4,
                fill: '#34d399',
                stroke: '#08080d',
                strokeWidth: 1,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
        <div
          style={{
            fontSize: 9,
            color: '#7e7e9a',
            lineHeight: 1.5,
            marginTop: 8,
          }}
        >
          {HR130_PROJECTION.note}
        </div>

        {/* mathjs regression diagnostic */}
        {HR130_ANALYSIS && (
          <div
            style={{
              marginTop: 12,
              background: '#08080d',
              border: '1px solid #4a4a68',
              borderRadius: 5,
              padding: '11px 13px',
            }}
          >
            <div
              style={{
                fontSize: 8,
                letterSpacing: 2,
                color: '#a78bfa',
                marginBottom: 8,
              }}
            >
              ∑ TREND ANALYSIS (linear fit · clean anchors only)
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3,1fr)',
                gap: 6,
                marginBottom: 9,
              }}
            >
              {[
                [
                  'LEVEL',
                  `${HR130_ANALYSIS.currentLevel}W`,
                  `±${HR130_ANALYSIS.spread} spread`,
                ],
                [
                  'SLOPE',
                  `${HR130_ANALYSIS.slopePerWeek > 0 ? '+' : ''}${HR130_ANALYSIS.slopePerWeek}W/wk`,
                  `${HR130_ANALYSIS.nPoints} points`,
                ],
                [
                  'FIT R²',
                  `${HR130_ANALYSIS.r2}`,
                  HR130_ANALYSIS.r2 < 0.5 ? 'weak = noise' : 'meaningful',
                ],
              ].map(([k, v, sub]) => (
                <div
                  key={k}
                  style={{
                    background: '#2a2a48',
                    borderRadius: 4,
                    padding: '7px 8px',
                  }}
                >
                  <div
                    style={{
                      fontSize: 7,
                      color: '#7e7e9a',
                      letterSpacing: 1,
                      marginBottom: 2,
                    }}
                  >
                    {k}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: '#a78bfa',
                    }}
                  >
                    {v}
                  </div>
                  <div
                    style={{
                      fontSize: 7,
                      color: '#6c6c88',
                      marginTop: 1,
                    }}
                  >
                    {sub}
                  </div>
                </div>
              ))}
            </div>
            <div
              style={{
                fontSize: 10,
                color: '#aaaacc',
                lineHeight: 1.6,
                borderTop: '1px solid #3e3e5a',
                paddingTop: 8,
              }}
            >
              <span style={{ color: '#a78bfa', fontWeight: 700 }}>READ: </span>
              {HR130_ANALYSIS.verdict}
            </div>
            <div
              style={{
                fontSize: 8,
                color: '#6c6c88',
                lineHeight: 1.5,
                marginTop: 6,
              }}
            >
              Computed (mathjs least-squares) on the 4 clean HR130 anchors; the
              6/8 reading is excluded as a drag/strap setup artifact. We don't
              extrapolate the slope forward — early gains decelerate, so a
              linear projection would overstate. Real forward signal = the
              end-of-base 5k.
            </div>
          </div>
        )}
      </div>

      {/* ── SECTION 4 · ZONE DISTRIBUTION / TID ── */}
      <div style={card}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 10,
          }}
        >
          <div style={{ fontSize: 9, letterSpacing: 3, color: '#00d4ff' }}>
            ZONE DISTRIBUTION · TID
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {[
              [30, '30 sessions'],
              [Infinity, 'All'],
            ].map(([val, lbl]) => (
              <button
                key={lbl}
                onClick={() => setTidScope(val)}
                style={{
                  background: tidScope === val ? '#00d4ff' : '#08080d',
                  color: tidScope === val ? '#08080d' : '#7e7e9a',
                  border: '1px solid #4a4a68',
                  borderRadius: 4,
                  padding: '4px 9px',
                  fontSize: 9,
                  letterSpacing: 1,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>
        {total === 0 ? (
          <div style={{ fontSize: 10, color: '#7e7e9a', fontStyle: 'italic' }}>
            No zoned sessions yet.
          </div>
        ) : (
          <>
            <div
              style={{
                display: 'flex',
                height: 18,
                borderRadius: 4,
                overflow: 'hidden',
                marginBottom: 10,
              }}
            >
              {zoneCounts.map((z) => (
                <div
                  key={z.zone}
                  style={{
                    width: `${(z.count / total) * 100}%`,
                    background: z.color,
                  }}
                />
              ))}
            </div>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 10,
              }}
            >
              {zoneCounts.map((z) => (
                <div
                  key={z.zone}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: 10,
                    color: '#aaaacc',
                  }}
                >
                  <span
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: 2,
                      background: z.color,
                      display: 'inline-block',
                    }}
                  />
                  {z.zone} {z.count} · {Math.round((z.count / total) * 100)}%
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* CP Test plan */}
      <div
        style={{
          background: 'linear-gradient(135deg,#00d4ff15,#1e1e30)',
          border: '1px solid #00d4ff50',
          borderRadius: 6,
          padding: '14px 16px',
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontSize: 9,
            letterSpacing: 3,
            color: '#00d4ff',
            marginBottom: 6,
          }}
        >
          ⏱️ CRITICAL POWER TEST · HIGHEST-VALUE CALIBRATION
        </div>
        <div
          style={{
            fontSize: 11,
            color: '#aaaacc',
            lineHeight: 1.6,
            marginBottom: 8,
          }}
        >
          <span style={{ color: '#00d4ff' }}>When: </span>
          {FTP_TEST.when}
        </div>
        <div
          style={{
            fontSize: 10,
            color: '#aaaacc',
            lineHeight: 1.6,
            marginBottom: 6,
          }}
        >
          <span style={{ color: '#00d4ff' }}>Protocol: </span>
          {FTP_TEST.protocol}
        </div>
        <div
          style={{
            fontSize: 10,
            color: '#aaaacc',
            lineHeight: 1.6,
            marginBottom: 6,
          }}
        >
          <span style={{ color: '#00d4ff' }}>Prereq: </span>
          {FTP_TEST.prereq}
        </div>
        <div
          style={{
            fontSize: 10,
            color: '#888860',
            lineHeight: 1.6,
            borderTop: '1px solid #3e3e5a',
            paddingTop: 8,
          }}
        >
          🔓 {FTP_TEST.unlocks}
        </div>
      </div>

      {/* Rowing metrics — power-duration curve */}
      <div
        style={{
          background: '#2a2a48',
          border: '1px solid #a78bfa30',
          borderLeft: '3px solid #a78bfa',
          borderRadius: 6,
          padding: '14px 16px',
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontSize: 9,
            letterSpacing: 3,
            color: '#a78bfa',
            marginBottom: 4,
          }}
        >
          ROWING METRICS · POWER–DURATION
        </div>
        <div
          style={{
            fontSize: 9,
            color: '#6c6c88',
            marginBottom: 10,
            lineHeight: 1.5,
          }}
        >
          Rowing-native model. Critical Power (CP) = the rowing FTP. W' =
          anaerobic reserve above CP (fuels 1-min/1k). 2k pace = the north star.
          FTP kept under the hood only for load (TSS) maths.
        </div>

        {/* CP / W' / north star */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3,1fr)',
            gap: 6,
            marginBottom: 12,
          }}
        >
          {[
            [
              'CRITICAL POWER',
              CRITICAL_POWER.cpEstimate + 'W',
              'est. — 30min test confirms',
              '#00d4ff',
            ],
            [
              "W' (anaerobic)",
              CRITICAL_POWER.wPrime ? CRITICAL_POWER.wPrime + 'J' : '—',
              'needs 1-min max',
              '#ff6b35',
            ],
            ['NORTH STAR', '2k pace', 'the race benchmark', '#ffd700'],
          ].map(([k, v, sub, c]) => (
            <div
              key={k}
              style={{
                background: '#08080d',
                borderRadius: 4,
                padding: '8px 9px',
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
                {k}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: c }}>{v}</div>
              <div style={{ fontSize: 8, color: '#6c6c88', marginTop: 1 }}>
                {sub}
              </div>
            </div>
          ))}
        </div>

        {/* Power-duration table */}
        <div
          style={{
            fontSize: 8,
            letterSpacing: 2,
            color: '#7e7e9a',
            marginBottom: 6,
          }}
        >
          YOUR 3 RACE FORMATS ON THE CURVE
        </div>
        {POWER_DURATION.map((p) => {
          const isTarget = ['1-min', '1000m', '5000m'].includes(p.format);
          return (
            <div
              key={p.format}
              style={{
                background: '#08080d',
                borderRadius: 3,
                padding: '8px 10px',
                marginBottom: 4,
                borderLeft: `2px solid ${isTarget ? '#a78bfa' : '#5a5a74'}`,
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
                    fontSize: 11,
                    fontWeight: 700,
                    color: isTarget ? '#a78bfa' : '#aaaacc',
                  }}
                >
                  {isTarget && '🎯 '}
                  {p.format}{' '}
                  <span style={{ fontSize: 9, color: '#7e7e9a' }}>{p.dur}</span>
                </span>
                <span style={{ fontSize: 11, color: '#e8e8f0' }}>
                  {p.actualW || p.predW}
                  <span style={{ fontSize: 8, color: '#7e7e9a' }}>
                    W {p.actualW ? 'tested' : 'est.'}
                  </span>
                </span>
              </div>
              <div style={{ fontSize: 9, color: '#7e7e9a', marginTop: 2 }}>
                {p.system} · feeds {p.feeds}
              </div>
            </div>
          );
        })}
        <div
          style={{
            fontSize: 9,
            color: '#7e7e9a',
            lineHeight: 1.6,
            marginTop: 8,
            fontStyle: 'italic',
          }}
        >
          Predicted watts are rough estimates from current aerobic data — wide
          error bars on the short formats (no anaerobic data yet). Each tested
          format replaces an estimate and sharpens the curve. The curve's shape
          tells us whether you're aerobically or anaerobically biased — which
          shapes how we train the three formats.
        </div>
      </div>

      {/* Model calibration status */}
      <div
        style={{
          background: '#2a2a48',
          border: '1px solid #4a4a68',
          borderRadius: 6,
          padding: '14px 16px',
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontSize: 9,
            letterSpacing: 3,
            color: '#888860',
            marginBottom: 4,
          }}
        >
          MODEL CALIBRATION STATUS
        </div>
        <div
          style={{
            fontSize: 9,
            color: '#6c6c88',
            marginBottom: 12,
            lineHeight: 1.5,
          }}
        >
          Confidence tier per metric — so estimated numbers aren't read as
          measured. Upgrades as benchmarks land.
        </div>
        {[1, 2, 3].map((tier) => (
          <div key={tier} style={{ marginBottom: 10 }}>
            <div
              style={{
                fontSize: 8,
                letterSpacing: 2,
                color:
                  tier === 1 ? '#34d399' : tier === 2 ? '#ffd700' : '#ff6b35',
                marginBottom: 5,
              }}
            >
              TIER {tier} ·{' '}
              {tier === 1
                ? 'TRUST'
                : tier === 2
                  ? 'ESTIMATED — WIDE BARS'
                  : 'FRAGILE — SKEPTICISM'}
            </div>
            {CALIBRATION_STATUS.filter((c) => c.tier === tier).map((c) => (
              <div
                key={c.metric}
                style={{
                  background: '#08080d',
                  borderLeft: `2px solid ${c.color}`,
                  borderRadius: 3,
                  padding: '7px 10px',
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
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#e8e8f0',
                    }}
                  >
                    {c.metric}
                  </span>
                  <span style={{ fontSize: 9, color: c.color }}>{c.conf}</span>
                </div>
                <div
                  style={{
                    fontSize: 9,
                    color: '#7e7e9a',
                    lineHeight: 1.4,
                    marginTop: 2,
                  }}
                >
                  {c.basis}
                </div>
                {c.upgrade !== '—' && (
                  <div
                    style={{
                      fontSize: 9,
                      color: '#00d4ff99',
                      lineHeight: 1.4,
                      marginTop: 2,
                    }}
                  >
                    ↑ {c.upgrade}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
        <div
          style={{
            fontSize: 9,
            color: '#7e7e9a',
            lineHeight: 1.6,
            borderTop: '1px solid #3e3e5a',
            paddingTop: 10,
            fontStyle: 'italic',
          }}
        >
          Architecture is sound; calibration is young. Every benchmark replaces
          an estimate with a measurement. Calibration ends ~Jun 24; the model
          gets real teeth at the Sep 5k.
        </div>
      </div>

      {/* ── SECTION 5 · SESSION HISTORY ── */}
      <div
        style={{
          fontSize: 9,
          letterSpacing: 3,
          color: '#7e7e9a',
          marginBottom: 8,
        }}
      >
        ERG SESSIONS
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {sessions.map((s, i) => (
          <div key={s.id ?? `${s.date}-${s.label}-${i}`}>
            {s.pace_500m_str !== '—' && (
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: 1,
                  color: '#00d4ff',
                  marginBottom: 2,
                }}
              >
                {s.pace_500m_str}/500m{s.zone ? ` · ${s.zone}` : ''}
              </div>
            )}
            <LogEntry entry={{ ...s, _isErg: true }} />
          </div>
        ))}
      </div>
    </>
  );
}
