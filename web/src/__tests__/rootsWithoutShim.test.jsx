// The test suite's '@testing-library/react' is a shim that wraps every render in
// an I18nProvider (src/test/rtl.js). That shim would also hide a production
// root that wrongly needs a provider from outside: in the app nothing sits
// above RouteRoot, ErrorFallback or AuthGate. So these renders use RTL's real
// entry, by the same file path the shim re-exports, and get no provider.
import { render, screen, cleanup } from '@testing-library/react/dist/index.js';
import RouteRoot from '../RouteRoot.jsx';
import ErrorFallback from '../components/ErrorFallback.jsx';
import AuthGate from '../AuthGate.jsx';
import SplashScreen from '../components/mobile/SplashScreen.jsx';

const mocks = vi.hoisted(() => ({ isMobile: false, splash: true }));

vi.mock('../supabaseClient.js', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
    },
  },
}));
vi.mock('../utils/sentry.js', () => ({ captureError: vi.fn() }));
vi.mock('../hooks/useIsMobile.js', () => ({
  useIsMobile: () => mocks.isMobile,
}));
vi.mock('../hooks/useInitialDataReady.js', () => ({
  useInitialDataReady: () => false,
}));
// The splash plays on every device and holds Login back for its 4 s floor;
// the login-card test turns it off, since it checks providers, not timing.
vi.mock('../hooks/useSplashGate.js', async (importOriginal) => {
  const real = await importOriginal();
  return {
    ...real,
    useSplashGate: (opts) => (mocks.splash ? real.useSplashGate(opts) : false),
  };
});

beforeEach(() => {
  mocks.isMobile = false;
  mocks.splash = true;
  window.localStorage.clear();
  window.history.replaceState(null, '', '/');
});

afterEach(cleanup);

describe('top-level roots render with no provider above them', () => {
  it('the control: a component that needs a provider throws here', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(() => render(<SplashScreen />)).toThrow();
    } finally {
      console.error.mockRestore();
    }
  });

  it('ErrorFallback, the root Sentry fallback', () => {
    render(<ErrorFallback resetError={() => {}} />);
    expect(screen.getByRole('alert')).toHaveTextContent('SOMETHING WENT WRONG');
  });

  it('RouteRoot at / reaches the login card', async () => {
    mocks.splash = false;
    render(<RouteRoot />);
    expect(await screen.findByText('Sign in to continue')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Switch to Spanish/ })
    ).toBeInTheDocument();
  });

  it('AuthGate on a phone shows the splash inside its own provider', async () => {
    mocks.isMobile = true;
    render(<AuthGate />);
    expect(await screen.findByText('SYNCING TRAINING LOG')).toBeInTheDocument();
  });
});
