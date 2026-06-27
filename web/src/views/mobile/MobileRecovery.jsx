import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  ResponsiveContainer,
  ReferenceLine,
  XAxis,
} from 'recharts';
import { useVitals } from '../../hooks/useVitals.js';
import { useVitalsSync } from '../../hooks/useVitalsSync.js';
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

const tickStyle = { fontSize: 9, fill: C.muted };

export default function MobileRecovery() {
  const {
    isLoading,
    latest,
    readinessScore,
    readinessLabel,
    personalBaselines,
    vitalsHistory,
    history,
    hasPersonalBaselines,
  } = useVitals();
  const {
    mutate: syncVitals,
    isPending: isSyncing,
    isError: syncFailed,
  } = useVitalsSync();
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

  const baselineLabel = hasPersonalBaselines ? 'your avg' : 'baseline';

  const trend14 = useMemo(
    () =>
      vitalsHistory.slice(-14).map((r) => ({
        ...r,
        date: r.date ? r.date.slice(5).replace('-', '/') : '',
      })),
    [vitalsHistory]
  );

  const weightData = useMemo(() => {
    const withWeight = vitalsHistory.filter((r) => r.bodyweight != null);
    if (withWeight.length < 5) return null;
    const slice = withWeight.slice(-14);
    return slice.map((r, i, arr) => {
      const window = arr.slice(Math.max(0, i - 6), i + 1);
      const sma7 =
        Math.round(
          (window.reduce((s, w) => s + w.bodyweight, 0) / window.length) * 10
        ) / 10;
      return {
        ...r,
        date: r.date ? r.date.slice(5).replace('-', '/') : '',
        sma7,
      };
    });
  }, [vitalsHistory]);

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
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => syncVitals()}
            disabled={isSyncing}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: isSyncing ? 'default' : 'pointer',
              color: isSyncing ? C.muted : syncFailed ? C.err : C.accent,
              fontSize: 16,
              lineHeight: 1,
            }}
          >
            {isSyncing ? '…' : '↻'}
          </button>
          <span style={{ fontSize: 11, color: C.muted }}>{todayStr}</span>
        </span>
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
            Connect Google Health to populate this view
          </div>
        </div>
      )}

      {!isLoading && latest && (
        <>
          {/* Readiness hero */}
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

          {/* Metric tiles */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 10,
              marginBottom: 16,
            }}
          >
            {(() => {
              const rhrDelta =
                Math.round(
                  ((latest.rhr ?? 0) - personalBaselines.rhrBaseline) * 10
                ) / 10;
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
                    style={{ fontSize: 24, fontWeight: 700, color: rhrColor }}
                  >
                    {latest.rhr ?? '—'} bpm
                  </div>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>
                    {rhrDelta > 0
                      ? '↑ +' + rhrDelta
                      : rhrDelta < 0
                        ? '↓ ' + rhrDelta
                        : '='}{' '}
                    vs {baselineLabel}
                  </div>
                </div>
              );
            })()}

            {(() => {
              const deficit =
                Math.round(
                  (personalBaselines.hrvBaseline - (latest.hrv ?? 0)) * 10
                ) / 10;
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
                    style={{ fontSize: 24, fontWeight: 700, color: hrvColor }}
                  >
                    {latest.hrv ?? '—'} ms
                  </div>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>
                    {(latest.hrv ?? 0) >= personalBaselines.hrvBaseline
                      ? '↑ +' +
                        Math.round(
                          ((latest.hrv ?? 0) - personalBaselines.hrvBaseline) *
                            10
                        ) /
                          10
                      : '↓ ' + deficit}{' '}
                    vs {baselineLabel}
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
                    style={{ fontSize: 24, fontWeight: 700, color: sleepColor }}
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

          {/* HRV 14-day trend */}
          <div
            style={{
              background: C.panel,
              borderRadius: 10,
              padding: '14px',
              marginBottom: 10,
            }}
          >
            <div
              style={{
                fontSize: 9,
                letterSpacing: 2,
                color: C.muted,
                marginBottom: 6,
              }}
            >
              HRV TREND — 14 DAYS
            </div>
            <ResponsiveContainer width="100%" height={110}>
              <LineChart data={trend14}>
                <XAxis
                  dataKey="date"
                  tick={tickStyle}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <ReferenceLine
                  y={personalBaselines.hrvBaseline}
                  stroke="#ff6b35"
                  strokeDasharray="3 3"
                />
                <Line
                  type="monotone"
                  dataKey="hrv"
                  stroke="#00d4ff"
                  dot={false}
                  strokeWidth={2}
                  isAnimationActive={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* RHR 14-day trend */}
          <div
            style={{
              background: C.panel,
              borderRadius: 10,
              padding: '14px',
              marginBottom: 10,
            }}
          >
            <div
              style={{
                fontSize: 9,
                letterSpacing: 2,
                color: C.muted,
                marginBottom: 6,
              }}
            >
              RESTING HR TREND — 14 DAYS
            </div>
            <ResponsiveContainer width="100%" height={110}>
              <LineChart data={trend14}>
                <XAxis
                  dataKey="date"
                  tick={tickStyle}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <ReferenceLine
                  y={personalBaselines.rhrBaseline}
                  stroke="#00d4ff"
                  strokeDasharray="3 3"
                />
                <Line
                  type="monotone"
                  dataKey="rhr"
                  stroke="#ff6b35"
                  dot={false}
                  strokeWidth={2}
                  isAnimationActive={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Sleep 14-day bar chart */}
          <div
            style={{
              background: C.panel,
              borderRadius: 10,
              padding: '14px',
              marginBottom: 10,
            }}
          >
            <div
              style={{
                fontSize: 9,
                letterSpacing: 2,
                color: C.muted,
                marginBottom: 6,
              }}
            >
              SLEEP — 14 DAYS
            </div>
            <ResponsiveContainer width="100%" height={80}>
              <BarChart data={trend14} barCategoryGap="20%">
                <ReferenceLine y={7} stroke="#34d399" strokeDasharray="3 3" />
                <Bar
                  dataKey="sleep"
                  fill="#a78bfa"
                  radius={[3, 3, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 7-day readiness history */}
          {history.length > 0 && (
            <div
              style={{
                background: C.panel,
                borderRadius: 10,
                padding: '14px',
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: 2,
                  color: C.muted,
                  marginBottom: 6,
                }}
              >
                READINESS — 7 DAYS
              </div>
              <ResponsiveContainer width="100%" height={80}>
                <LineChart data={history.slice(-7)}>
                  <ReferenceLine
                    y={80}
                    stroke="#34d399"
                    strokeDasharray="3 3"
                  />
                  <ReferenceLine
                    y={60}
                    stroke="#ffd700"
                    strokeDasharray="3 3"
                  />
                  <Line
                    type="monotone"
                    dataKey="readinessScore"
                    stroke={readinessColor}
                    dot={false}
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Bodyweight trend (only when ≥5 data points) */}
          {weightData && (
            <div
              style={{
                background: C.panel,
                borderRadius: 10,
                padding: '14px',
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: 2,
                  color: C.muted,
                  marginBottom: 6,
                }}
              >
                BODYWEIGHT — 14 DAYS (kg)
              </div>
              <ResponsiveContainer width="100%" height={80}>
                <LineChart data={weightData}>
                  <Line
                    type="monotone"
                    dataKey="bodyweight"
                    stroke="#ffd700"
                    dot={false}
                    strokeWidth={2}
                    isAnimationActive={false}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="sma7"
                    stroke="#ffd70088"
                    strokeDasharray="4 4"
                    dot={false}
                    strokeWidth={1}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
}
