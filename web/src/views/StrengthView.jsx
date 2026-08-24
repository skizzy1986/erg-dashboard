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
import { STRENGTH_TEMPLATES, PREHAB_NOTE } from '../constants/exercises.js';
import { THEME } from '../constants/theme.js';
import { FONT } from '../constants/type.js';

const LIFT_COLOR = {
  'Back Squat': THEME.positive,
  'Romanian Deadlift': THEME.positive,
  'Bench Press': THEME.accentAlt,
  'Incline Bench': THEME.accentAlt,
  'Barbell Row': THEME.accent,
  'Lat Pulldown': THEME.accent,
  'Shoulder Press': THEME.accentAlt2,
};

export default function StrengthView({ strengthTrend, strengthSessions }) {
  const [activeLift, setActiveLift] = useState('Back Squat');
  const liftColor = LIFT_COLOR[activeLift] || THEME.accent;

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
        {Object.keys(strengthTrend).map((lift) => (
          <button
            key={lift}
            onClick={() => setActiveLift(lift)}
            style={{
              background:
                activeLift === lift ? `${LIFT_COLOR[lift]}20` : 'transparent',
              border:
                activeLift === lift
                  ? `1px solid ${LIFT_COLOR[lift]}`
                  : `1px solid ${THEME.border}`,
              color: activeLift === lift ? LIFT_COLOR[lift] : THEME.muted,
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
        <div
          style={{
            fontSize: 9,
            letterSpacing: 3,
            color: liftColor,
            marginBottom: 12,
          }}
        >
          {activeLift.toUpperCase()} · e1RM (kg)
        </div>
        {strengthTrend[activeLift].length > 1 ? (
          <ResponsiveContainer width="100%" height={140}>
            <LineChart
              data={strengthTrend[activeLift]}
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
          <div
            style={{
              padding: '20px 0',
              textAlign: 'center',
              color: THEME.textDim,
              fontSize: 11,
            }}
          >
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
            {strengthTrend[activeLift].slice(-1)[0].e1rm}kg
          </span>
          <span style={{ fontSize: 10, color: THEME.muted }}>
            current e1RM · {strengthTrend[activeLift].slice(-1)[0].date}
          </span>
          {strengthTrend[activeLift].length > 1 &&
            (() => {
              const first = strengthTrend[activeLift][0].e1rm;
              const last = strengthTrend[activeLift].slice(-1)[0].e1rm;
              const diff = (last - first).toFixed(1);
              return (
                <span style={{ fontSize: 10, color: THEME.positive }}>
                  +{diff}kg
                </span>
              );
            })()}
        </div>
      </div>

      {/* Strength session list */}
      {/* Saved Templates */}
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
            color: THEME.accentAlt,
            marginBottom: 4,
          }}
        >
          SAVED TEMPLATES · FITBOD
        </div>
        <div
          style={{
            fontSize: 9,
            color: THEME.textFaint,
            marginBottom: 12,
            lineHeight: 1.5,
          }}
        >
          Fixed workouts, low variability. Stops auto-generation inserting leg
          accessories or dropping pulls. Fitbod still suggests load progression.
        </div>
        {STRENGTH_TEMPLATES.map((t) => (
          <div
            key={t.name}
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
                marginBottom: 6,
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
              <span style={{ fontSize: 9, color: THEME.muted }}>{t.focus}</span>
            </div>
            {t.exercises.map((ex, i) => (
              <div
                key={i}
                style={{
                  fontSize: 11,
                  color: THEME.textSubtle,
                  lineHeight: 1.7,
                  paddingLeft: 4,
                }}
              >
                · {ex}
              </div>
            ))}
          </div>
        ))}
        <div
          style={{
            fontSize: 9,
            color: THEME.textFaint,
            lineHeight: 1.5,
            fontStyle: 'italic',
          }}
        >
          Weekly: Upper 1 + Lower 1 + Upper 2 + Lower 2. Pull:press bias
          maintained across the week. Squat heavy on Lower 1, explosive/light on
          Lower 2 (daily undulating).
        </div>
        <div
          style={{
            fontSize: 9,
            color: THEME.accentAlt2,
            lineHeight: 1.6,
            marginTop: 8,
            borderTop: `1px solid ${THEME.divider}`,
            paddingTop: 8,
          }}
        >
          💗 Prehab + Shoulder: {PREHAB_NOTE}
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
