import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StrictMode } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import AuthGate from '../AuthGate.jsx';
import { SPLASH_MIN_MS, SPLASH_MAX_MS } from '../hooks/useSplashGate.js';

const mocks = vi.hoisted(() => ({
  getSession: null,
  authCb: null,
  unsubscribe: null,
  signInWithPassword: null,
  signOut: null,
  isMobile: true,
  dataReady: false,
  pwa: { canInstall: false, installed: false, installPrompt: null },
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

const advance = (ms) => act(() => vi.advanceTimersByTime(ms));
const splashes = () => screen.queryAllByTestId('splash-stub').length;

beforeEach(() => {
  vi.useFakeTimers();
  mocks.unsubscribe = vi.fn();
  mocks.signOut = vi.fn();
  mocks.signInWithPassword = vi.fn().mockResolvedValue({ error: null });
  mocks.authCb = null;
  mocks.isMobile = true;
  mocks.dataReady = false;
  mocks.pwa = { canInstall: false, installed: false, installPrompt: vi.fn() };
  mocks.captureError = vi.fn();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('AuthGate boot behaviour', () => {
  it('clears the splash at the floor on a logged-out cold start', async () => {
    const d = deferred();
    mocks.getSession = d.promise;

    render(<AuthGate />);
    await act(async () => {
      d.resolve({ data: { session: null } });
    });
    expect(splashes()).toBe(1);

    advance(SPLASH_MIN_MS - 1);
    expect(splashes()).toBe(1);

    advance(1);
    expect(splashes()).toBe(0);
    expect(screen.getByText(/Sign in to continue/)).toBeTruthy();
    // Only the unfired ceiling remains; the gate does not re-run its effect
    // once it has dismissed, so that timeout is still armed.
    expect(vi.getTimerCount()).toBe(1);
    advance(SPLASH_MAX_MS);
    expect(vi.getTimerCount()).toBe(0);
    expect(splashes()).toBe(0);
  });

  it('holds the splash past the floor while an authed boot is still fetching', async () => {
    const d = deferred();
    mocks.getSession = d.promise;

    render(<AuthGate />);
    await act(async () => {
      d.resolve({ data: { session: SESSION } });
    });

    advance(SPLASH_MIN_MS);
    expect(splashes()).toBe(1);

    advance(SPLASH_MAX_MS - SPLASH_MIN_MS);
    expect(splashes()).toBe(0);
  });

  it('resolves straight to Login when getSession rejects, without a splash', async () => {
    const d = deferred();
    mocks.getSession = d.promise;

    render(<AuthGate />);
    await act(async () => {
      d.reject(new Error('network'));
    });

    expect(splashes()).toBe(0);
    expect(screen.getByText(/Sign in to continue/)).toBeTruthy();
    expect(vi.getTimerCount()).toBe(0);
    expect(mocks.captureError).toHaveBeenCalledTimes(1);

    advance(SPLASH_MAX_MS);
    expect(splashes()).toBe(0);
  });

  it('never renders the splash on desktop', async () => {
    mocks.isMobile = false;
    const d = deferred();
    mocks.getSession = d.promise;

    render(<AuthGate />);
    expect(splashes()).toBe(0);
    expect(screen.getByText(/^Loading/)).toBeTruthy();
    expect(vi.getTimerCount()).toBe(0);

    advance(SPLASH_MIN_MS);
    expect(splashes()).toBe(0);
    expect(screen.getByText(/^Loading/)).toBeTruthy();
    expect(vi.getTimerCount()).toBe(0);

    advance(SPLASH_MAX_MS);
    expect(splashes()).toBe(0);
    expect(screen.getByText(/^Loading/)).toBeTruthy();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('shows exactly one of the splash and the loading pane while auth is unresolved', () => {
    const d = deferred();
    mocks.getSession = d.promise;

    const { unmount } = render(<AuthGate />);
    expect(splashes()).toBe(1);
    expect(screen.queryByText(/^Loading/)).toBeNull();
    unmount();

    mocks.isMobile = false;
    mocks.getSession = deferred().promise;
    render(<AuthGate />);
    expect(splashes()).toBe(0);
    expect(screen.getByText(/^Loading/)).toBeTruthy();
  });

  it("keeps that exclusivity, and the splash's identity, across the transition to a signed-in session", async () => {
    mocks.dataReady = true;
    const d = deferred();
    mocks.getSession = d.promise;

    render(<AuthGate />);
    const node = screen.getByTestId('splash-stub');
    expect(screen.queryByText(/^Loading/)).toBeNull();

    await act(async () => {
      d.resolve({ data: { session: SESSION } });
    });

    expect(screen.queryByText(/^Loading/)).toBeNull();
    expect(screen.getByText('MobileApp-stub')).toBeTruthy();
    expect(splashes()).toBe(1);
    expect(screen.getByTestId('splash-stub')).toBe(node);

    advance(SPLASH_MIN_MS);
    expect(splashes()).toBe(0);
    expect(screen.getByText('MobileApp-stub')).toBeTruthy();
  });

  it('respects the 700 ms floor on a warm cache instead of hanging toward the ceiling', async () => {
    mocks.dataReady = true;
    const d = deferred();
    mocks.getSession = d.promise;

    render(<AuthGate />);
    await act(async () => {
      d.resolve({ data: { session: SESSION } });
    });

    advance(SPLASH_MIN_MS - 1);
    expect(splashes()).toBe(1);

    advance(1);
    expect(splashes()).toBe(0);
    advance(SPLASH_MAX_MS);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('renders MobileApp on mobile and App on desktop once signed in', async () => {
    const d = deferred();
    mocks.getSession = d.promise;

    const { unmount } = render(<AuthGate />);
    await act(async () => {
      d.resolve({ data: { session: SESSION } });
    });
    expect(screen.getByText('MobileApp-stub')).toBeTruthy();
    expect(screen.queryByText('App-stub')).toBeNull();
    unmount();

    mocks.isMobile = false;
    const d2 = deferred();
    mocks.getSession = d2.promise;
    render(<AuthGate />);
    await act(async () => {
      d2.resolve({ data: { session: SESSION } });
    });
    expect(screen.getByText('App-stub')).toBeTruthy();
    expect(screen.queryByText('MobileApp-stub')).toBeNull();
  });

  it('survives a StrictMode double-mount and unsubscribes on unmount', async () => {
    const d = deferred();
    mocks.getSession = d.promise;

    const { unmount } = render(<AuthGate />, { wrapper: StrictMode });
    expect(splashes()).toBe(1);
    expect(mocks.unsubscribe).toHaveBeenCalledTimes(1);

    await act(async () => {
      d.resolve({ data: { session: null } });
    });
    advance(SPLASH_MIN_MS - 1);
    expect(splashes()).toBe(1);
    advance(1);
    expect(splashes()).toBe(0);

    unmount();
    expect(mocks.unsubscribe).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('signs out through the floating button once authed', async () => {
    const d = deferred();
    mocks.getSession = d.promise;

    render(<AuthGate />);
    await act(async () => {
      d.resolve({ data: { session: SESSION } });
    });

    fireEvent.click(screen.getByTitle('Sign out'));
    expect(mocks.signOut).toHaveBeenCalledTimes(1);
  });

  it('renders the install button only when a PWA prompt is available', async () => {
    const d = deferred();
    mocks.getSession = d.promise;

    const { unmount } = render(<AuthGate />);
    await act(async () => {
      d.resolve({ data: { session: null } });
    });
    expect(screen.queryByText(/ADD TO HOME SCREEN/)).toBeNull();
    unmount();

    mocks.pwa = {
      canInstall: true,
      installed: false,
      installPrompt: vi.fn(),
    };
    const d2 = deferred();
    mocks.getSession = d2.promise;
    const second = render(<AuthGate />);
    await act(async () => {
      d2.resolve({ data: { session: null } });
    });
    fireEvent.click(screen.getByText(/ADD TO HOME SCREEN/));
    expect(mocks.pwa.installPrompt).toHaveBeenCalledTimes(1);
    second.unmount();

    mocks.pwa = { canInstall: true, installed: true, installPrompt: vi.fn() };
    const d3 = deferred();
    mocks.getSession = d3.promise;
    render(<AuthGate />);
    await act(async () => {
      d3.resolve({ data: { session: null } });
    });
    expect(screen.queryByText(/ADD TO HOME SCREEN/)).toBeNull();
  });

  it('validates, disables, and surfaces errors on the login form', async () => {
    const d = deferred();
    mocks.getSession = d.promise;

    const { container } = render(<AuthGate />);
    await act(async () => {
      d.resolve({ data: { session: null } });
    });
    advance(SPLASH_MIN_MS);

    const form = container.querySelector('form');
    await act(async () => {
      fireEvent.submit(form);
    });
    expect(screen.getByText('Enter email and password.')).toBeTruthy();
    expect(mocks.signInWithPassword).not.toHaveBeenCalled();

    const [emailInput, passwordInput] = container.querySelectorAll('input');
    fireEvent.change(emailInput, { target: { value: ' scott@example.com ' } });
    fireEvent.change(passwordInput, { target: { value: 'hunter2' } });

    const pending = deferred();
    mocks.signInWithPassword = vi.fn(() => pending.promise);
    await act(async () => {
      fireEvent.submit(form);
    });
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: 'scott@example.com',
      password: 'hunter2',
    });
    const button = screen.getByRole('button', { name: /^SIGNING IN/ });
    expect(button.disabled).toBe(true);

    await act(async () => {
      pending.resolve({ error: { message: 'Invalid login credentials' } });
    });
    expect(screen.getByText('Invalid login credentials')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'SIGN IN' }).disabled).toBe(
      false
    );
  });

  it('has no module-scope side effect on the document', () => {
    const d = deferred();
    mocks.getSession = d.promise;

    render(<AuthGate />);
    expect(document.getElementById('theme-vars')).toBeNull();
  });
});
