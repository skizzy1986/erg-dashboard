import { LiveMetric, THEME } from 'splitiq';

const Row = ({ children, gap = 28 }: { children: React.ReactNode; gap?: number }) => (
  <div style={{ display: 'flex', alignItems: 'flex-end', gap, padding: 20 }}>
    {children}
  </div>
);

export const Sizes = () => (
  <Row>
    <LiveMetric label="SPLIT" value="1:58.4" unit="/500M" size="large" />
    <LiveMetric label="WATTS" value={214} unit="W" size="normal" />
    <LiveMetric label="RATE" value={22} unit="SPM" size="small" />
  </Row>
);

export const StatusAccents = () => (
  <Row>
    <LiveMetric label="UT2" value={128} unit="W" accent={THEME.cyan} />
    <LiveMetric label="UT1" value={154} unit="W" accent={THEME.green} />
    <LiveMetric label="AT" value={186} unit="W" accent={THEME.gold} />
    <LiveMetric label="OVER CP" value={231} unit="W" accent={THEME.orange} />
    <LiveMetric label="REDLINE" value={268} unit="W" accent={THEME.red} />
  </Row>
);

export const LiveErgReadout = () => (
  <div style={{ padding: 20 }}>
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 24,
        background: THEME.surface,
        border: `1px solid ${THEME.border}`,
        borderRadius: 10,
        padding: '22px 26px',
      }}
    >
      <LiveMetric label="SPLIT" value="2:04.1" unit="/500M" size="large" />
      <LiveMetric label="WATTS" value={151} unit="W" />
      <LiveMetric label="HR" value={139} unit="BPM" accent={THEME.green} />
      <LiveMetric label="RATE" value={20} unit="SPM" size="small" />
      <LiveMetric label="DIST" value="8,240" unit="M" size="small" />
    </div>
  </div>
);

export const AwaitingSignal = () => (
  <Row>
    <LiveMetric label="SPLIT" value={null} unit="/500M" size="large" dimmed />
    <LiveMetric label="WATTS" value={null} unit="W" dimmed />
    <LiveMetric label="HR" value={null} unit="BPM" size="small" dimmed />
  </Row>
);
