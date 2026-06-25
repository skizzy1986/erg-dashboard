import React, { useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, ResponsiveContainer } from 'recharts';
import { calcTrainingLoad } from '../../utils/trainingLoad.js';
import { DAILY_TSS } from '../../constants/tssData.js';
import { useSessions } from '../../hooks/useSessions.js';
import { useTSSHistory } from '../../hooks/useTSSHistory.js';

function tsbColor(tsb) {
  if (tsb > 10) return '#34d399';
  if (tsb > -10) return '#ffd700';
  if (tsb > -30) return '#ff6b35';
  return '#ff2d55';
}

function tsbSignal(tsb) {
  if (tsb > 10) return 'Fresh — good form';
  if (tsb > -10) return 'Neutral — balanced';
  if (tsb > -30) return 'Fatigued — normal mid-week';
  return 'High fatigue — rest critical';
}

function typeColor(type) {
  const t = (type ?? '').toLowerCase();
  if (t.includes('erg') || t.includes('row')) return '#00d4ff';
  if (t.includes('strength')) return '#a78bfa';
  return '#7e7e9a';
}

export default function MobileAnalytics() {
  const { data: tssHistory } = useTSSHistory();
  const { data: sessionsData } = useSessions();
  const tssSource = tssHistory?.length ? tssHistory : DAILY_TSS;
  const loadData = useMemo(() => calcTrainingLoad(tssSource), [tssSource]);
  const latest = loadData[loadData.length - 1];

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
  const color = tsbColor(latest.tsb);
  const signal = tsbSignal(latest.tsb);
  const dateStr = new Date().toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  return (
    <div style={{ padding: '16px 16px 24px', background: '#0a0a0f' }}>
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
            color: '#34d399',
          }}
        >
          ERG DASHBOARD
        </span>
        <span style={{ fontSize: 11, color: '#7e7e9a' }}>{dateStr}</span>
      </div>

      <div
        style={{
          background: '#2a2a48',
          borderRadius: 12,
          padding: '20px',
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontSize: 9,
            letterSpacing: 2,
            color: '#7e7e9a',
            marginBottom: 6,
          }}
        >
          FORM / TSB
        </div>
        <div
          style={{
            fontSize: 52,
            fontWeight: 800,
            color,
            lineHeight: 1,
            fontFamily: "'DM Mono', monospace",
          }}
        >
          {latest.tsb.toFixed(1)}
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
            background: '#2a2a48',
            borderRadius: 10,
            padding: '14px 16px',
          }}
        >
          <div
            style={{
              fontSize: 9,
              letterSpacing: 2,
              color: '#7e7e9a',
              marginBottom: 4,
            }}
          >
            FITNESS / CTL
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: '#00d4ff',
              fontFamily: "'DM Mono', monospace",
            }}
          >
            {latest.ctl.toFixed(1)}
          </div>
        </div>
        <div
          style={{
            flex: 1,
            background: '#2a2a48',
            borderRadius: 10,
            padding: '14px 16px',
          }}
        >
          <div
            style={{
              fontSize: 9,
              letterSpacing: 2,
              color: '#7e7e9a',
              marginBottom: 4,
            }}
          >
            FATIGUE / ATL
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: '#ff6b35',
              fontFamily: "'DM Mono', monospace",
            }}
          >
            {latest.atl.toFixed(1)}
          </div>
        </div>
      </div>

      <div
        style={{
          background: '#2a2a48',
          borderRadius: 10,
          padding: '14px',
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontSize: 9,
            letterSpacing: 2,
            color: '#7e7e9a',
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
              stroke="#00d4ff"
              dot={false}
              isAnimationActive={false}
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="atl"
              stroke="#ff6b35"
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
          <span style={{ fontSize: 10, color: '#7e7e9a' }}>
            <span style={{ color: '#00d4ff' }}>● </span>CTL
          </span>
          <span style={{ fontSize: 10, color: '#7e7e9a' }}>
            <span style={{ color: '#ff6b35' }}>● </span>ATL
          </span>
          <span style={{ fontSize: 10, color: '#7e7e9a' }}>
            <span style={{ color }}> ● </span>TSB
          </span>
        </div>
      </div>

      <div
        style={{
          background: '#2a2a48',
          borderRadius: 10,
          padding: '14px',
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontSize: 9,
            letterSpacing: 2,
            color: '#7e7e9a',
            marginBottom: 10,
          }}
        >
          8-WEEK TSS HISTORY
        </div>
        <ResponsiveContainer width="100%" height={80}>
          <BarChart data={weeklyData} barCategoryGap="20%">
            <Bar
              dataKey="weeklyTss"
              fill="#34d399"
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
            color: '#7e7e9a',
            marginBottom: 8,
          }}
        >
          RECENT SESSIONS
        </div>
        {DAILY_TSS.slice()
          .reverse()
          .slice(0, 5)
          .map((s) => (
            <div
              key={s.date}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '10px 0',
                borderBottom: '1px solid #4a4a6833',
              }}
            >
              <span style={{ fontSize: 12, color: '#e8e8f0' }}>{s.note}</span>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, color: '#7e7e9a' }}>{s.date}</div>
                <div
                  style={{ fontSize: 12, fontWeight: 700, color: '#34d399' }}
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
          .filter((s) => s.status === 'planned' && s.date >= today)
          .sort((a, b) => (a.date < b.date ? -1 : 1))
          .slice(0, 3);
        return (
          <div style={{ marginBottom: 8 }}>
            <div
              style={{
                fontSize: 9,
                letterSpacing: 2,
                color: '#7e7e9a',
                marginBottom: 8,
              }}
            >
              UPCOMING
            </div>
            {upcoming.length === 0 ? (
              <div style={{ fontSize: 12, color: '#7e7e9a' }}>
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
                    borderBottom: '1px solid #4a4a6833',
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
                  <span style={{ fontSize: 12, color: '#e8e8f0', flex: 1 }}>
                    {s.label ?? s.type}
                  </span>
                  <span style={{ fontSize: 10, color: '#7e7e9a' }}>
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
