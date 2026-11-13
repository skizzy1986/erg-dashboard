import { render, screen, act, fireEvent, within } from '@testing-library/react';
import { i18n } from '@lingui/core';
import { messages as en } from '../../locales/en.po';
import { messages as es } from '../../locales/es.po';
import { LANG_KEY } from '../lang.js';
import { __resetLocaleCacheForTests, bootLocale } from '../locale.js';
import {
  computePersonalBaselines,
  computeReadiness,
  HRV_DEFAULT,
  RHR_DEFAULT,
} from '../../utils/recoveryAnalytics.js';
import { THEME } from '../../constants/theme.js';

// AC 9: every Phase-1 dashboard surface renders Spanish. AC 10: a view still
// waiting for its #412 slice renders whole English in Spanish mode.

const mocks = vi.hoisted(() => ({
  native: false,
  signIn: null,
  connection: null,
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => mocks.native },
}));
vi.mock('../../supabaseClient.js', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
      signInWithPassword: (...a) => mocks.signIn(...a),
    },
  },
}));
vi.mock('../../utils/sentry.js', () => ({ captureError: vi.fn() }));
vi.mock('../../hooks/useIsMobile.js', () => ({ useIsMobile: () => false }));
vi.mock('../../hooks/useInitialDataReady.js', () => ({
  useInitialDataReady: () => false,
}));
vi.mock('../../hooks/usePWAInstall.js', () => ({
  usePWAInstall: () => ({
    canInstall: true,
    installed: false,
    installPrompt: () => {},
  }),
}));
vi.mock('../../hooks/useStravaConnection.js', async () => {
  const { describeConnection } = await import('../../utils/stravaStatus.js');
  return {
    useStravaConnection: () => ({
      status: mocks.connection
        ? describeConnection(mocks.connection, new Date('2026-11-13T12:00:00'))
        : null,
      connection: mocks.connection,
      isLoading: false,
      isError: !mocks.connection,
      refetch: () => {},
    }),
  };
});
vi.mock('../../hooks/useStravaConnect.js', () => ({
  useStravaConnect: () => ({
    start: { isPending: false, isError: true, mutate: () => {} },
    disconnect: { isPending: false },
    requestDisconnect: () => {},
  }),
}));
vi.mock('../../hooks/useStravaSync.js', () => ({
  useStravaSync: () => ({ isPending: false, isError: true, mutate: () => {} }),
}));
vi.mock('../../hooks/useVitals.js', () => {
  const row = { date: '2026-08-21', rhr: 55, hrv: 60, sleep: 8 };
  return {
    useVitals: () => ({ latest: row, readiness: null, personalBaselines: {} }),
  };
});
vi.mock('../../hooks/useAnchors.js', () => ({
  useAnchors: () => ({ cp: 205, ftp: 250, cpAvailable: true }),
}));

import AuthGate from '../../AuthGate.jsx';
import BottomTabBar from '../../components/mobile/BottomTabBar.jsx';
import SettingsView from '../../views/SettingsView.jsx';
import SplashScreen from '../../components/mobile/SplashScreen.jsx';
import ErrorFallback from '../../components/ErrorFallback.jsx';
import OverviewView from '../../views/OverviewView.jsx';
import LanguageProvider from '../LanguageProvider.jsx';

// Every Spanish string the catalog holds and no English one does: a node that
// shows one of these inside an "English" view is a half-translated sentence.
const spanishOnly = () => {
  const english = new Set(
    Object.values(en)
      .flat()
      .filter((v) => typeof v === 'string')
  );
  return Object.values(es)
    .flat()
    .filter((v) => typeof v === 'string' && v.trim().length > 3)
    .filter((v) => !english.has(v));
};

const inSpanish = () => {
  window.localStorage.setItem(LANG_KEY, 'es');
};

// The Spanish catalog for components rendered without the provider.
const activateSpanish = () => {
  i18n.load('es', { ...en, ...es });
  i18n.activate('es');
};

// A stored Spanish choice suspends the first render on the catalog. Awaiting
// the same promise inside act() makes the retry deterministic; a dynamic
// import can otherwise settle after act() has returned.
async function settle(ui) {
  await act(async () => {
    render(ui);
    if (window.localStorage.getItem(LANG_KEY) === 'es') {
      await bootLocale('es', 'dashboard');
    }
  });
}

const mountGate = () => settle(<AuthGate />);

beforeEach(() => {
  __resetLocaleCacheForTests();
  window.localStorage.clear();
  mocks.native = false;
  mocks.signIn = vi.fn().mockResolvedValue({ error: null });
  mocks.connection = null;
});

describe('Login in Spanish', () => {
  it('labels the form, the button and the install control in Spanish', async () => {
    inSpanish();
    await mountGate();
    expect(
      screen.getByText('Inicia sesión para continuar')
    ).toBeInTheDocument();
    expect(screen.getByLabelText('CORREO ELECTRÓNICO')).toBeInTheDocument();
    expect(screen.getByLabelText('CONTRASEÑA')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'INICIAR SESIÓN' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /AGREGAR A LA PANTALLA DE INICIO/ })
    ).toBeInTheDocument();
    expect(document.documentElement.getAttribute('lang')).toBe('es-CO');
  });

  it('puts the language control on the login card, named in the active language', async () => {
    await mountGate();
    const toggle = screen.getByRole('button', {
      name: 'Language: English (EN). Switch to Spanish',
    });
    expect(toggle).toHaveTextContent('EN');
    const form = toggle.closest('form');
    expect(form).not.toBeNull();
    // The failure line is the card's own full-width row, not squeezed beside
    // the toggle in the header (360px phones).
    expect(form.querySelector('[aria-live]').parentElement).toBe(form);

    fireEvent.change(screen.getByLabelText('EMAIL'), {
      target: { value: 'a@b.co' },
    });
    fireEvent.click(toggle);
    expect(
      await screen.findByRole('button', {
        name: 'Idioma: español (ES). Cambiar a inglés',
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Inicia sesión para continuar')
    ).toBeInTheDocument();
    // A half-filled form survives the switch.
    expect(screen.getByLabelText('CORREO ELECTRÓNICO')).toHaveValue('a@b.co');
    expect(window.localStorage.getItem(LANG_KEY)).toBe('es');
  });

  it('shows the language control in the Android shell too', async () => {
    mocks.native = true;
    await mountGate();
    expect(
      screen.getByRole('button', { name: /Switch to Spanish/ })
    ).toBeInTheDocument();
  });

  it('validates in Spanish and re-reads the error on a switch', async () => {
    await mountGate();
    const form = document.querySelector('form');
    await act(async () => {
      fireEvent.submit(form);
    });
    expect(screen.getByText('Enter email and password.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Switch to Spanish/ }));
    expect(
      await screen.findByText('Ingresa tu correo y tu contraseña.')
    ).toBeInTheDocument();
    expect(screen.queryByText('Enter email and password.')).toBeNull();
  });

  it.each([
    [
      { code: 'invalid_credentials', message: 'Invalid login credentials' },
      'Correo o contraseña incorrectos.',
    ],
    [
      { code: 'email_not_confirmed', message: 'Email not confirmed' },
      'Confirma tu correo electrónico antes de iniciar sesión.',
    ],
    [
      { code: 'over_request_rate_limit', message: 'Rate limit' },
      'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.',
    ],
    [
      { name: 'AuthRetryableFetchError', message: 'Failed to fetch' },
      'No pudimos conectarnos con el servidor. Revisa tu conexión e inténtalo de nuevo.',
    ],
    [
      { code: 'something_new', message: 'Brand new failure' },
      'No pudimos iniciar sesión. Inténtalo de nuevo.',
    ],
  ])('maps a Supabase error %j to Spanish', async (error, spanish) => {
    inSpanish();
    mocks.signIn = vi.fn().mockResolvedValue({ error });
    await mountGate();
    fireEvent.change(screen.getByLabelText('CORREO ELECTRÓNICO'), {
      target: { value: 'a@b.co' },
    });
    fireEvent.change(screen.getByLabelText('CONTRASEÑA'), {
      target: { value: 'pw' },
    });
    await act(async () => {
      fireEvent.submit(document.querySelector('form'));
    });
    expect(screen.getByText(spanish)).toBeInTheDocument();
    expect(screen.queryByText(error.message)).toBeNull();
  });

  it('keeps showing the server message verbatim in English', async () => {
    mocks.signIn = vi.fn().mockResolvedValue({
      error: {
        code: 'invalid_credentials',
        message: 'Invalid login credentials',
      },
    });
    await mountGate();
    fireEvent.change(screen.getByLabelText('EMAIL'), {
      target: { value: 'a@b.co' },
    });
    fireEvent.change(screen.getByLabelText('PASSWORD'), {
      target: { value: 'pw' },
    });
    await act(async () => {
      fireEvent.submit(document.querySelector('form'));
    });
    expect(screen.getByText('Invalid login credentials')).toBeInTheDocument();
  });
});

describe('Shell in Spanish', () => {
  it('labels the mobile tab bar', () => {
    activateSpanish();
    render(<BottomTabBar activeTab="today" onTabChange={() => {}} />);
    for (const label of ['Hoy', 'Entrenar', 'Progreso', 'Cuerpo']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('translates the splash and the whole-app error screen', () => {
    activateSpanish();
    render(<SplashScreen />);
    expect(
      screen.getByText('SINCRONIZANDO REGISTRO DE ENTRENAMIENTO')
    ).toBeInTheDocument();

    // The root fallback renders outside every provider, from storage alone.
    inSpanish();
    render(<ErrorFallback resetError={() => {}} />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('lang', 'es-CO');
    expect(within(alert).getByText('ALGO SALIÓ MAL')).toBeInTheDocument();
    expect(
      within(alert).getByRole('button', { name: 'INTÉNTALO DE NUEVO' })
    ).toBeInTheDocument();
  });
});

describe('Settings in Spanish', () => {
  async function mountSettings() {
    inSpanish();
    await settle(
      <LanguageProvider product="dashboard">
        <SettingsView />
      </LanguageProvider>
    );
  }

  it('titles the page and puts a Language section on it', async () => {
    mocks.connection = { connected: false };
    await mountSettings();
    expect(screen.getByText('CONFIGURACIÓN')).toBeInTheDocument();
    // Language has its own heading, not a label under Integrations.
    expect(
      screen.getByRole('heading', { level: 2, name: 'Integraciones' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Idioma' })
    ).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Idioma' })).toContainElement(
      screen.getByRole('group', { name: 'Idioma' })
    );
    expect(screen.getByRole('group', { name: 'Idioma' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ES, Español' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('renders the Strava panel and its states in Spanish', async () => {
    mocks.connection = {
      connected: true,
      last_run_status: 'ok',
      last_run_at: '2026-11-13T10:00:00',
      imported_total: 12,
      adopted_total: 1,
      backfill_complete: true,
    };
    await mountSettings();
    expect(
      screen.getByRole('region', { name: 'Conexión con Strava' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Última sincronización hace 2 horas')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        '12 sesiones importadas desde que conectaste; 1 actividad coincidió con sesiones que ya están en el registro.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Sincronizar ahora' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Desconectar' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Falló la sincronización. Inténtalo de nuevo.')
    ).toBeInTheDocument();
  });

  it('renders the Strava error state in Spanish', async () => {
    await mountSettings();
    expect(
      screen.getByText('No pudimos leer el estado de la conexión con Strava')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Reintentar' })
    ).toBeInTheDocument();
  });
});

describe('A view still waiting for its #412 slice', () => {
  it('renders whole English in Spanish mode, with no Spanish string inside it', () => {
    activateSpanish();
    const vitals = {
      date: '2026-08-21',
      rhr: RHR_DEFAULT,
      hrv: HRV_DEFAULT,
      sleep: 8,
    };
    const baselines = computePersonalBaselines([vitals]);
    computeReadiness(vitals, baselines, -5);
    const { container } = render(
      <OverviewView
        latest={{ tsb: -5, ctl: 62, atl: 67 }}
        tsbColor={THEME.caution}
        loadData={[{ date: '6/7', ctl: 55, atl: 60, tsb: -5, tss: 50 }]}
        loggedSessions={[]}
        latestErg={null}
        totalErgDist={0}
        totalSessions={0}
        isWide
      />
    );
    expect(screen.getByText(/Rowing CP 205W/)).toBeInTheDocument();
    const text = container.textContent;
    const leaked = spanishOnly().filter((s) => text.includes(s));
    expect(leaked).toEqual([]);
  });
});
