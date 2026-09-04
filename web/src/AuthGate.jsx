import { useState, useEffect, lazy, Suspense } from 'react';
import { supabase } from './supabaseClient.js';
import { usePWAInstall } from './hooks/usePWAInstall.js';
import { useIsMobile } from './hooks/useIsMobile.js';
import { useSplashGate } from './hooks/useSplashGate.js';
import { useInitialDataReady } from './hooks/useInitialDataReady.js';
import SplashScreen from './components/mobile/SplashScreen.jsx';
import { captureError } from './utils/sentry.js';
import { THEME } from './constants/theme.js';
import { FONT } from './constants/type.js';

// A device renders one shell, never both. Statically importing the pair put
// the desktop dashboard's thirteen tabs and the whole mobile app in the same
// first-paint chunk, so every phone downloaded a dashboard it cannot reach
// and every desktop downloaded a phone app it cannot reach.
const App = lazy(() => import('./App.jsx'));
const MobileApp = lazy(() => import('./views/mobile/MobileApp.jsx'));

// ── THEME TOKENS (match the dashboard) ───────────────────────────
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
    background: THEME.field,
    border: `1px solid ${THEME.border}`,
    borderRadius: 5,
    padding: '11px 12px',
    fontSize: 14,
    color: THEME.text,
    fontFamily: 'inherit',
    width: '100%',
    boxSizing: 'border-box',
  };
  const lbl = {
    fontSize: 9,
    letterSpacing: 1,
    color: THEME.muted,
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
        background: THEME.bg,
        fontFamily: FONT.sans,
        padding: 20,
      }}
    >
      <form
        onSubmit={submit}
        style={{
          width: '100%',
          maxWidth: 320,
          background: THEME.raised,
          border: `1px solid ${THEME.border}`,
          borderRadius: 10,
          padding: '26px 22px',
        }}
      >
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: THEME.positive,
            letterSpacing: 1,
            marginBottom: 4,
          }}
        >
          SPLITIQ
        </div>
        <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 22 }}>
          Sign in to continue
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={lbl} htmlFor="login-email">
            EMAIL
          </label>
          <input
            id="login-email"
            style={inp}
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div style={{ marginBottom: 18 }}>
          <label style={lbl} htmlFor="login-password">
            PASSWORD
          </label>
          <input
            id="login-password"
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
              color: THEME.critical,
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
            background: busy ? THEME.border : THEME.positive,
            border: 'none',
            borderRadius: 6,
            padding: '12px',
            fontSize: 13,
            fontWeight: 700,
            color: THEME.surface,
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

// ── LOADING PANE ─────────────────────────────────────────────────
// Used twice: while the session is unresolved, and while a shell chunk is in
// flight. One definition so the two cannot drift apart.
function LoadingPane() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: THEME.bg,
        color: THEME.muted,
        fontFamily: FONT.sans,
        fontSize: 12,
      }}
    >
      Loading…
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
        background: 'color-mix(in srgb, var(--color-bg) 80%, transparent)',
        border: `1px solid ${THEME.border}`,
        borderRadius: 5,
        padding: '5px 10px',
        fontSize: 9,
        letterSpacing: 1,
        color: THEME.muted,
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
        background: THEME.positive,
        border: 'none',
        borderRadius: 5,
        padding: '10px 14px',
        fontSize: 11,
        letterSpacing: 1,
        fontWeight: 700,
        color: THEME.surface,
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
export default function AuthGate() {
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
    body = showSplash ? null : <LoadingPane />;
  } else if (!session) {
    body = showSplash ? null : <Login />;
  } else {
    body = (
      <>
        <SignOutButton />
        {/* The shell chunk is fetched here rather than at first paint. On a
            phone the splash is already covering this window; once it has
            dismissed at its ceiling — or on desktop, where it never shows —
            fall back to the same pane the unresolved branch uses, so a slow
            chunk reads as loading rather than as a blank screen. */}
        <Suspense fallback={showSplash ? null : <LoadingPane />}>
          {isMobile ? <MobileApp /> : <App />}
        </Suspense>
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
