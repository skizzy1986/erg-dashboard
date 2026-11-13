import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StrictMode } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import AuthGate from '../AuthGate.jsx';
import { SPLASH_MIN_MS, SPLASH_MAX_MS } from '../hooks/useSplashGate.js';
import { THEME } from '../constants/theme.js';
import { TYPE } from '../constants/tokens.js';
import { FONT } from '../constants/type.js';

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

const pageLang = document.documentElement.lang;

afterEach(() => {
  vi.useRealTimers();
  document.documentElement.lang = pageLang;
});

describe('AuthGate boot behaviour', () => {
  it('clears the splash at the floor on a logged-out cold start', async () => {
    const d = deferred();
    mocks.getSession = d.promise;

    render(<AuthGate />);
    const node = screen.getByTestId('splash-stub');
    await act(async () => {
      d.resolve({ data: { session: null } });
    });
    expect(splashes()).toBe(1);
    // The logged-out branch has to hold the splash at the same child index as
    // the unresolved one. B6 pins the signed-in branch; this pins the third.
    expect(screen.getByTestId('splash-stub')).toBe(node);

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

  const LOCALES = [
    ['', 'Train Smarter', 'en', 'Smarter'],
    ['es', 'Entrena con cabeza', 'es', 'cabeza'],
  ];
  // Split across a lead and a head span, so match the whole line's text.
  const loginLine = (text) =>
    screen.getByText(
      (_, el) => el.tagName === 'DIV' && el.textContent === text
    );
  const toLogin = async () => {
    const d = deferred();
    mocks.getSession = d.promise;
    const utils = render(<AuthGate />);
    await act(async () => {
      d.reject(new Error('network'));
    });
    return utils;
  };

  it.each(LOCALES)(
    'shows the brand line for page lang %j between SPLITIQ and the sign-in prompt',
    async (pageLangValue, text, lang, head) => {
      document.documentElement.lang = pageLangValue;
      const { container } = await toLogin();

      const line = loginLine(text);
      expect(line).toHaveAttribute('lang', lang);
      expect(line.querySelector('span')).toHaveTextContent(
        new RegExp(`^${head}$`)
      );
      expect(document.documentElement.lang).toBe(pageLangValue);

      const brand = screen.getByText('SPLITIQ');
      const prompt = screen.getByText('Sign in to continue');
      const FOLLOWING = document.DOCUMENT_POSITION_FOLLOWING;
      expect(brand.compareDocumentPosition(line) & FOLLOWING).toBeTruthy();
      expect(line.compareDocumentPosition(prompt) & FOLLOWING).toBeTruthy();

      const marked = container.querySelectorAll('[lang]');
      expect(marked).toHaveLength(1);
      expect(marked[0]).toBe(line);
    }
  );

  it("styles the login line in the wordmark's two faces", async () => {
    await toLogin();
    const line = loginLine('Train Smarter');
    expect(line).toHaveStyle({
      fontSize: `${TYPE.body.size}px`,
      fontWeight: '600',
      letterSpacing: `${TYPE.title.letterSpacing}px`,
      color: THEME.text,
    });
    expect(line.querySelector('span')).toHaveStyle({
      fontFamily: FONT.mono,
      fontWeight: '700',
      color: THEME.accent,
    });
  });

  it('plays the splash on desktop and clears it at the floor, as on mobile', async () => {
    mocks.isMobile = false;
    const d = deferred();
    mocks.getSession = d.promise;

    render(<AuthGate />);
    expect(splashes()).toBe(1);
    expect(screen.queryByText(/^Loading/)).toBeNull();
    await act(async () => {
      d.resolve({ data: { session: null } });
    });
    expect(splashes()).toBe(1);

    advance(SPLASH_MIN_MS - 1);
    expect(splashes()).toBe(1);

    advance(1);
    expect(splashes()).toBe(0);
    expect(screen.getByText(/Sign in to continue/)).toBeTruthy();
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
    expect(splashes()).toBe(1);
    expect(screen.queryByText(/^Loading/)).toBeNull();
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
    mocks.isMobile = false;
    mocks.dataReady = true;
    const d = deferred();
    mocks.getSession = d.promise;

    render(<AuthGate />);
    await act(async () => {
      d.resolve({ data: { session: SESSION } });
    });
    advance(SPLASH_MIN_MS);

    fireEvent.click(screen.getByTitle('Sign out'));
    expect(mocks.signOut).toHaveBeenCalledTimes(1);
  });

  // The splash covers the page on desktop too, so a button rendered under it
  // would still be reachable by Tab while invisible.
  it('holds the desktop sign-out back until the splash has cleared', async () => {
    mocks.isMobile = false;
    mocks.dataReady = true;
    const d = deferred();
    mocks.getSession = d.promise;

    render(<AuthGate />);
    await act(async () => {
      d.resolve({ data: { session: SESSION } });
    });
    expect(splashes()).toBe(1);
    expect(screen.queryByTitle('Sign out')).toBeNull();

    advance(SPLASH_MIN_MS);
    expect(splashes()).toBe(0);
    expect(screen.getByTitle('Sign out')).toBeTruthy();
  });

  it('has no floating sign-out on mobile, where Settings carries it', async () => {
    const d = deferred();
    mocks.getSession = d.promise;

    render(<AuthGate />);
    await act(async () => {
      d.resolve({ data: { session: SESSION } });
    });

    expect(screen.queryByTitle('Sign out')).toBeNull();
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
