import { THEME } from '../../constants/theme.js';
import { RADIUS, SPACE } from '../../constants/tokens.js';
import { REGION_NAMES } from '../constants/muscleRegions.js';
import { ACT_NOTE, STRAIN_TITLE } from '../constants/activationBands.js';
import HeatmapLegend from './HeatmapLegend.jsx';
import { microLabel, srOnly } from './ui.js';

/** "Knee extensors: Vastus medialis (High)" — the band in words, never colour alone. */
export const strainLine = (r) =>
  `${REGION_NAMES[r.region]}: ${r.name} (${r.band.name})`;

/**
 * The regions working hardest at the frame on screen, with the heatmap's key
 * and its caveat. A static import, never lazy: with no WebGL this text is the
 * model's accessible substitute, and a chunk that fails to fetch would take
 * it too. `inline` sits in the controls (scene blocked or failed) and drops
 * the colour key; otherwise it is an opaque overlay on the stage, which the
 * caller positions.
 */
export default function StrainPanel({
  items,
  phase,
  announce = '',
  compact = false,
  inline = false,
}) {
  const Heading = inline ? 'h3' : 'h2';
  return (
    <section
      aria-labelledby="strain-title"
      data-testid="strain-panel"
      style={{
        boxSizing: 'border-box',
        ...(inline
          ? // In the controls, under the heatmap switch that drives it. Rail
            // height is the constraint (1280 × 720 fits with ~10 px spare),
            // so no rule of its own: the heading separates it.
            { marginTop: SPACE.sm }
          : {
              background: THEME.surface,
              border: `1px solid ${THEME.border}`,
              borderRadius: RADIUS.md,
              padding: `${SPACE.xs}px ${SPACE.md}px ${SPACE.sm}px`,
              maxWidth: compact ? 'none' : 300,
              // Over the canvas: it shows, the drag goes through to the model.
              pointerEvents: 'none',
            }),
      }}
    >
      <Heading id="strain-title" style={{ ...microLabel, margin: 0 }}>
        {STRAIN_TITLE}
        {phase ? ` · ${phase}` : ''}
      </Heading>
      <ol
        style={{
          margin: `${SPACE.xxs}px 0 0`,
          paddingLeft: SPACE.lg,
          fontSize: compact || inline ? 12 : 13,
          lineHeight: 1.4,
          color: THEME.text,
        }}
      >
        {items.map((r) => (
          <li key={r.region}>
            <strong>{REGION_NAMES[r.region]}</strong>
            {`: ${r.name} (${r.band.name})`}
          </li>
        ))}
      </ol>
      {/* The key explains the model's colours: with no model drawn there
          are none to explain, and the rail has no room for it. */}
      {!inline && <HeatmapLegend compact />}
      <p
        style={{
          margin: `${SPACE.xs}px 0 0`,
          fontSize: 12,
          lineHeight: 1.4,
          color: THEME.textSubtle,
        }}
      >
        {ACT_NOTE}
      </p>
      {/* Polite, and fed by useStrainAnnouncement: never once per frame. */}
      <p role="status" aria-live="polite" style={srOnly}>
        {announce}
      </p>
    </section>
  );
}
