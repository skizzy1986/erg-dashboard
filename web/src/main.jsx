import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import {
  QueryClient,
  QueryCache,
  MutationCache,
  QueryClientProvider,
} from '@tanstack/react-query';
import { Capacitor } from '@capacitor/core';
import { BluetoothLowEnergy } from '@capgo/capacitor-bluetooth-low-energy';
import App from './App.jsx';
import { supabase } from './supabaseClient.js';
import { usePWAInstall } from './hooks/usePWAInstall.js';
import { useIsMobile } from './hooks/useIsMobile.js';
import { useSplashGate } from './hooks/useSplashGate.js';
import { useInitialDataReady } from './hooks/useInitialDataReady.js';
import SplashScreen from './components/mobile/SplashScreen.jsx';
import MobileApp from './views/mobile/MobileApp.jsx';
import { createNotificationChannels } from './utils/notifications.js';
import { initSentry, captureError } from './utils/sentry.js';
import {
  handleQueryError,
  handleMutationError,
} from './utils/queryErrorHandlers.js';
import ErrorFallback from './components/ErrorFallback.jsx';
import { THEME } from './constants/theme.js';
import { cssVars } from './utils/themeCss.js';

initSentry();

const themeStyle = document.createElement('style');
themeStyle.id = 'theme-vars';
themeStyle.textContent = cssVars(THEME);
document.head.appendChild(themeStyle);

if (Capacitor.isNativePlatform()) {
  BluetoothLowEnergy.shimWebBluetooth();
  createNotificationChannels();
}

// The caches are where Supabase failures surface. Without these handlers every
// hook that throws into react-query died there unreported — see
// utils/queryErrorHandlers.js.
const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: handleQueryError }),
  mutationCache: new MutationCache({ onError: handleMutationError }),
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      // Reads DO report to Sentry through the QueryCache sink — the
      // read-vs-write asymmetry once observed was this retry's backoff delaying
      // onError, not a swallowed error. Investigated and closed in #276; the
      // mutation path simply has no retry override, so it lands near-instantly.
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

// ── THEME TOKENS (match the dashboard) ───────────────────────────
const C = {
  bg: THEME.bg,
  panel: THEME.raised,
  field: THEME.field,
  border: THEME.border,
  accent: THEME.positive,
  text: THEME.text,
  muted: THEME.muted,
  err: THEME.critical,
};

// ── LOGIN SCREEN ─────────────────────────────────────────────────
function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErr('Enter email and password.');
      return;
    }
    setBusy(true);
    setErr(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setBusy(false);
    if (error) setErr(error.message);
    // On success, onAuthStateChange in AuthGate swaps the view.
  };

  const inp = {
    background: C.field,
    border: `1px solid ${C.border}`,
    borderRadius: 5,
    padding: '11px 12px',
    fontSize: 14,
    color: C.text,
    fontFamily: 'inherit',
    width: '100%',
    boxSizing: 'border-box',
  };
  const lbl = {
    fontSize: 9,
    letterSpacing: 1,
    color: C.muted,
    marginBottom: 4,
    display: 'block',
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: C.bg,
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
        padding: 20,
      }}
    >
      <form
        onSubmit={submit}
        style={{
          width: '100%',
          maxWidth: 320,
          background: C.panel,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: '26px 22px',
        }}
      >
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: C.accent,
            letterSpacing: 1,
            marginBottom: 4,
          }}
        >
          SPLITIQ
        </div>
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 22 }}>
          Sign in to continue
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>EMAIL</label>
          <input
            style={inp}
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div style={{ marginBottom: 18 }}>
          <label style={lbl}>PASSWORD</label>
          <input
            style={inp}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {err && (
          <div
            style={{
              fontSize: 11,
              color: C.err,
              marginBottom: 14,
              lineHeight: 1.5,
            }}
          >
            {err}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          style={{
            width: '100%',
            background: busy ? C.border : C.accent,
            border: 'none',
            borderRadius: 6,
            padding: '12px',
            fontSize: 13,
            fontWeight: 700,
            color: C.bg,
            cursor: busy ? 'default' : 'pointer',
            fontFamily: 'inherit',
            letterSpacing: 1,
          }}
        >
          {busy ? 'SIGNING IN…' : 'SIGN IN'}
        </button>
      </form>
    </div>
  );
}

// ── SIGN-OUT BUTTON (floating, top-right) ────────────────────────
function SignOutButton() {
  return (
    <button
      onClick={() => supabase.auth.signOut()}
      style={{
        position: 'fixed',
        top: 'calc(8px + env(safe-area-inset-top, 0px))',
        right: 8,
        zIndex: 1000,
        background: '#08080dcc',
        border: `1px solid ${C.border}`,
        borderRadius: 5,
        padding: '5px 10px',
        fontSize: 9,
        letterSpacing: 1,
        color: C.muted,
        cursor: 'pointer',
        fontFamily: 'inherit',
        backdropFilter: 'blur(4px)',
      }}
      title="Sign out"
    >
      SIGN OUT
    </button>
  );
}

// ── INSTALL BUTTON (floating, bottom-right) ──────────────────────
function InstallButton() {
  const { canInstall, installed, installPrompt } = usePWAInstall();
  if (!canInstall || installed) return null;
  return (
    <button
      onClick={installPrompt}
      style={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        zIndex: 999,
        background: C.accent,
        border: 'none',
        borderRadius: 5,
        padding: '10px 14px',
        fontSize: 11,
        letterSpacing: 1,
        fontWeight: 700,
        color: C.bg,
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      ＋ ADD TO HOME SCREEN
    </button>
  );
}

// ── AUTH GATE ────────────────────────────────────────────────────
// undefined = still checking, null = logged out, object = signed in.
function AuthGate() {
  const [session, setSession] = useState(undefined);
  const [authFailed, setAuthFailed] = useState(false);
  const isMobile = useIsMobile();
  const dataReady = useInitialDataReady();
  const showSplash = useSplashGate({
    enabled: isMobile,
    authResolved: session !== undefined,
    authFailed,
    dataReady,
    dataExpected: !!session,
  });

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .catch((error) => {
        // Outside react-query, so nothing else captures this. Falling through
        // to Login is the right recovery, but silently would hide a real outage.
        captureError(error, { where: 'AuthGate.getSession' });
        setAuthFailed(true);
        setSession(null);
      });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) =>
      setSession(s)
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  let body;
  if (session === undefined) {
    body = showSplash ? null : (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: C.bg,
          color: C.muted,
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          fontSize: 12,
        }}
      >
        Loading…
      </div>
    );
  } else if (!session) {
    body = showSplash ? null : <Login />;
  } else {
    body = (
      <>
        <SignOutButton />
        {isMobile ? <MobileApp /> : <App />}
      </>
    );
  }

  // One flat shape across all three branches, so the splash keeps a stable
  // child index. Returning a different fragment per branch remounted it the
  // moment the session resolved — React reconciles fragment children by index,
  // so the splash landed on a different slot and replayed its whole entrance
  // mid-animation. It also overlays rather than replaces once signed in: the
  // tabs' fetches only start when MobileApp mounts, so it has to be mounted
  // and fetching underneath.
  return (
    <>
      {body}
      {showSplash && <SplashScreen />}
      <InstallButton />
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary
      fallback={({ resetError }) => <ErrorFallback resetError={resetError} />}
    >
      <QueryClientProvider client={queryClient}>
        <AuthGate />
      </QueryClientProvider>
    </Sentry.ErrorBoundary>
  </React.StrictMode>
);
