import { THEME } from '../../constants/theme.js';
import { RADIUS, SPACE } from '../../constants/tokens.js';
import { ACT_BANDS, HEAT_LEGEND } from '../constants/activationBands.js';
import { card, microLabel } from './ui.js';

// One swatch per band, in ramp order. The peak token sits at the top of High,
// so High shows the gradient between its two stops rather than a flat fill.
const SWATCH = [
  THEME.anatomyHeatLow,
  THEME.anatomyHeatMid,
  `linear-gradient(90deg, ${THEME.anatomyHeatHigh}, ${THEME.anatomyHeatPeak})`,
];

/**
 * The key to the model's colours. Band names sit BESIDE the swatches, never on
 * them: text on a swatch would need four new grounds across two themes in
 * contrastPairs.js, where beside it the ink is THEME.text on surface — a pair
 * already measured.
 */
export default function HeatmapLegend() {
  return (
    <div style={{ ...card, padding: SPACE.lg }}>
      <h3 style={{ ...microLabel, margin: 0 }}>Activation key</h3>
      <ul
        style={{
          listStyle: 'none',
          margin: `${SPACE.sm}px 0`,
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: SPACE.xs,
        }}
      >
        {ACT_BANDS.map((b, i) => (
          <li
            key={b.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: SPACE.sm,
              fontSize: 13,
              fontWeight: 600,
              lineHeight: 1.4,
              color: THEME.text,
            }}
          >
            <span
              aria-hidden="true"
              data-testid={`heat-swatch-${b.id}`}
              style={{
                width: 28,
                height: 14,
                flex: 'none',
                borderRadius: RADIUS.sm,
                background: SWATCH[i],
                // A pale swatch still needs an edge to read as a shape.
                border: `1px solid ${THEME.border}`,
              }}
            />
            {b.name}
          </li>
        ))}
      </ul>
      <p
        style={{
          margin: 0,
          fontSize: 12,
          lineHeight: 1.5,
          color: THEME.textSubtle,
        }}
      >
        {HEAT_LEGEND}
      </p>
    </div>
  );
}
