import React from 'react';

function fmtPace(secs) {
  const m = Math.floor(secs / 60);
  const s = (secs % 60).toFixed(1).padStart(4, '0');
  return `${m}:${s}`;
}

export default function ErgTooltip({ active, payload }) {
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
        {d.date} · {d.dist}
      </div>
      <div style={{ color: '#00d4ff', fontWeight: 700, fontSize: 14 }}>
        {d.watts}W<span style={{ fontSize: 10, color: '#7e7e9a' }}> avg</span>
      </div>
      <div style={{ color: '#888', fontSize: 10, marginTop: 2 }}>
        {fmtPace(d.pace)}/500m{d.hardPush ? ' · hard push' : ' · Z2'}
      </div>
    </div>
  );
}
