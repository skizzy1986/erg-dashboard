import { Suspense, Component } from 'react';
import {
  render,
  screen,
  act,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import { Trans } from '@lingui/react/macro';
import { i18n } from '@lingui/core';
import LanguageProvider, { useLanguage } from '../LanguageProvider.jsx';
import LanguageToggle from '../../components/LanguageToggle.jsx';
import {
  bootLocale,
  registerCatalogs,
  __resetLocaleCacheForTests,
} from '../locale.js';
import { LANG_KEY } from '../lang.js';
import '../dashboard.js';
import { messages as en } from '../../locales/en.po';

const sentry = vi.hoisted(() => ({ captureError: vi.fn() }));
vi.mock('../../utils/sentry.js', () => sentry);

function Probe() {
  const { lang } = useLanguage();
  return (
    <div>
      <p data-testid="msg">
        <Trans>Settings</Trans>
      </p>
      <span data-testid="lang">{lang}</span>
      <input aria-label="draft" />
      <LanguageToggle />
    </div>
  );
}

class Boundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    return this.state.error ? <p>boundary caught</p> : this.props.children;
  }
}

function mount(product = 'dashboard') {
  return render(
    <Boundary>
      <Suspense fallback={<p>ground</p>}>
        <LanguageProvider product={product}>
          <Probe />
        </LanguageProvider>
      </Suspense>
    </Boundary>
  );
}

// A switch resolves after the catalog's dynamic import, a macrotask later;
// the control reports aria-busy until then.
async function choose(button) {
  fireEvent.click(button());
  await waitFor(() => expect(document.querySelector('[aria-busy]')).toBeNull());
}

const esButton = () => screen.getByRole('button', { name: 'ES, Español' });
const enButton = () => screen.getByRole('button', { name: 'EN, English' });

let failingLoader;
beforeEach(() => {
  __resetLocaleCacheForTests();
  sentry.captureError.mockClear();
  window.localStorage.clear();
  document.documentElement.setAttribute('lang', 'en');
  failingLoader = vi.fn(() => Promise.reject(new Error('chunk 404')));
  registerCatalogs('broken', { source: en, loaders: { es: failingLoader } });
});

describe('LanguageProvider', () => {
  it('starts in English on a first visit', () => {
    mount();
    expect(screen.getByTestId('msg')).toHaveTextContent('Settings');
    expect(screen.getByTestId('lang')).toHaveTextContent('en');
    expect(enButton()).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement.getAttribute('lang')).toBe('en');
  });

  it('switches in place: Spanish text, <html lang>, the shared key, input kept', async () => {
    mount();
    const draft = screen.getByLabelText('draft');
    fireEvent.change(draft, { target: { value: 'half-typed' } });

    await choose(esButton);

    expect(screen.getByTestId('msg')).toHaveTextContent('Configuración');
    expect(document.documentElement.getAttribute('lang')).toBe('es-CO');
    expect(window.localStorage.getItem(LANG_KEY)).toBe('es');
    // Same element, same value: the tree was not remounted by the switch.
    expect(screen.getByLabelText('draft')).toBe(draft);
    expect(draft).toHaveValue('half-typed');
    // The control's own group name follows the language.
    expect(screen.getByRole('group', { name: 'Idioma' })).toBeInTheDocument();

    await choose(enButton);
    expect(screen.getByTestId('msg')).toHaveTextContent('Settings');
    expect(document.documentElement.getAttribute('lang')).toBe('en');
    expect(window.localStorage.getItem(LANG_KEY)).toBe('en');
  });

  it('hands <html lang> back on unmount', async () => {
    document.documentElement.setAttribute('lang', 'xx');
    const { unmount } = mount();
    await choose(esButton);
    expect(document.documentElement.getAttribute('lang')).toBe('es-CO');
    unmount();
    expect(document.documentElement.getAttribute('lang')).toBe('xx');
  });

  it('holds a stored Spanish choice on the fallback, then paints Spanish — never English first', async () => {
    window.localStorage.setItem(LANG_KEY, 'es');
    // Every state the document passes through, so a one-commit English flash
    // between the fallback and the Spanish paint cannot hide.
    const seen = [];
    const observer = new window.MutationObserver(() =>
      seen.push(document.body.textContent)
    );
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    try {
      // A Suspense retry only flushes inside an awaited act() under React's
      // test environment.
      await act(async () => {
        mount();
        await bootLocale('es', 'dashboard');
      });
    } finally {
      observer.disconnect();
    }
    expect(seen.some((t) => t.includes('ground'))).toBe(true);
    expect(seen.some((t) => t.includes('Settings'))).toBe(false);
    expect(screen.getByText('Configuración')).toBeInTheDocument();
    expect(document.documentElement.getAttribute('lang')).toBe('es-CO');
  });

  it('works for the visit when storage is blocked, without throwing or reporting', async () => {
    const get = vi
      .spyOn(window.Storage.prototype, 'getItem')
      .mockImplementation(() => {
        throw new Error('SecurityError');
      });
    const set = vi
      .spyOn(window.Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
    try {
      mount();
      await choose(esButton);
      expect(screen.getByTestId('msg')).toHaveTextContent('Configuración');
      expect(sentry.captureError).not.toHaveBeenCalled();
    } finally {
      get.mockRestore();
      set.mockRestore();
    }
  });

  it('stays English, reports once and persists nothing when the catalog fails', async () => {
    mount('broken');
    await choose(esButton);
    expect(screen.getByTestId('msg')).toHaveTextContent('Settings');
    expect(screen.getByTestId('lang')).toHaveTextContent('en');
    expect(screen.getByText(/Spanish could not be loaded/)).toBeInTheDocument();
    expect(sentry.captureError).toHaveBeenCalledTimes(1);
    expect(sentry.captureError).toHaveBeenCalledWith(expect.any(Error), {
      where: 'i18n',
      product: 'broken',
      lang: 'es',
    });
    expect(window.localStorage.getItem(LANG_KEY)).toBeNull();

    // The failure is not cached: asking again fetches again.
    await choose(esButton);
    expect(failingLoader).toHaveBeenCalledTimes(2);
  });

  it('renders English, not an error boundary, when a stored choice cannot load', async () => {
    window.localStorage.setItem(LANG_KEY, 'es');
    await act(async () => {
      mount('broken');
      await bootLocale('es', 'broken');
    });
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.queryByText('boundary caught')).toBeNull();
    expect(screen.getByText(/Spanish could not be loaded/)).toBeInTheDocument();
    expect(sentry.captureError).toHaveBeenCalledTimes(1);
    expect(i18n.locale).toBe('en');
  });

  it('keeps the latest choice when an earlier one resolves after it', async () => {
    let release;
    registerCatalogs('slow', {
      source: en,
      loaders: {
        es: () =>
          new Promise((resolve) => {
            release = () => resolve({ messages: {} });
          }),
      },
    });
    mount('slow');
    fireEvent.click(esButton());
    await choose(enButton);
    await act(async () => {
      release();
    });
    expect(screen.getByTestId('lang')).toHaveTextContent('en');
    expect(i18n.locale).toBe('en');
    expect(window.localStorage.getItem(LANG_KEY)).toBe('en');
  });

  it('ignores a language it does not know', async () => {
    const api = {};
    function Grab() {
      Object.assign(api, useLanguage());
      return null;
    }
    render(
      <LanguageProvider product="dashboard">
        <Grab />
      </LanguageProvider>
    );
    await act(async () => {
      await api.setLang('fr');
    });
    expect(api.lang).toBe('en');
    expect(api.pending).toBe(false);
  });
});
