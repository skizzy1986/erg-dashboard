import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './erg-dashboard.jsx';
import { supabase } from './supabaseClient.js';
import { usePWAInstall } from './hooks/usePWAInstall.js';
import { useIsMobile } from './hooks/useIsMobile.js';
import MobileApp from './views/mobile/MobileApp.jsx';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 2, refetchOnWindowFocus: false },
  },
});

// ── THEME TOKENS (match the dashboard) ───────────────────────────
const C = {
  bg: '#0a0a0f',
  panel: '#2a2a48',
  field: '#08080d',
  border: '#4a4a68',
  accent: '#34d399',
  text: '#e8e8f0',
  muted: '#7e7e9a',
  err: '#ff2d55',
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
          ERG DASHBOARD
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
        top: 8,
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
  const isMobile = useIsMobile();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) =>
      setSession(s)
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return (
      <>
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
        <InstallButton />
      </>
    );
  }
  if (!session)
    return (
      <>
        <Login />
        <InstallButton />
      </>
    );
  return (
    <>
      <SignOutButton />
      {isMobile ? <MobileApp /> : <App />}
      <InstallButton />
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthGate />
    </QueryClientProvider>
  </React.StrictMode>
);
