import { THEME } from '../../constants/theme.js';
import { SPACE } from '../../constants/tokens.js';
import { primaryButton } from './ui.js';
import { reloadPage } from '../utils/reloadPage.js';

export const SCENE_ERROR_MESSAGES = {
  contextlost:
    'The browser paused the 3D view to free graphics memory. Restart it to carry on.',
  load: 'The 3D engine could not be loaded. Check your connection and reload the page.',
  offline: '3D view needs a connection the first time.',
  build: 'The 3D model could not be drawn in this browser.',
};

const isOffline = () =>
  typeof navigator !== 'undefined' && navigator.onLine === false;

// Build failures and a lost context are retried in place; a failed import
// reloads the page (see utils/reloadPage.js for why).

// What went wrong with the 3D view itself — the data is fine, so the guide
// and form check beside it carry on regardless.
export default function SceneError({ kind, onRetry }) {
  const key = kind === 'load' && isOffline() ? 'offline' : kind;
  const label =
    kind === 'contextlost'
      ? 'Restart 3D view'
      : kind === 'load'
        ? 'Reload page'
        : 'Retry';
  return (
    <div
      role="alert"
      style={{
        maxWidth: 340,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: SPACE.md,
        textAlign: 'center',
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 13,
          fontWeight: 600,
          lineHeight: 1.5,
          color: THEME.text,
        }}
      >
        {SCENE_ERROR_MESSAGES[key] ?? SCENE_ERROR_MESSAGES.build}
      </p>
      <button
        type="button"
        onClick={kind === 'load' ? reloadPage : onRetry}
        style={primaryButton}
      >
        {label}
      </button>
    </div>
  );
}
