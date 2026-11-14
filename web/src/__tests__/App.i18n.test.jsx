import {
  render,
  screen,
  act,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import { __resetLocaleCacheForTests } from '../i18n/locale.js';
import LanguageProvider, { useLanguage } from '../i18n/LanguageProvider.jsx';
import '../i18n/dashboard.js';

const sessionsChain = {
  select: () => sessionsChain,
  order: () => sessionsChain,
  then: (resolve, reject) =>
    Promise.resolve({ data: [], error: null }).then(resolve, reject),
};
vi.mock('../supabaseClient.js', () => ({
  supabase: { from: () => sessionsChain },
}));
vi.mock('../utils/sentry.js', () => ({ captureError: vi.fn() }));
vi.mock('../hooks/useTSSHistory.js', () => ({
  useTSSHistory: () => ({ data: [], isLoading: false, isError: false }),
}));
vi.mock('../views/OverviewView.jsx', () => ({ default: () => null }));
// Surfaces the notice App hands down, so the test reads App's own output.
vi.mock('../views/SettingsView.jsx', () => ({
  default: ({ notice }) => <p data-testid="notice">{notice?.text}</p>,
}));

import App from '../App.jsx';

function Switch() {
  const { setLang } = useLanguage();
  return (
    <button type="button" onClick={() => setLang('es')}>
      to-es
    </button>
  );
}

async function mountAt(hash) {
  window.history.replaceState(null, '', `/${hash}`);
  await act(async () => {
    render(
      <LanguageProvider product="dashboard">
        <Switch />
        <App />
      </LanguageProvider>
    );
  });
}

// The switch resolves after the catalog's dynamic import, a macrotask later.
async function toSpanish() {
  fireEvent.click(screen.getByRole('button', { name: 'to-es' }));
  await waitFor(() =>
    expect(document.documentElement.getAttribute('lang')).toBe('es-CO')
  );
}

beforeEach(() => {
  __resetLocaleCacheForTests();
  window.localStorage.clear();
});

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('App in Spanish after a runtime switch', () => {
  it('re-reads the Strava callback notice in the new language', async () => {
    await mountAt('#/settings?strava=connected');
    const notice = await screen.findByTestId('notice');
    expect(notice).toHaveTextContent(/^Strava connected\./);

    await toSpanish();
    expect(screen.getByTestId('notice')).toHaveTextContent(
      /^Strava conectado\./
    );
    expect(screen.getByTestId('notice')).not.toHaveTextContent(
      /Strava connected/
    );
  });

  it('re-reads a failed callback, reason included', async () => {
    await mountAt('#/settings?strava=error&reason=state');
    expect(await screen.findByTestId('notice')).toHaveTextContent(
      /^Strava could not be connected\. The connection link had expired/
    );

    await toSpanish();
    expect(screen.getByTestId('notice')).not.toHaveTextContent(
      /could not be connected|connection link/
    );
  });

  it('translates the desktop footer and keeps the brand names', async () => {
    await mountAt('');
    expect(
      screen.getByText(/^Tap any session to expand · Share Concept2 links/)
    ).toBeInTheDocument();

    await toSpanish();
    const footer = screen.getByText(/^Toca cualquier sesión/);
    expect(footer).toHaveTextContent(/Concept2/);
    expect(footer).toHaveTextContent(/Fitbod/);
    expect(screen.queryByText(/Tap any session/)).toBeNull();
  });
});
