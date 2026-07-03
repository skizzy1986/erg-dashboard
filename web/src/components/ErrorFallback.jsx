// Fallback UI rendered by the Sentry error boundary when a render crashes.
// Kept dependency-free and self-contained so it can never itself throw.
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
        background: '#0a0a0f',
        color: '#e8e8f0',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
        padding: 24,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: '#ff2d55',
          letterSpacing: 1,
        }}
      >
        SOMETHING WENT WRONG
      </div>
      <div
        style={{
          fontSize: 12,
          color: '#7e7e9a',
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
          background: '#34d399',
          border: 'none',
          borderRadius: 6,
          padding: '10px 16px',
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: 1,
          color: '#0a0a0f',
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        TRY AGAIN
      </button>
    </div>
  );
}
