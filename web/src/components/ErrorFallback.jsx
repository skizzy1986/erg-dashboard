// Fallback UI rendered by the Sentry error boundary when a render crashes.
// Kept dependency-free and self-contained so it can never itself throw — which
// is also why it reads the stored language itself rather than through Lingui:
// it renders outside every provider, possibly before any catalog has loaded.
import { THEME } from '../constants/theme.js';
import { FONT } from '../constants/type.js';
import { LANG_TAG, ROOT_ERROR_TEXT, initialLang } from '../i18n/lang.js';

export default function ErrorFallback({ resetError }) {
  const lang = initialLang();
  return (
    <div
      role="alert"
      lang={LANG_TAG[lang]}
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
        {ROOT_ERROR_TEXT.heading[lang]}
      </div>
      <div
        style={{
          fontSize: 12,
          color: THEME.muted,
          lineHeight: 1.6,
          maxWidth: 320,
        }}
      >
        {ROOT_ERROR_TEXT.body[lang]}
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
        {ROOT_ERROR_TEXT.retry[lang]}
      </button>
    </div>
  );
}
