import React from 'react';

export default function LoadTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const tsbColor =
    d.tsb > 10
      ? '#34d399'
      : d.tsb > -10
        ? '#ffd700'
        : d.tsb > -30
          ? '#ff6b35'
          : '#ff2d55';
  return (
    <div
      style={{
        background: '#2a2a48',
        border: '1px solid #4a4a68',
        borderRadius: 6,
        padding: '10px 12px',
        fontSize: 11,
        fontFamily: "'DM Mono',monospace",
        minWidth: 140,
      }}
    >
      <div
        style={{
          color: '#7e7e9a',
          marginBottom: 6,
          fontSize: 9,
          letterSpacing: 2,
        }}
      >
        {d.date}
        {d.note ? ` · ${d.note}` : ''}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div>
          <span style={{ color: '#00d4ff' }}>CTL </span>
          <span style={{ color: '#fff', fontWeight: 700 }}>{d.ctl}</span>
        </div>
        <div>
          <span style={{ color: '#ff6b35' }}>ATL </span>
          <span style={{ color: '#fff', fontWeight: 700 }}>{d.atl}</span>
        </div>
        <div>
          <span style={{ color: tsbColor }}>TSB </span>
          <span style={{ color: tsbColor, fontWeight: 700 }}>
            {d.tsb > 0 ? '+' : ''}
            {d.tsb}
          </span>
        </div>
        {d.tss > 0 && (
          <div
            style={{
              borderTop: '1px solid #4a4a68',
              paddingTop: 3,
              marginTop: 3,
            }}
          >
            <span style={{ color: '#7e7e9a' }}>TSS </span>
            <span style={{ color: '#aaaacc' }}>{d.tss}</span>
          </div>
        )}
      </div>
    </div>
  );
}
