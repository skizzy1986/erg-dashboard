import { lazy, Suspense } from 'react';
import { Capacitor } from '@capacitor/core';
import { isSquatPath } from './utils/squatRoute.js';
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

function Ground() {
  return <div style={{ minHeight: '100vh', background: THEME.bg }} />;
}

export default function RouteRoot() {
  return (
    <Suspense fallback={<Ground />}>
      {onSquat() ? <SquatApp /> : <AuthGate />}
    </Suspense>
  );
}
