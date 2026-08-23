import React from 'react';
import { THEME } from '../constants/theme.js';

export default function LoadTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const tsbColor =
    d.tsb > 10
      ? THEME.green
      : d.tsb > -10
        ? THEME.gold
        : d.tsb > -30
          ? THEME.orange
          : THEME.red;
  return (
    <div
      style={{
        background: THEME.raised,
        border: `1px solid ${THEME.border}`,
        borderRadius: 6,
        padding: '10px 12px',
        fontSize: 11,
        fontFamily: "'DM Mono',monospace",
        minWidth: 140,
      }}
    >
      <div
        style={{
          color: THEME.muted,
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
          <span style={{ color: THEME.cyan }}>CTL </span>
          <span style={{ color: THEME.white, fontWeight: 700 }}>{d.ctl}</span>
        </div>
        <div>
          <span style={{ color: THEME.orange }}>ATL </span>
          <span style={{ color: THEME.white, fontWeight: 700 }}>{d.atl}</span>
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
              borderTop: `1px solid ${THEME.border}`,
              paddingTop: 3,
              marginTop: 3,
            }}
          >
            <span style={{ color: THEME.muted }}>TSS </span>
            <span style={{ color: THEME.textSubtle }}>{d.tss}</span>
          </div>
        )}
      </div>
    </div>
  );
}
