import { LoadTooltip } from 'splitiq';

const Frame = ({ children }: { children: React.ReactNode }) => (
  <div style={{ padding: 20, display: 'flex', gap: 16, flexWrap: 'wrap' }}>{children}</div>
);

// TSB is colour-coded by value, so the four bands are the variant axis.
export const TsbBands = () => (
  <Frame>
    <LoadTooltip active payload={[{ payload: { date: '7/02', ctl: 41, atl: 26, tsb: 15, tss: 0 } }]} />
    <LoadTooltip active payload={[{ payload: { date: '7/05', ctl: 43, atl: 47, tsb: -4, tss: 78 } }]} />
    <LoadTooltip active payload={[{ payload: { date: '7/08', ctl: 45, atl: 65, tsb: -20, tss: 104 } }]} />
    <LoadTooltip active payload={[{ payload: { date: '7/10', ctl: 46, atl: 84, tsb: -38, tss: 131 } }]} />
  </Frame>
);

export const WithDayNote = () => (
  <Frame>
    <LoadTooltip
      active
      payload={[{ payload: { date: '7/11', note: 'FIFO deload', ctl: 45, atl: 31, tsb: 14, tss: 42 } }]}
    />
  </Frame>
);

export const RestDay = () => (
  <Frame>
    <LoadTooltip active payload={[{ payload: { date: '7/12', ctl: 44, atl: 27, tsb: 17, tss: 0 } }]} />
  </Frame>
);
