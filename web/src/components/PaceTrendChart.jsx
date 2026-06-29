import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceArea,
  ResponsiveContainer,
} from 'recharts';
import { formatPace } from '../utils/pace.js';

export function PaceTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div
      style={{
        background: '#2a2a48',
        border: '1px solid #4a4a68',
        borderRadius: 6,
        padding: '10px 12px',
        fontSize: 11,
        fontFamily: "'DM Mono',monospace",
      }}
    >
      <div
        style={{
          color: '#7e7e9a',
          marginBottom: 4,
          fontSize: 9,
          letterSpacing: 2,
        }}
      >
        {d.date_display}
      </div>
      <div style={{ color: '#00d4ff', fontWeight: 700, fontSize: 14 }}>
        {d.pace_500m_str}
        <span style={{ fontSize: 10, color: '#7e7e9a' }}> /500m</span>
      </div>
      <div style={{ color: '#888', fontSize: 10, marginTop: 2 }}>
        {d.avg_watts != null ? `${d.avg_watts}W` : '—'}
        {d.zone ? ` · ${d.zone}` : ''}
      </div>
    </div>
  );
}

export function CustomDot(props) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null) return null;
  return payload.hardPush ? (
    <circle
      key={cx}
      cx={cx}
      cy={cy}
      r={4}
      fill="#00d4ff"
      stroke="#08080d"
      strokeWidth={1}
    />
  ) : (
    <circle
      key={cx}
      cx={cx}
      cy={cy}
      r={4}
      fill="#08080d"
      stroke="#00d4ff"
      strokeWidth={2}
    />
  );
}

export default function PaceTrendChart({
  data,
  paceZones,
  height = 180,
  showBands = true,
}) {
  const chartData = (data ?? []).filter((s) => s.pace_500m != null).reverse();

  const paces = chartData.map((s) => s.pace_500m);
  const zonePaces = (paceZones ?? [])
    .flatMap((z) => [z.paceFloor, z.paceCeil])
    .filter((p) => p != null);
  const all = [...paces, ...zonePaces];
  const hasData = all.length > 0;
  const paceFloor = hasData ? Math.min(...all) - 5 : 0;
  const paceCeiling = hasData ? Math.max(...all) + 5 : 0;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart
        data={chartData}
        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
      >
        <XAxis
          dataKey="date_display"
          tick={{
            fontSize: 9,
            fill: '#7e7e9a',
            fontFamily: "'DM Mono',monospace",
          }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[paceCeiling, paceFloor]}
          tick={{
            fontSize: 9,
            fill: '#7e7e9a',
            fontFamily: "'DM Mono',monospace",
          }}
          tickFormatter={(v) => formatPace(v)}
          axisLine={false}
          tickLine={false}
          width={44}
        />
        {showBands &&
          (paceZones ?? [])
            .filter((z) => z.paceFloor && z.paceCeil)
            .map((z) => (
              <ReferenceArea
                key={z.zone}
                y1={z.paceCeil}
                y2={z.paceFloor}
                fill={z.color}
                fillOpacity={0.08}
              />
            ))}
        <Tooltip content={<PaceTooltip />} />
        <Line
          type="monotone"
          dataKey="pace_500m"
          stroke="#00d4ff"
          strokeWidth={2}
          dot={<CustomDot />}
          activeDot={{ r: 5, fill: '#00d4ff' }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
