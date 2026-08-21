import { PaceTooltip } from 'splitiq';

const Frame = ({ children }: { children: React.ReactNode }) => (
  <div style={{ padding: 20, display: 'flex', gap: 16, flexWrap: 'wrap' }}>{children}</div>
);

export const ZoneSessions = () => (
  <Frame>
    <PaceTooltip active payload={[{ payload: { date_display: '6/19', pace_500m_str: '2:21.2', avg_watts: 128, zone: 'UT2' } }]} />
    <PaceTooltip active payload={[{ payload: { date_display: '7/06', pace_500m_str: '2:12.4', avg_watts: 151, zone: 'UT1' } }]} />
    <PaceTooltip active payload={[{ payload: { date_display: '7/09', pace_500m_str: '2:04.8', avg_watts: 172, zone: 'TR' } }]} />
  </Frame>
);

export const MissingWatts = () => (
  <Frame>
    <PaceTooltip active payload={[{ payload: { date_display: '5/28', pace_500m_str: '2:18.6', avg_watts: null } }]} />
  </Frame>
);
