import React from 'react';
import { THEME } from '../constants/theme.js';
import { FONT } from '../constants/type.js';

export default function StrengthTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div
      style={{
        background: THEME.raised,
        border: `1px solid ${THEME.border}`,
        borderRadius: 6,
        padding: '10px 12px',
        fontSize: 11,
        fontFamily: FONT.mono,
      }}
    >
      <div
        style={{
          color: THEME.muted,
          marginBottom: 4,
          fontSize: 9,
          letterSpacing: 2,
        }}
      >
        {d.date}
      </div>
      <div style={{ color: payload[0].stroke, fontWeight: 700, fontSize: 14 }}>
        {d.e1rm}kg
        <span style={{ fontSize: 10, color: THEME.muted }}> e1RM</span>
      </div>
    </div>
  );
}
