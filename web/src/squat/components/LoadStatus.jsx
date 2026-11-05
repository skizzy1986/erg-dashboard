import { THEME } from '../../constants/theme.js';
import { FONT } from '../../constants/type.js';
import { RADIUS, SPACE } from '../../constants/tokens.js';
import { mono, primaryButton, srOnly } from './ui.js';

const mb = (bytes) => (bytes / 1e6).toFixed(1);

export function statusText({ stage, loaded, total, error }) {
  switch (stage) {
    case 'fetching':
      return `Downloading anatomy ${mb(loaded)} / ${mb(total)} MB`;
    case 'decoding':
      return 'Unpacking';
    case 'building':
      return 'Building model';
    case 'engine':
      return 'Loading 3D engine';
    case 'scene':
      return 'Building 3D model';
    case 'ready':
      return '3D model ready';
    case 'error':
      return error;
    default:
      return '';
  }
}

// The data's progress, then the 3D engine's, as one live region. The bar is
// decorative over the text, which already says the same thing in words a
// screen reader can use. Once the model is drawn the region stays in the
// document, visually hidden, so "3D model ready" is still announced.
export default function LoadStatus({
  stage,
  loaded,
  total,
  error,
  onRetry,
  hidden = false,
}) {
  const pct =
    stage === 'fetching'
      ? Math.min(100, Math.round((loaded / total) * 100) || 0)
      : stage === 'error'
        ? 0
        : 100;
  const busy = ['fetching', 'decoding', 'building', 'engine', 'scene'].includes(
    stage
  );
  if (hidden) {
    return (
      <div
        role="status"
        aria-live="polite"
        data-testid="load-status"
        style={srOnly}
      >
        {statusText({ stage, loaded, total, error })}
      </div>
    );
  }
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={busy}
      data-testid="load-status"
      style={{
        width: '100%',
        maxWidth: 340,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: SPACE.md,
        textAlign: 'center',
      }}
    >
      {stage !== 'error' && (
        <div
          aria-hidden="true"
          style={{
            width: '100%',
            height: 4,
            borderRadius: RADIUS.pill,
            background: THEME.divider,
            overflow: 'hidden',
          }}
        >
          <div
            data-testid="load-bar"
            style={{
              width: `${pct}%`,
              height: '100%',
              background: stage === 'ready' ? THEME.positive : THEME.accent,
              borderRadius: RADIUS.pill,
              transition: 'width 160ms linear',
            }}
          />
        </div>
      )}
      <p
        style={{
          margin: 0,
          fontFamily: FONT.sans,
          fontSize: 13,
          fontWeight: 600,
          lineHeight: 1.5,
          // The error reads in full-strength ink, not critical: dark critical
          // on the stage's surfaceAlt is 4.49:1, just short of AA.
          color: stage === 'error' ? THEME.text : THEME.textSubtle,
          ...(stage === 'fetching'
            ? { fontVariantNumeric: 'tabular-nums' }
            : {}),
        }}
      >
        {stage === 'fetching' ? (
          <>
            Downloading anatomy{' '}
            <span style={mono}>
              {mb(loaded)} / {mb(total)} MB
            </span>
          </>
        ) : (
          statusText({ stage, loaded, total, error })
        )}
      </p>
      {stage === 'error' && (
        <button type="button" onClick={onRetry} style={primaryButton}>
          Retry
        </button>
      )}
    </div>
  );
}
