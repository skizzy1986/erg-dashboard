import { PaceTrendChart, PACE_ZONES, THEME } from 'splitiq';

// Newest-first, as the app supplies it — the component reverses internally.
const SESSIONS = [
  { date_display: '7/09', pace_500m: 124.8, pace_500m_str: '2:04.8', avg_watts: 172, zone: 'TR', hardPush: true },
  { date_display: '7/06', pace_500m: 132.4, pace_500m_str: '2:12.4', avg_watts: 151, zone: 'UT1' },
  { date_display: '7/04', pace_500m: 136.1, pace_500m_str: '2:16.1', avg_watts: 140, zone: 'UT2' },
  { date_display: '7/01', pace_500m: 134.7, pace_500m_str: '2:14.7', avg_watts: 144, zone: 'UT1' },
  { date_display: '6/28', pace_500m: 129.2, pace_500m_str: '2:09.2', avg_watts: 158, zone: 'AT', hardPush: true },
  { date_display: '6/25', pace_500m: 137.9, pace_500m_str: '2:17.9', avg_watts: 136, zone: 'UT2' },
  { date_display: '6/22', pace_500m: 139.5, pace_500m_str: '2:19.5', avg_watts: 132, zone: 'UT2' },
  { date_display: '6/19', pace_500m: 141.2, pace_500m_str: '2:21.2', avg_watts: 128, zone: 'UT2' },
];

const Panel = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div style={{ padding: 20 }}>
    <div
      style={{
        background: THEME.surface,
        border: `1px solid ${THEME.border}`,
        borderRadius: 10,
        padding: '16px 14px 10px',
      }}
    >
      <div style={{ fontSize: 9, letterSpacing: 2, color: THEME.muted, padding: '0 4px 10px' }}>
        {title}
      </div>
      {children}
    </div>
  </div>
);

export const WithZoneBands = () => (
  <Panel title="500M PACE TREND">
    <PaceTrendChart data={SESSIONS} paceZones={PACE_ZONES} height={200} />
  </Panel>
);

export const LineOnly = () => (
  <Panel title="500M PACE TREND — NO BANDS">
    <PaceTrendChart data={SESSIONS} paceZones={PACE_ZONES} height={200} showBands={false} />
  </Panel>
);

export const Compact = () => (
  <Panel title="LAST 4 SESSIONS">
    <PaceTrendChart data={SESSIONS.slice(0, 4)} paceZones={PACE_ZONES} height={140} />
  </Panel>
);

export const NoData = () => (
  <Panel title="500M PACE TREND — NO SESSIONS YET">
    <PaceTrendChart data={[]} paceZones={PACE_ZONES} height={140} />
  </Panel>
);
