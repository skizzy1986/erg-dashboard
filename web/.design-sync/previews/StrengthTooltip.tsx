import { StrengthTooltip, THEME } from 'splitiq';

const Frame = ({ children }: { children: React.ReactNode }) => (
  <div style={{ padding: 20, display: 'flex', gap: 16, flexWrap: 'wrap' }}>{children}</div>
);

// The headline colour comes from payload[0].stroke, so it matches whichever
// lift series is being hovered on a multi-lift chart.
export const PerLiftSeriesColour = () => (
  <Frame>
    <StrengthTooltip active payload={[{ stroke: THEME.accentAlt, payload: { date: '7/08', e1rm: 95 } }]} />
    <StrengthTooltip active payload={[{ stroke: THEME.positive, payload: { date: '7/08', e1rm: 142 } }]} />
    <StrengthTooltip active payload={[{ stroke: THEME.accent, payload: { date: '7/08', e1rm: 74 } }]} />
  </Frame>
);

export const SingleLift = () => (
  <Frame>
    <StrengthTooltip active payload={[{ stroke: THEME.accentAlt, payload: { date: '7/15', e1rm: 97.5 } }]} />
  </Frame>
);
