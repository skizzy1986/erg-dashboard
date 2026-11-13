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
import ErgTooltip from '../components/ErgTooltip.jsx';
import LogEntry from '../components/LogEntry.jsx';
import PaceTrendChart from '../components/PaceTrendChart.jsx';
import { FTP_TEST, derivePaceZones } from '../constants/trainingConfig.js';
import {
  MIN_TREND_POINTS,
  workingPowerSeries,
  efficiencySeries,
  fitTrend,
  zoneGuides,
} from '../utils/ergTrend.js';
import { formatPace } from '../utils/pace.js';
import { toISODate } from '../utils/dateFormat.js';
import { useErgSessions } from '../hooks/useErgSessions.js';
import { useAnchors } from '../hooks/useAnchors.js';
import { THEME } from '../constants/theme.js';
import { alpha } from '../utils/themeCss.js';
import { tsbBand } from '../utils/trainingLoad.js';
import { FONT } from '../constants/type.js';

const card = {
  background: THEME.raised,
  border: `1px solid ${THEME.border}`,
  borderRadius: 6,
  padding: '14px 16px',
  marginBottom: 12,
};

const statCard = {
  background: THEME.field,
  borderRadius: 4,
  padding: '8px 9px',
};

const statLabel = {
  fontSize: 8,
  color: THEME.muted,
  letterSpacing: 2,
  marginBottom: 2,
};

const insufficient = {
  fontSize: 10,
  color: THEME.muted,
  fontStyle: 'italic',
};

function withinLast7Days(dateStr) {
  const iso = toISODate(dateStr);
  if (!iso) return false;
  const d = new Date(iso + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  const cutoff = new Date(now.getTime() - 7 * 86400000);
  return d >= cutoff && d <= now;
}

export default function ErgView({ tsbNow, ctlNow }) {
  const [tidScope, setTidScope] = useState(30);
  const ergQuery = useErgSessions();
  const sessions = ergQuery.data ?? [];
  // Live Critical Power from the anchors context store (no hardcoded fallback).
  const { cp, cpStatus, cpAvailable } = useAnchors();
  const paceZones = cpAvailable ? derivePaceZones(cp) : [];
  const power = workingPowerSeries(sessions);
  const eff = efficiencySeries(sessions);
  const effFit = fitTrend(eff.map((p) => ({ iso: p.iso, y: p.wpb })));
  const guides = zoneGuides(paceZones);
  const sessionsThisWeek = sessions.filter((s) =>
    withinLast7Days(s.date)
  ).length;
  // null (training-load read failed or empty) must not coerce to 0 and paint
  // an amber "neutral" — it is the absence of a reading, not a mid-range one.
  const tsbColor = THEME[tsbBand(tsbNow)?.token] ?? THEME.muted;

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
      color: paceZones.find((p) => p.zone === z)?.color ?? '#666',
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
            color: THEME.accent,
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
            <div style={{ fontSize: 15, fontWeight: 700, color: THEME.accent }}>
              {ctlNow != null ? Math.round(ctlNow) : '—'}
            </div>
          </div>
          <div style={statCard}>
            <div style={statLabel}>W / BPM</div>
            <div
              style={{ fontSize: 15, fontWeight: 700, color: THEME.positive }}
            >
              {eff.length ? eff.at(-1).wpb.toFixed(2) : '—'}
            </div>
          </div>
          <div style={statCard}>
            <div style={statLabel}>SESSIONS / WK</div>
            <div
              style={{ fontSize: 15, fontWeight: 700, color: THEME.accentAlt }}
            >
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
            color: THEME.accent,
            marginBottom: 4,
          }}
        >
          PACE ANALYTICS · /500m
        </div>
        <div style={{ fontSize: 9, color: THEME.textFaint, marginBottom: 10 }}>
          Split per 500m from logged power. Lower = faster. Zone bands shaded.
        </div>
        <PaceTrendChart data={sessions} paceZones={paceZones} />
        <div
          style={{
            marginTop: 8,
            fontSize: 10,
            color: THEME.muted,
            lineHeight: 1.6,
          }}
        >
          {paceSummary ? (
            <>
              <span style={{ color: THEME.textSubtle }}>
                First 3 → last 3:{' '}
              </span>
              {formatPace(paceSummary.oldAvg)} →{' '}
              {formatPace(paceSummary.newAvg)}{' '}
              <span
                style={{
                  color: paceSummary.delta < 0 ? THEME.positive : THEME.warning,
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
            color: THEME.accent,
            marginBottom: 4,
          }}
        >
          WORKING POWER TREND · WATTS
        </div>
        <div style={{ fontSize: 9, color: THEME.textFaint, marginBottom: 10 }}>
          Drag-factor independent — true cross-session comparison. ● hard push ○
          Z2
        </div>
        {power.length < MIN_TREND_POINTS ? (
          <div style={insufficient}>
            Insufficient data — {power.length} of {MIN_TREND_POINTS} sessions
            with power logged.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart
              data={power}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
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
                domain={['auto', 'auto']}
                tick={{
                  fontSize: 9,
                  fill: THEME.muted,
                  fontFamily: FONT.mono,
                }}
                tickFormatter={(v) => `${v}W`}
                axisLine={false}
                tickLine={false}
                width={38}
              />
              <Tooltip content={<ErgTooltip />} />
              {guides.map((g, i) => (
                <ReferenceLine
                  key={g.label}
                  y={g.y}
                  ifOverflow="extendDomain"
                  stroke={THEME.muted}
                  strokeDasharray="3 3"
                  strokeOpacity={0.5}
                  label={{
                    value: g.label,
                    position: i === 0 ? 'insideBottomRight' : 'insideTopRight',
                    fontSize: 8,
                    fill: THEME.muted,
                    fontFamily: FONT.mono,
                  }}
                />
              ))}
              <Line
                type="monotone"
                dataKey="watts"
                stroke={THEME.accent}
                strokeWidth={2}
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  return payload.hardPush ? (
                    <circle
                      key={cx}
                      cx={cx}
                      cy={cy}
                      r={4}
                      fill={THEME.accent}
                      stroke={THEME.field}
                      strokeWidth={1}
                    />
                  ) : (
                    <circle
                      key={cx}
                      cx={cx}
                      cy={cy}
                      r={4}
                      fill={THEME.field}
                      stroke={THEME.accent}
                      strokeWidth={2}
                    />
                  );
                }}
                activeDot={{ r: 5, fill: THEME.accent }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── AEROBIC EFFICIENCY ── */}
      <div
        style={{
          background: THEME.raised,
          border: `1px solid ${alpha(THEME.positive, '30')}`,
          borderLeft: `3px solid ${THEME.positive}`,
          borderRadius: 6,
          padding: '14px 16px',
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontSize: 9,
            letterSpacing: 3,
            color: THEME.positive,
            marginBottom: 4,
          }}
        >
          AEROBIC EFFICIENCY · W PER BEAT
        </div>
        <div style={{ fontSize: 9, color: THEME.textFaint, marginBottom: 10 }}>
          Average watts ÷ average heart rate per session. Rising = more power
          per beat.
        </div>
        {effFit == null ? (
          <div style={insufficient}>
            Insufficient data — {eff.length} of {MIN_TREND_POINTS} sessions with
            power and heart rate.
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3,1fr)',
              gap: 6,
            }}
          >
            {[
              ['LATEST', eff.at(-1).wpb.toFixed(2), 'newest session'],
              [
                'TREND',
                `${effFit.slopePerWeek >= 0 ? '+' : '−'}${Math.abs(effFit.slopePerWeek).toFixed(2)} /wk`,
                'least-squares slope',
              ],
              ['FIT', `r² ${effFit.r2.toFixed(2)}`, `n ${effFit.nPoints}`],
            ].map(([k, v, sub]) => (
              <div key={k} style={statCard}>
                <div style={statLabel}>{k}</div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: THEME.positive,
                  }}
                >
                  {v}
                </div>
                <div
                  style={{ fontSize: 8, color: THEME.textFaint, marginTop: 1 }}
                >
                  {sub}
                </div>
              </div>
            ))}
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
          <div style={{ fontSize: 9, letterSpacing: 3, color: THEME.accent }}>
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
                  background: tidScope === val ? THEME.accent : THEME.field,
                  color: tidScope === val ? THEME.field : THEME.muted,
                  border: `1px solid ${THEME.border}`,
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
          <div
            style={{ fontSize: 10, color: THEME.muted, fontStyle: 'italic' }}
          >
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
                    color: THEME.textSubtle,
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
          background: `linear-gradient(135deg,${alpha(THEME.accent, '15')},${THEME.surfaceAlt})`,
          border: `1px solid ${alpha(THEME.accent, '50')}`,
          borderRadius: 6,
          padding: '14px 16px',
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontSize: 9,
            letterSpacing: 3,
            color: THEME.accent,
            marginBottom: 6,
          }}
        >
          ⏱️ CRITICAL POWER TEST · HIGHEST-VALUE CALIBRATION
        </div>
        <div
          style={{
            fontSize: 11,
            color: THEME.textSubtle,
            lineHeight: 1.6,
            marginBottom: 8,
          }}
        >
          <span style={{ color: THEME.accent }}>When: </span>
          {FTP_TEST.when}
        </div>
        <div
          style={{
            fontSize: 10,
            color: THEME.textSubtle,
            lineHeight: 1.6,
            marginBottom: 6,
          }}
        >
          <span style={{ color: THEME.accent }}>Protocol: </span>
          {FTP_TEST.protocol}
        </div>
        <div
          style={{
            fontSize: 10,
            color: THEME.textSubtle,
            lineHeight: 1.6,
            marginBottom: 6,
          }}
        >
          <span style={{ color: THEME.accent }}>Prereq: </span>
          {FTP_TEST.prereq}
        </div>
        <div
          style={{
            fontSize: 10,
            color: THEME.muted,
            lineHeight: 1.6,
            borderTop: `1px solid ${THEME.divider}`,
            paddingTop: 8,
          }}
        >
          🔓 {FTP_TEST.unlocks}
        </div>
      </div>

      {/* Rowing metrics — critical power */}
      <div
        style={{
          background: THEME.raised,
          border: `1px solid ${alpha(THEME.accentAlt, '30')}`,
          borderLeft: `3px solid ${THEME.accentAlt}`,
          borderRadius: 6,
          padding: '14px 16px',
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontSize: 9,
            letterSpacing: 3,
            color: THEME.accentAlt,
            marginBottom: 10,
          }}
        >
          ROWING METRICS · CRITICAL POWER
        </div>
        <div
          style={{
            background: THEME.field,
            borderRadius: 4,
            padding: '8px 9px',
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
            CRITICAL POWER
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: THEME.accent }}>
            {cpAvailable ? cp + 'W' : 'CP unavailable'}
          </div>
          <div style={{ fontSize: 8, color: THEME.textFaint, marginTop: 1 }}>
            {cpAvailable ? cpStatus : 'anchor unreachable'}
          </div>
        </div>
      </div>

      {/* ── SECTION 5 · SESSION HISTORY ── */}
      <div
        style={{
          fontSize: 9,
          letterSpacing: 3,
          color: THEME.muted,
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
                  color: THEME.accent,
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
