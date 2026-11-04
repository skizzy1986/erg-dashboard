import { lazy, Suspense } from 'react';
import { Capacitor } from '@capacitor/core';
import { canonicalSquatUrl, isSquatPath } from './utils/squatRoute.js';
import { initialSquatTheme } from './utils/squatTheme.js';
import { THEME } from './constants/theme.js';

// Two products share one bundle: the signed-in dashboard and the public squat
// tool at /squat. Each is its own lazy chunk, so the tool never downloads the
// dashboard — and, load-bearing, never imports supabaseClient.js, whose
// createClient() runs at module top. The Android app is the dashboard only.
const AuthGate = lazy(() => import('./AuthGate.jsx'));
const SquatApp = lazy(() => import('./squat/SquatApp.jsx'));

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
function Ground({ theme }) {
  return (
    <div
      data-testid="route-ground"
      data-theme={theme}
      style={{
        minHeight: '100vh',
        background: THEME.bg,
        ...(theme ? { colorScheme: theme } : {}),
      }}
    />
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
