import { THEME } from '../../constants/theme.js';
import { FONT } from '../../constants/type.js';
import { RADIUS, SPACE } from '../../constants/tokens.js';
import { mono, primaryButton } from './ui.js';

const mb = (bytes) => (bytes / 1e6).toFixed(1);

export function statusText({ stage, loaded, total, error }) {
  switch (stage) {
    case 'fetching':
      return `Downloading anatomy ${mb(loaded)} / ${mb(total)} MB`;
    case 'decoding':
      return 'Unpacking';
    case 'building':
      return 'Building model';
    case 'ready':
      return 'Model loaded — 3D view coming next';
    case 'error':
      return error;
    default:
      return '';
  }
}

// The data's progress, as one live region. The bar is decorative over the
// text, which already says the same thing in words a screen reader can use.
export default function LoadStatus({ stage, loaded, total, error, onRetry }) {
  const pct =
    stage === 'fetching'
      ? Math.min(100, Math.round((loaded / total) * 100) || 0)
      : stage === 'error'
        ? 0
        : 100;
  const busy =
    stage === 'fetching' || stage === 'decoding' || stage === 'building';
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={busy}
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
          color: stage === 'error' ? THEME.critical : THEME.textSubtle,
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
