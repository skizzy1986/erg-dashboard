import React from 'react';
import { THEME } from '../constants/theme.js';
import { FONT } from '../constants/type.js';

const SIZES = {
  large: { value: 52, label: 9, unit: 11, gap: 2 },
  normal: { value: 34, label: 9, unit: 10, gap: 1 },
  small: { value: 22, label: 8, unit: 9, gap: 1 },
};

export default function LiveMetric({
  label,
  value,
  unit,
  accent = THEME.accent,
  size = 'normal',
  dimmed = false,
}) {
  const s = SIZES[size] || SIZES.normal;
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: s.gap,
        opacity: dimmed ? 0.35 : 1,
      }}
    >
      <div
        style={{
          fontSize: s.label,
          letterSpacing: 2,
          color: THEME.muted,
          fontWeight: 600,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: s.value,
          fontFamily: FONT.mono,
          fontWeight: 700,
          color: accent,
          lineHeight: 1,
          letterSpacing: -1,
        }}
      >
        {value ?? '--'}
      </div>
      {unit && (
        <div
          style={{ fontSize: s.unit, color: THEME.border, letterSpacing: 1 }}
        >
          {unit}
        </div>
      )}
    </div>
  );
}
