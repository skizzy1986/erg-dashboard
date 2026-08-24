import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import AuthGate from '../AuthGate.jsx';

const mocks = vi.hoisted(() => ({
  getSession: null,
  authCb: null,
  unsubscribe: null,
  signInWithPassword: null,
  signOut: null,
  isMobile: true,
  dataReady: false,
  pwa: { canInstall: false, installed: false, installPrompt: null },
  splashGate: null,
  splashVisible: false,
  captureError: null,
}));

vi.mock('../supabaseClient.js', () => ({
  supabase: {
    auth: {
      getSession: () => mocks.getSession,
      onAuthStateChange: (cb) => {
        mocks.authCb = cb;
        return { data: { subscription: { unsubscribe: mocks.unsubscribe } } };
      },
      signInWithPassword: (...a) => mocks.signInWithPassword(...a),
      signOut: (...a) => mocks.signOut(...a),
    },
  },
}));
vi.mock('../hooks/useIsMobile.js', () => ({
  useIsMobile: () => mocks.isMobile,
}));
vi.mock('../hooks/useInitialDataReady.js', () => ({
  useInitialDataReady: () => mocks.dataReady,
}));
vi.mock('../hooks/useSplashGate.js', () => ({
  useSplashGate: (...a) => mocks.splashGate(...a),
}));
vi.mock('../hooks/usePWAInstall.js', () => ({
  usePWAInstall: () => mocks.pwa,
}));
vi.mock('../components/mobile/SplashScreen.jsx', () => ({
  default: () => <div data-testid="splash-stub" />,
}));
vi.mock('../App.jsx', () => ({ default: () => <div>App-stub</div> }));
vi.mock('../views/mobile/MobileApp.jsx', () => ({
  default: () => <div>MobileApp-stub</div>,
}));
vi.mock('../utils/sentry.js', () => ({
  captureError: (...a) => mocks.captureError(...a),
}));

// A rejected promise built by mockRejectedValue at setup time is an unhandled
// rejection if the test bails before consuming it. Hand the rejection over only
// once the component has attached its .catch.
function deferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const SESSION = { user: { id: 'u1' } };

beforeEach(() => {
  vi.useFakeTimers();
  mocks.unsubscribe = vi.fn();
  mocks.signOut = vi.fn();
  mocks.signInWithPassword = vi.fn().mockResolvedValue({ error: null });
  mocks.authCb = null;
  mocks.isMobile = true;
  mocks.dataReady = false;
  mocks.pwa = { canInstall: false, installed: false, installPrompt: vi.fn() };
  mocks.splashVisible = false;
  mocks.splashGate = vi.fn(() => mocks.splashVisible);
  mocks.captureError = vi.fn();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('AuthGate → useSplashGate wiring', () => {
  // W1 and W2 are a deliberate pair. W1 alone catches nothing — a correct
  // implementation and a broken `authResolved: !!session` agree while the
  // session is still undefined. W2 is where they diverge, so the pair is what
  // proves the gate is told "unresolved" and "resolved logged-out" apart.
  it('passes authResolved false and dataExpected false while the session is unresolved', () => {
    const d = deferred();
    mocks.getSession = d.promise;

    render(<AuthGate />);

    expect(mocks.splashGate).toHaveBeenLastCalledWith({
      enabled: true,
      authResolved: false,
      authFailed: false,
      dataReady: false,
      dataExpected: false,
    });
  });

  it('flips authResolved on a resolved logged-out session while keeping dataExpected false', async () => {
    const d = deferred();
    mocks.getSession = d.promise;

    render(<AuthGate />);
    await act(async () => {
      d.resolve({ data: { session: null } });
    });

    expect(mocks.splashGate).toHaveBeenLastCalledWith({
      enabled: true,
      authResolved: true,
      authFailed: false,
      dataReady: false,
      dataExpected: false,
    });
  });

  it('reports dataExpected true once a session exists', async () => {
    const d = deferred();
    mocks.getSession = d.promise;

    render(<AuthGate />);
    await act(async () => {
      d.resolve({ data: { session: null } });
    });
    await act(async () => {
      mocks.authCb('SIGNED_IN', SESSION);
    });

    expect(mocks.splashGate).toHaveBeenLastCalledWith({
      enabled: true,
      authResolved: true,
      authFailed: false,
      dataReady: false,
      dataExpected: true,
    });
  });

  it('passes authFailed and reports the rejection when getSession rejects', async () => {
    const d = deferred();
    mocks.getSession = d.promise;
    const err = new Error('network');

    render(<AuthGate />);
    await act(async () => {
      d.reject(err);
    });

    expect(mocks.splashGate).toHaveBeenLastCalledWith({
      enabled: true,
      authResolved: true,
      authFailed: true,
      dataReady: false,
      dataExpected: false,
    });
    expect(mocks.captureError).toHaveBeenCalledWith(err, {
      where: 'AuthGate.getSession',
    });
  });

  it('passes enabled false on desktop', async () => {
    mocks.isMobile = false;
    const d = deferred();
    mocks.getSession = d.promise;

    render(<AuthGate />);
    await act(async () => {
      d.resolve({ data: { session: SESSION } });
    });

    expect(mocks.splashGate.mock.calls.length).toBeGreaterThan(0);
    expect(
      mocks.splashGate.mock.calls.every(([a]) => a.enabled === false)
    ).toBe(true);
  });

  it('forwards dataReady from useInitialDataReady', async () => {
    mocks.dataReady = true;
    const d = deferred();
    mocks.getSession = d.promise;

    render(<AuthGate />);
    await act(async () => {
      d.resolve({ data: { session: null } });
    });

    expect(mocks.splashGate).toHaveBeenLastCalledWith({
      enabled: true,
      authResolved: true,
      authFailed: false,
      dataReady: true,
      dataExpected: false,
    });
  });
});
