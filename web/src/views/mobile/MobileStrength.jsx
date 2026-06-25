import React, { useState } from 'react';
import { useStrengthPRs } from '../../hooks/useStrengthPRs.js';
import StrengthLogger from '../../StrengthLogger.jsx';

const C = {
  bg: '#0a0a0f',
  panel: '#2a2a48',
  accent: '#34d399',
  text: '#e8e8f0',
  muted: '#7e7e9a',
};

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
        background: C.bg,
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
              color: '#a78bfa',
            }}
          >
            STRENGTH
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
            Personal Records
          </div>
        </div>
      </div>

      {isLoading && (
        <div
          style={{
            textAlign: 'center',
            color: C.muted,
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
            color: C.muted,
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
                background: C.panel,
                borderRadius: 10,
                padding: '14px',
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: 2,
                  color: C.muted,
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
                  color: '#a78bfa',
                  fontFamily: "'DM Mono', monospace",
                }}
              >
                {pr.best_e1rm_kg != null
                  ? pr.best_e1rm_kg.toFixed(1) + 'kg'
                  : '—'}
              </div>
              {pr.heaviest_kg != null && (
                <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>
                  Heaviest: {pr.heaviest_kg}kg
                </div>
              )}
              {pr.logged_sets != null && (
                <div style={{ fontSize: 9, color: '#4a4a68', marginTop: 2 }}>
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
          background: C.panel,
          border: '1px solid #4a4a68',
          borderRadius: 8,
          padding: '14px',
          color: '#a78bfa',
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
