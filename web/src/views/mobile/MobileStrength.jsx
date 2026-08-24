import React, { useState } from 'react';
import { useStrengthPRs } from '../../hooks/useStrengthPRs.js';
import StrengthLogger from '../../StrengthLogger.jsx';
import { THEME } from '../../constants/theme.js';
import { FONT } from '../../constants/type.js';

export default function MobileStrength() {
  const [showLogger, setShowLogger] = useState(false);
  const { data, isLoading } = useStrengthPRs();

  if (showLogger) {
    return <StrengthLogger />;
  }

  return (
    <div
      style={{
        padding: '16px 16px 24px',
        background: THEME.bg,
        minHeight: '100vh',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: 2,
              color: THEME.accentAlt,
            }}
          >
            STRENGTH
          </div>
          <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
            Personal Records
          </div>
        </div>
      </div>

      {isLoading && (
        <div
          style={{
            textAlign: 'center',
            color: THEME.muted,
            marginTop: 40,
            fontSize: 12,
          }}
        >
          Loading…
        </div>
      )}

      {!isLoading && (data ?? []).length === 0 && (
        <div
          style={{
            textAlign: 'center',
            color: THEME.muted,
            marginTop: 40,
            fontSize: 12,
          }}
        >
          No strength PRs yet — log your first session
        </div>
      )}

      {!isLoading && (data ?? []).length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 10,
            marginBottom: 20,
          }}
        >
          {data.map((pr) => (
            <div
              key={pr.exercise_name}
              style={{
                background: THEME.raised,
                borderRadius: 10,
                padding: '14px',
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: 2,
                  color: THEME.muted,
                  marginBottom: 6,
                  textTransform: 'uppercase',
                }}
              >
                {pr.exercise_name}
              </div>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: THEME.accentAlt,
                  fontFamily: FONT.mono,
                }}
              >
                {pr.best_e1rm_kg != null
                  ? pr.best_e1rm_kg.toFixed(1) + 'kg'
                  : '—'}
              </div>
              {pr.heaviest_kg != null && (
                <div style={{ fontSize: 10, color: THEME.muted, marginTop: 4 }}>
                  Heaviest: {pr.heaviest_kg}kg
                </div>
              )}
              {pr.logged_sets != null && (
                <div style={{ fontSize: 9, color: THEME.border, marginTop: 2 }}>
                  {pr.logged_sets} sets
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => setShowLogger(true)}
        style={{
          background: THEME.raised,
          border: `1px solid ${THEME.border}`,
          borderRadius: 8,
          padding: '14px',
          color: THEME.accentAlt,
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: 1,
          cursor: 'pointer',
          width: '100%',
          fontFamily: 'inherit',
        }}
      >
        OPEN STRENGTH LOGGER
      </button>
    </div>
  );
}
