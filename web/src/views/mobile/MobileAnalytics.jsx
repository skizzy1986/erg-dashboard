import React, { useMemo } from 'react';
import { THEME } from '../../constants/theme.js';
import { LineChart, Line, BarChart, Bar, ResponsiveContainer } from 'recharts';
import { calcTrainingLoad, sessionLoad } from '../../utils/trainingLoad.js';
import { useSessions } from '../../hooks/useSessions.js';
import { useTSSHistory } from '../../hooks/useTSSHistory.js';
import { useAnchors } from '../../hooks/useAnchors.js';
import { toISODate } from '../../utils/dateFormat.js';
import { COMPLETED_STATUSES } from '../../constants/sessionStatus.js';
import { FONT } from '../../constants/type.js';

function tsbColor(tsb) {
  if (tsb > 10) return THEME.positive;
  if (tsb > -10) return THEME.caution;
  if (tsb > -30) return THEME.warning;
  return THEME.critical;
}

function tsbSignal(tsb) {
  if (tsb > 10) return 'Fresh — good form';
  if (tsb > -10) return 'Neutral — balanced';
  if (tsb > -30) return 'Fatigued — normal mid-week';
  return 'High fatigue — rest critical';
}

function typeColor(type) {
  const t = (type ?? '').toLowerCase();
  if (t.includes('erg') || t.includes('row')) return THEME.accent;
  if (t.includes('strength')) return THEME.accentAlt;
  return THEME.muted;
}

export default function MobileAnalytics() {
  const { data: tssHistory, isLoading: loadPending } = useTSSHistory();
  const { data: sessionsData } = useSessions();
  const { cp, ftp } = useAnchors();
  // No stale seed fallback: an empty read means we have nothing to show, not
  // that training stopped in June. calcTrainingLoad would walk from an Invalid
  // Date on an empty series, so guard before calling it.
  const loadData = useMemo(
    () => (tssHistory?.length ? calcTrainingLoad(tssHistory) : []),
    [tssHistory]
  );
  const latest = loadData[loadData.length - 1] ?? null;
  const loadUnavailable = latest == null && !loadPending;

  const weeklyData = useMemo(() => {
    const buckets = [];
    const slice = loadData.slice(-56);
    for (let i = 0; i < slice.length; i += 7) {
      const week = slice.slice(i, i + 7);
      const weeklyTss = week.reduce((sum, d) => sum + (d.tss ?? 0), 0);
      buckets.push({ weeklyTss });
    }
    return buckets;
  }, [loadData]);
  const recentLive = useMemo(() => {
    return (sessionsData ?? [])
      .filter((s) => COMPLETED_STATUSES.includes(s.status))
      .slice()
      .sort((a, b) => {
        const ai = toISODate(a.date);
        const bi = toISODate(b.date);
        return ai < bi ? 1 : ai > bi ? -1 : 0;
      })
      .slice(0, 5)
      .map((s) => ({
        date: s.date,
        // Same sessionLoad the chart above uses. This list previously kept a
        // private sRPE-only copy of the formula, so a power-only session read 0
        // here while the chart counted it — two numbers for one session.
        tss: sessionLoad(s, { cp, ftp }),
        note: s.label ?? s.type ?? '',
      }));
  }, [sessionsData, cp, ftp]);

  const recentSessions = recentLive;

  const color = latest ? tsbColor(latest.tsb) : THEME.muted;
  // Pending renders nothing rather than the outage line, so a slow first read
  // does not flash "unavailable" and then replace it with a real signal (#196).
  const signal = latest
    ? tsbSignal(latest.tsb)
    : loadUnavailable
      ? 'TRAINING LOAD UNAVAILABLE'
      : '';
  const dateStr = new Date().toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  return (
    <div style={{ padding: '16px 16px 24px', background: THEME.bg }}>
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
            color: THEME.positive,
          }}
        >
          SPLITIQ
        </span>
        <span style={{ fontSize: 11, color: THEME.muted }}>{dateStr}</span>
      </div>

      <div
        style={{
          background: THEME.raised,
          borderRadius: 12,
          padding: '20px',
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontSize: 9,
            letterSpacing: 2,
            color: THEME.muted,
            marginBottom: 6,
          }}
        >
          FORM / TSB
        </div>
        <div
          style={{
            fontSize: 52,
            fontWeight: 700,
            color,
            lineHeight: 1,
            fontFamily: FONT.mono,
          }}
        >
          {latest ? latest.tsb.toFixed(1) : '—'}
        </div>
        <div
          style={{
            fontSize: 12,
            color,
            marginTop: 6,
            fontWeight: 600,
          }}
        >
          {signal}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <div
          style={{
            flex: 1,
            background: THEME.raised,
            borderRadius: 10,
            padding: '14px 16px',
          }}
        >
          <div
            style={{
              fontSize: 9,
              letterSpacing: 2,
              color: THEME.muted,
              marginBottom: 4,
            }}
          >
            FITNESS / CTL
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: THEME.accent,
              fontFamily: FONT.mono,
            }}
          >
            {latest ? latest.ctl.toFixed(1) : '—'}
          </div>
        </div>
        <div
          style={{
            flex: 1,
            background: THEME.raised,
            borderRadius: 10,
            padding: '14px 16px',
          }}
        >
          <div
            style={{
              fontSize: 9,
              letterSpacing: 2,
              color: THEME.muted,
              marginBottom: 4,
            }}
          >
            FATIGUE / ATL
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: THEME.warning,
              fontFamily: FONT.mono,
            }}
          >
            {latest ? latest.atl.toFixed(1) : '—'}
          </div>
        </div>
      </div>

      <div
        style={{
          background: THEME.raised,
          borderRadius: 10,
          padding: '14px',
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontSize: 9,
            letterSpacing: 2,
            color: THEME.muted,
            marginBottom: 10,
          }}
        >
          30-DAY LOAD TREND
        </div>
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={loadData.slice(-30)}>
            <Line
              type="monotone"
              dataKey="ctl"
              stroke={THEME.accent}
              dot={false}
              isAnimationActive={false}
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="atl"
              stroke={THEME.warning}
              dot={false}
              isAnimationActive={false}
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="tsb"
              stroke={color}
              dot={false}
              isAnimationActive={false}
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
          <span style={{ fontSize: 10, color: THEME.muted }}>
            <span style={{ color: THEME.accent }}>● </span>CTL
          </span>
          <span style={{ fontSize: 10, color: THEME.muted }}>
            <span style={{ color: THEME.warning }}>● </span>ATL
          </span>
          <span style={{ fontSize: 10, color: THEME.muted }}>
            <span style={{ color }}> ● </span>TSB
          </span>
        </div>
      </div>

      <div
        style={{
          background: THEME.raised,
          borderRadius: 10,
          padding: '14px',
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontSize: 9,
            letterSpacing: 2,
            color: THEME.muted,
            marginBottom: 10,
          }}
        >
          8-WEEK TSS HISTORY
        </div>
        <ResponsiveContainer width="100%" height={80}>
          <BarChart data={weeklyData} barCategoryGap="20%">
            <Bar
              dataKey="weeklyTss"
              fill={THEME.positive}
              radius={[3, 3, 0, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ marginBottom: 8 }}>
        <div
          style={{
            fontSize: 9,
            letterSpacing: 2,
            color: THEME.muted,
            marginBottom: 8,
          }}
        >
          RECENT SESSIONS
        </div>
        {recentSessions.map((s, i) => (
          <div
            key={`${s.date}-${i}`}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '10px 0',
              borderBottom:
                '1px solid color-mix(in srgb, var(--color-border) 20%, transparent)',
            }}
          >
            <span style={{ fontSize: 12, color: THEME.text }}>{s.note}</span>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: THEME.muted }}>{s.date}</div>
              <div
                style={{ fontSize: 12, fontWeight: 700, color: THEME.positive }}
              >
                {s.tss} TSS
              </div>
            </div>
          </div>
        ))}
      </div>

      {(() => {
        const today = new Date().toISOString().slice(0, 10);
        const upcoming = (sessionsData ?? [])
          .filter((s) => s.status === 'planned' && toISODate(s.date) >= today)
          .sort((a, b) => (toISODate(a.date) < toISODate(b.date) ? -1 : 1))
          .slice(0, 3);
        return (
          <div style={{ marginBottom: 8 }}>
            <div
              style={{
                fontSize: 9,
                letterSpacing: 2,
                color: THEME.muted,
                marginBottom: 8,
              }}
            >
              UPCOMING
            </div>
            {upcoming.length === 0 ? (
              <div style={{ fontSize: 12, color: THEME.muted }}>
                No upcoming sessions
              </div>
            ) : (
              upcoming.map((s) => (
                <div
                  key={s.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 0',
                    borderBottom:
                      '1px solid color-mix(in srgb, var(--color-border) 20%, transparent)',
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: typeColor(s.type),
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: 12, color: THEME.text, flex: 1 }}>
                    {s.label ?? s.type}
                  </span>
                  <span style={{ fontSize: 10, color: THEME.muted }}>
                    {s.date}
                  </span>
                </div>
              ))
            )}
          </div>
        );
      })()}
    </div>
  );
}
