import { lazy, Suspense } from 'react';
import { Capacitor } from '@capacitor/core';
import { canonicalSquatUrl, isSquatPath } from './utils/squatRoute.js';
import { initialSquatTheme } from './utils/squatTheme.js';
import { THEME } from './constants/theme.js';
import { LANG_TAG, OFFLINE_TEXT, initialLang } from './i18n/lang.js';

// Two products share one bundle: the signed-in dashboard and the public squat
// tool at /squat. Each is its own lazy chunk, so the tool never downloads the
// dashboard — and, load-bearing, never imports supabaseClient.js, whose
// createClient() runs at module top. The Android app is the dashboard only.
const AuthGate = lazy(() => import('./AuthGate.jsx'));
// A first visit with no network cannot fetch the tool's chunk (it is not
// precached). Offline, say so in place of a blank ground; online, the
// rejection is a real failure and goes on to the Sentry boundary in main.jsx.
const SquatApp = lazy(() =>
  import('./squat/SquatApp.jsx').catch((error) => {
    if (navigator.onLine === false) return { default: SquatOffline };
    throw error;
  })
);

const onSquat = () =>
  !Capacitor.isNativePlatform() && isSquatPath(window.location.pathname);

// Lazy-loading AuthGate added a round trip before the dashboard's first
// paint. Starting the fetch here, at module evaluation rather than at render,
// overlaps it with React's own startup so the cost is close to nil.
// A failure here is not swallowed: the lazy() above requests the same module
// on render and its rejection reaches the Sentry error boundary in main.jsx.
if (!onSquat()) import('./AuthGate.jsx').catch(() => {});
else {
  // Module evaluation runs before the load event, which is when registerSW.js
  // resolves './sw.js' against the document URL — so this must happen here.
  const canonical = canonicalSquatUrl(window.location);
  if (canonical)
    window.history.replaceState(window.history.state, '', canonical);
}

// The loading ground. On /squat it takes the tool's theme before the tool's
// chunk arrives, or a dark-mode visitor sees the light ground flash first.
function Ground({ theme, children }) {
  return (
    <div
      data-testid="route-ground"
      data-theme={theme}
      style={{
        minHeight: '100vh',
        background: THEME.bg,
        ...(theme ? { colorScheme: theme } : {}),
      }}
    >
      {children}
    </div>
  );
}

// The tool's catalog is in the chunk that failed to arrive, so the words come
// from the pre-chunk table, in the stored language.
function SquatOffline() {
  const lang = initialLang();
  return (
    <Ground theme={initialSquatTheme()}>
      <p
        role="alert"
        lang={LANG_TAG[lang]}
        style={{ margin: 0, padding: 24, color: THEME.text }}
      >
        {OFFLINE_TEXT[lang]}
      </p>
    </Ground>
  );
}

export default function RouteRoot() {
  const squat = onSquat();
  return (
    <Suspense
      fallback={<Ground theme={squat ? initialSquatTheme() : undefined} />}
    >
      {squat ? <SquatApp /> : <AuthGate />}
    </Suspense>
  );
}
