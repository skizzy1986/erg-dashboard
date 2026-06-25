import React, { useMemo } from 'react';
import { useVitals } from '../../hooks/useVitals.js';
import { useTSSHistory } from '../../hooks/useTSSHistory.js';
import { calcTrainingLoad } from '../../utils/trainingLoad.js';
import { DAILY_TSS } from '../../constants/tssData.js';

const C = {
  bg: '#0a0a0f',
  panel: '#2a2a48',
  accent: '#34d399',
  text: '#e8e8f0',
  muted: '#7e7e9a',
  err: '#ff2d55',
};

export default function MobileRecovery() {
  const { isLoading, latest, readinessScore, readinessLabel } = useVitals();
  const { data: tssHistory } = useTSSHistory();
  const tssSource = tssHistory?.length ? tssHistory : DAILY_TSS;
  const loadData = useMemo(() => calcTrainingLoad(tssSource), [tssSource]);
  const tsbValue = loadData[loadData.length - 1]?.tsb ?? 0;

  const todayStr = new Date().toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  const readinessColor =
    readinessScore >= 80
      ? '#34d399'
      : readinessScore >= 60
        ? '#ffd700'
        : '#ff2d55';

  const coachingText =
    readinessLabel === 'READY'
      ? 'Train as planned'
      : readinessLabel === 'CAUTION'
        ? 'Train but monitor closely'
        : 'Prioritise recovery today';

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
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: 2,
            color: C.accent,
          }}
        >
          RECOVERY
        </span>
        <span style={{ fontSize: 11, color: C.muted }}>{todayStr}</span>
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

      {!isLoading && !latest && (
        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <div style={{ fontSize: 13, color: C.muted }}>
            No vitals recorded yet
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>
            Connect Garmin or Fitbit to populate this view
          </div>
        </div>
      )}

      {!isLoading && latest && (
        <>
          <div
            style={{
              background: C.panel,
              borderRadius: 12,
              padding: '20px',
              marginBottom: 12,
            }}
          >
            <div
              style={{
                fontSize: 52,
                fontWeight: 800,
                color: readinessColor,
                fontFamily: "'DM Mono', monospace",
                lineHeight: 1,
              }}
            >
              {readinessScore}
            </div>
            <div
              style={{
                fontSize: 9,
                letterSpacing: 2,
                color: C.muted,
                marginTop: 6,
              }}
            >
              READINESS
            </div>
            <div
              style={{
                fontSize: 12,
                color: readinessColor,
                marginTop: 6,
                fontWeight: 600,
              }}
            >
              {coachingText}
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 10,
              marginBottom: 16,
            }}
          >
            {(() => {
              const rhrDelta = (latest.rhr ?? 0) - 57;
              const rhrColor =
                rhrDelta > 5 ? '#ff2d55' : rhrDelta > 2 ? '#ffd700' : '#34d399';
              return (
                <div
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
                      marginBottom: 4,
                    }}
                  >
                    RESTING HR
                  </div>
                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 700,
                      color: rhrColor,
                    }}
                  >
                    {latest.rhr ?? '—'} bpm
                  </div>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>
                    {rhrDelta > 0
                      ? '↑ +' + rhrDelta
                      : rhrDelta < 0
                        ? '↓ ' + rhrDelta
                        : '='}{' '}
                    vs baseline
                  </div>
                </div>
              );
            })()}

            {(() => {
              const deficit = 30 - (latest.hrv ?? 0);
              const hrvColor =
                deficit < 3 ? '#34d399' : deficit < 8 ? '#ffd700' : '#ff2d55';
              return (
                <div
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
                      marginBottom: 4,
                    }}
                  >
                    HRV
                  </div>
                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 700,
                      color: hrvColor,
                    }}
                  >
                    {latest.hrv ?? '—'} ms
                  </div>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>
                    {latest.hrv >= 30
                      ? '↑ +' + (latest.hrv - 30)
                      : '↓ ' + (30 - latest.hrv)}{' '}
                    vs baseline
                  </div>
                </div>
              );
            })()}

            {(() => {
              const sleepColor =
                latest.sleep >= 7
                  ? '#34d399'
                  : latest.sleep >= 6.5
                    ? '#ffd700'
                    : '#ff2d55';
              return (
                <div
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
                      marginBottom: 4,
                    }}
                  >
                    SLEEP
                  </div>
                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 700,
                      color: sleepColor,
                    }}
                  >
                    {latest.sleep ?? '—'}h
                  </div>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>
                    {latest.sleep >= 7 ? 'Target met' : 'Below 7h target'}
                  </div>
                </div>
              );
            })()}

            {latest.sleep_score != null ? (
              <div
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
                    marginBottom: 4,
                  }}
                >
                  SLEEP SCORE
                </div>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 700,
                    color:
                      latest.sleep_score >= 80
                        ? '#34d399'
                        : latest.sleep_score >= 70
                          ? '#ffd700'
                          : '#ff2d55',
                  }}
                >
                  {latest.sleep_score}
                </div>
              </div>
            ) : (
              <div
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
                    marginBottom: 4,
                  }}
                >
                  FORM / TSB
                </div>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 700,
                    color:
                      tsbValue > 10
                        ? '#34d399'
                        : tsbValue > -10
                          ? '#ffd700'
                          : '#ff2d55',
                  }}
                >
                  {tsbValue.toFixed(1)}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
