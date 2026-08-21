import { ErgTooltip } from 'splitiq';

// Rendered directly with the payload shape Recharts hands its tooltip content,
// which is how the app's own tests exercise it — a hovering chart can't be
// captured statically.
const Frame = ({ children }: { children: React.ReactNode }) => (
  <div style={{ padding: 20, display: 'flex', gap: 16, flexWrap: 'wrap' }}>{children}</div>
);

export const SteadyStateSession = () => (
  <Frame>
    <ErgTooltip
      active
      payload={[{ payload: { date: '7/04', dist: '13.8km', watts: 140, pace: 136.1, hardPush: false } }]}
    />
  </Frame>
);

export const HardPushSession = () => (
  <Frame>
    <ErgTooltip
      active
      payload={[{ payload: { date: '7/09', dist: '8.0km', watts: 172, pace: 124.8, hardPush: true } }]}
    />
  </Frame>
);
