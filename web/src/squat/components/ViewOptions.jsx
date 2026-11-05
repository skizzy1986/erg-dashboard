import { THEME } from '../../constants/theme.js';
import { SPACE } from '../../constants/tokens.js';
import { card, microLabel, srOnly } from './ui.js';

export const LAYERS_WAITING = 'Layer switches work once the 3D model is drawn.';

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
}) {
  // Not appended to LAYERS: that constant is the scene's meshes, and the
  // heatmap is a colouring mode over whichever of them are showing.
  const switches = [
    ...LAYERS.map(([id, label]) => [id, label, !!layers[id], onLayer]),
    ['heatmap', 'Activation heatmap', heatmap, (_id, on) => onHeatmap?.(on)],
  ];
  return (
    <fieldset
      disabled={disabled}
      aria-describedby={disabled ? 'layers-waiting' : undefined}
      style={{
        ...card,
        margin: 0,
        padding: SPACE.lg,
        display: 'flex',
        flexWrap: 'wrap',
        gap: SPACE.lg,
        alignItems: 'center',
      }}
    >
      <legend style={{ ...microLabel, padding: `0 ${SPACE.xs}px` }}>
        Show
      </legend>
      {disabled && (
        <span id="layers-waiting" style={srOnly}>
          {LAYERS_WAITING}
        </span>
      )}
      {switches.map(([id, label, on, onChange]) => (
        <label
          key={id}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: SPACE.sm,
            minHeight: 44,
            fontSize: 13,
            fontWeight: 600,
            color: THEME.text,
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
          }}
        >
          <input
            type="checkbox"
            role="switch"
            checked={on}
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
