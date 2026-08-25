// Fallback UI rendered by the Sentry error boundary when a render crashes.
// Kept dependency-free and self-contained so it can never itself throw.
import { THEME } from '../constants/theme.js';
import { FONT } from '../constants/type.js';

export default function ErrorFallback({ resetError }) {
  return (
    <div
      role="alert"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        background: THEME.bg,
        color: THEME.text,
        fontFamily: FONT.sans,
        padding: 24,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: THEME.critical,
          letterSpacing: 1,
        }}
      >
        SOMETHING WENT WRONG
      </div>
      <div
        style={{
          fontSize: 12,
          color: THEME.muted,
          lineHeight: 1.6,
          maxWidth: 320,
        }}
      >
        The error has been reported. Try again, and if it keeps happening reload
        the app.
      </div>
      <button
        onClick={resetError}
        style={{
          background: THEME.positive,
          border: 'none',
          borderRadius: 6,
          padding: '10px 16px',
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: 1,
          color: THEME.surface,
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        TRY AGAIN
      </button>
    </div>
  );
}
