import { THEME } from '../../constants/theme.js';
import { SPACE } from '../../constants/tokens.js';
import { ATTRIBUTION } from '../constants/attribution.js';
import { linkButton, touchLink } from './ui.js';

// CC BY-SA requires the credit wherever the anatomy is shown, so this renders
// on every state of the page — loading, failed, unsupported and ready alike.
export default function AttributionFooter({ onSources, compact }) {
  const sep = (
    <span aria-hidden="true" style={{ color: THEME.border }}>
      {' · '}
    </span>
  );
  return (
    <footer
      style={{
        borderTop: `1px solid ${THEME.border}`,
        background: THEME.surface,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <p
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: `${SPACE.md}px ${compact ? SPACE.lg : SPACE.xl}px`,
          boxSizing: 'border-box',
          fontSize: 12,
          lineHeight: 1.6,
          color: THEME.textSubtle,
        }}
      >
        <a
          href={ATTRIBUTION.anatomyUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ ...touchLink, color: 'inherit' }}
        >
          {ATTRIBUTION.anatomy}
        </a>
        {sep}
        {ATTRIBUTION.musclePaths}
        {sep}
        <button
          type="button"
          onClick={onSources}
          style={{ ...linkButton, ...touchLink, fontSize: 12 }}
        >
          {ATTRIBUTION.sources}
        </button>
      </p>
    </footer>
  );
}
