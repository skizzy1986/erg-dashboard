import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import StrengthTooltip from '../components/StrengthTooltip.jsx';
import LogEntry from '../components/LogEntry.jsx';
import { THEME } from '../constants/theme.js';
import { alpha } from '../utils/themeCss.js';
import { FONT } from '../constants/type.js';
import { useLiftHistory } from '../hooks/useLiftHistory.js';

const statusStyle = {
  padding: '20px 0',
  textAlign: 'center',
  color: THEME.textDim,
  fontSize: 11,
};

function LiftTrend({ lifts, active, onSelect }) {
  const liftColor = THEME.accent;
  const series = lifts[active];
  const latest = series.slice(-1)[0];
  const diff = latest.e1rm - series[0].e1rm;

  return (
    <>
      {/* Lift selector */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          flexWrap: 'wrap',
          marginBottom: 12,
        }}
      >
        {Object.keys(lifts).map((lift) => (
          <button
            key={lift}
            onClick={() => onSelect(lift)}
            style={{
              background:
                active === lift ? alpha(liftColor, '20') : 'transparent',
              border:
                active === lift
                  ? `1px solid ${liftColor}`
                  : `1px solid ${THEME.border}`,
              color: active === lift ? liftColor : THEME.muted,
              borderRadius: 4,
              padding: '5px 10px',
              fontSize: 9,
              letterSpacing: 0.5,
              cursor: 'pointer',
              fontFamily: FONT.mono,
            }}
          >
            {lift}
          </button>
        ))}
      </div>

      <div
        style={{
          fontSize: 9,
          letterSpacing: 3,
          color: liftColor,
          marginBottom: 12,
        }}
      >
        {active.toUpperCase()} · e1RM (kg)
      </div>
      {series.length > 1 ? (
        <ResponsiveContainer width="100%" height={140}>
          <LineChart
            data={series}
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
              tickFormatter={(v) => `${v}kg`}
              axisLine={false}
              tickLine={false}
              width={42}
            />
            <Tooltip content={<StrengthTooltip />} />
            <Line
              type="monotone"
              dataKey="e1rm"
              stroke={liftColor}
              strokeWidth={2}
              dot={{
                r: 4,
                fill: liftColor,
                stroke: THEME.field,
                strokeWidth: 1,
              }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div style={statusStyle}>
          One data point — chart builds as sessions are logged
        </div>
      )}
      {/* Latest e1rm callout */}
      <div
        style={{
          marginTop: 10,
          display: 'flex',
          alignItems: 'baseline',
          gap: 8,
        }}
      >
        <span style={{ fontSize: 22, fontWeight: 700, color: liftColor }}>
          {latest.e1rm}kg
        </span>
        <span style={{ fontSize: 10, color: THEME.muted }}>
          current e1RM · {latest.date}
        </span>
        {series.length > 1 && (
          <span
            style={{
              fontSize: 10,
              color: diff >= 0 ? THEME.positive : THEME.muted,
            }}
          >
            {diff >= 0 ? '+' : ''}
            {diff.toFixed(1)}kg
          </span>
        )}
      </div>
    </>
  );
}

export default function StrengthView({ strengthSessions }) {
  const [activeLift, setActiveLift] = useState(null);
  const { data, isPending, isError } = useLiftHistory();

  let body;
  if (isPending) {
    body = <div style={statusStyle}>Loading strength history…</div>;
  } else if (isError) {
    body = <div style={statusStyle}>Strength history unavailable.</div>;
  } else if (data.setCount === 0) {
    body = <div style={statusStyle}>No strength sets logged yet.</div>;
  } else if (data.scoredCount === 0) {
    body = (
      <div style={statusStyle}>
        {data.setCount} sets logged — none with weight and reps to estimate
        e1RM.
      </div>
    );
  } else {
    const active = data.lifts[activeLift]
      ? activeLift
      : Object.keys(data.lifts)[0];
    body = (
      <LiftTrend lifts={data.lifts} active={active} onSelect={setActiveLift} />
    );
  }

  return (
    <>
      {/* e1RM chart */}
      <div
        style={{
          background: THEME.raised,
          border: `1px solid ${THEME.border}`,
          borderRadius: 6,
          padding: '14px 16px',
          marginBottom: 12,
        }}
      >
        {body}
      </div>

      {/* Strength session list */}
      <div
        style={{
          fontSize: 9,
          letterSpacing: 3,
          color: THEME.muted,
          marginBottom: 8,
        }}
      >
        STRENGTH SESSIONS
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {strengthSessions
          .slice()
          .reverse()
          .map((entry, i) => (
            <LogEntry key={i} entry={entry} />
          ))}
      </div>
    </>
  );
}
