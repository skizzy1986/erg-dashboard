import { THEME } from '../../constants/theme.js';
import { SPACE } from '../../constants/tokens.js';
import { microLabel, srOnly } from './ui.js';

export const LAYERS_WAITING = 'Layer switches work once the 3D model is drawn.';
export const LAYERS_UNAVAILABLE =
  'Layer switches need the 3D model, which is not showing here.';

// Body (the clothed figure) is a layer the scene already has, empty until a
// mesh exists for it, so it is not offered yet.
const LAYERS = [
  ['muscles', 'Muscles'],
  ['skeleton', 'Skeleton'],
];

export default function ViewOptions({
  layers,
  onLayer,
  heatmap = false,
  onHeatmap,
  disabled = false,
  heatmapDisabled = disabled,
  unavailable = false,
  compact = false,
}) {
  // Not appended to LAYERS: that constant is the scene's meshes, and the
  // heatmap is a colouring mode over whichever of them are showing.
  const switches = [
    ...LAYERS.map(([id, label]) => [
      id,
      label,
      !!layers[id],
      onLayer,
      disabled,
    ]),
    // Its own gate: the heatmap also drives the strain readout, which needs
    // only the rep data, so it works where the model cannot be drawn.
    [
      'heatmap',
      'Activation heatmap',
      heatmap,
      (_id, on) => onHeatmap?.(on),
      heatmapDisabled,
    ],
  ];
  return (
    <fieldset
      aria-describedby={disabled ? 'layers-waiting' : undefined}
      style={{
        margin: 0,
        padding: 0,
        border: 'none',
        minWidth: 0,
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        columnGap: SPACE.md,
      }}
    >
      {/* The phone bar's Show tab is the visible name there. */}
      <legend
        style={
          compact
            ? srOnly
            : { ...microLabel, padding: 0, marginBottom: SPACE.xs }
        }
      >
        Show
      </legend>
      {disabled && (
        <span id="layers-waiting" style={srOnly}>
          {unavailable ? LAYERS_UNAVAILABLE : LAYERS_WAITING}
        </span>
      )}
      {switches.map(([id, label, on, onChange, off]) => (
        <label
          key={id}
          style={{
            // The heatmap's longer name takes the whole second row.
            gridColumn: id === 'heatmap' ? '1 / -1' : undefined,
            display: 'inline-flex',
            alignItems: 'center',
            gap: SPACE.sm,
            minHeight: 44,
            fontSize: 13,
            fontWeight: 600,
            color: THEME.text,
            cursor: off ? 'not-allowed' : 'pointer',
            opacity: off ? 0.5 : 1,
          }}
        >
          <input
            type="checkbox"
            role="switch"
            checked={on}
            disabled={off}
            onChange={(e) => onChange(id, e.target.checked)}
            style={{
              // 24 px: the WCAG 2.5.8 floor axe checks the input itself
              // against, whatever the label around it adds.
              width: 24,
              height: 24,
              margin: 0,
              accentColor: THEME.accent,
            }}
          />
          {label}
        </label>
      ))}
    </fieldset>
  );
}
