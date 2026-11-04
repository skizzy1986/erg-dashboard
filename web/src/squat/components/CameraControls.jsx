import { THEME } from '../../constants/theme.js';
import { SPACE } from '../../constants/tokens.js';
import { card, microLabel, secondaryButton, srOnly } from './ui.js';

export const CAMERA_WAITING =
  'Camera controls work once the 3D model is drawn.';

const STEP = (15 * Math.PI) / 180;
const ZOOM_IN = 1 / 1.15;
const ZOOM_OUT = 1.15;

const button = {
  ...secondaryButton,
  minWidth: 44,
  padding: `${SPACE.sm}px ${SPACE.md}px`,
};

// The region's own keys. OrbitControls' keyboard handling is never switched
// on: its plain arrows pan, which would lose the model off-screen.
export function cameraKey(key) {
  switch (key) {
    case 'ArrowLeft':
      return ['orbit', -STEP, 0];
    case 'ArrowRight':
      return ['orbit', STEP, 0];
    case 'ArrowUp':
      return ['orbit', 0, -STEP];
    case 'ArrowDown':
      return ['orbit', 0, STEP];
    case '+':
    case '=':
      return ['zoom', ZOOM_IN];
    case '-':
    case '_':
      return ['zoom', ZOOM_OUT];
    default:
      return null;
  }
}

export default function CameraControls({ camera, disabled = false }) {
  const onKeyDown = (e) => {
    if (disabled) return;
    const action = cameraKey(e.key);
    if (!action) return;
    e.preventDefault();
    const [name, ...args] = action;
    camera[name](...args);
  };
  const style = disabled
    ? { ...button, opacity: 0.5, cursor: 'not-allowed' }
    : button;
  const presets = [
    ['front', 'Front', 'Front (anterior) view'],
    ['back', 'Back', 'Back (posterior) view'],
    ['left', 'Left', 'Left side (lateral) view'],
    ['right', 'Right', 'Right side (lateral) view'],
  ];
  return (
    <div
      role="group"
      aria-labelledby="camera-title"
      aria-describedby={disabled ? 'camera-keys camera-waiting' : 'camera-keys'}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={onKeyDown}
      style={{
        ...card,
        padding: SPACE.lg,
        display: 'flex',
        flexDirection: 'column',
        gap: SPACE.sm,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: SPACE.md,
          flexWrap: 'wrap',
          alignItems: 'baseline',
        }}
      >
        <h2 id="camera-title" style={{ ...microLabel, margin: 0 }}>
          Camera controls
        </h2>
        <span
          id="camera-keys"
          style={{ fontSize: 12, lineHeight: 1.5, color: THEME.textSubtle }}
        >
          Arrows rotate · + / − zoom
        </span>
        {disabled && (
          <span id="camera-waiting" style={srOnly}>
            {CAMERA_WAITING}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: SPACE.xs }}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => camera.reset()}
          style={style}
        >
          Reset
        </button>
        {presets.map(([id, label, name]) => (
          <button
            key={id}
            type="button"
            aria-label={name}
            disabled={disabled}
            onClick={() => camera.preset(id)}
            style={style}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          aria-label="Zoom in"
          disabled={disabled}
          onClick={() => camera.zoom(ZOOM_IN)}
          style={style}
        >
          +
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          disabled={disabled}
          onClick={() => camera.zoom(ZOOM_OUT)}
          style={style}
        >
          −
        </button>
      </div>
    </div>
  );
}
