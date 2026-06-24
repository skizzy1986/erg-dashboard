import React from 'react';

export default function StrengthTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div
      style={{
        background: '#2a2a48',
        border: '1px solid #4a4a68',
        borderRadius: 6,
        padding: '10px 12px',
        fontSize: 11,
        fontFamily: "'DM Mono',monospace",
      }}
    >
      <div
        style={{
          color: '#7e7e9a',
          marginBottom: 4,
          fontSize: 9,
          letterSpacing: 2,
        }}
      >
        {d.date}
      </div>
      <div style={{ color: payload[0].stroke, fontWeight: 700, fontSize: 14 }}>
        {d.e1rm}kg<span style={{ fontSize: 10, color: '#7e7e9a' }}> e1RM</span>
      </div>
    </div>
  );
}
