import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Suspense } from 'react';
import {
  render,
  screen,
  act,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import { Trans } from '@lingui/react/macro';
import { i18n } from '@lingui/core';
import LanguageProvider from '../LanguageProvider.jsx';
import LanguageToggle from '../../components/LanguageToggle.jsx';
import {
  LOCALE_TIMEOUT_MS,
  bootLocale,
  ensureLocale,
  localeReady,
  prefetchLocale,
  registerCatalogs,
  registerPrefetch,
  __resetLocaleCacheForTests,
} from '../locale.js';
import { LANG_KEY } from '../lang.js';
import '../dashboard.js';
import '../views.js';
import { messages as bootEn } from '../../locales/en.po';
import { messages as viewsEn } from '../../locales/views/en.po';
import { linguiId } from '../../../scripts/i18n-review-sheet.mjs';

// i18n Phase 2a: a product with more than one catalog. The dashboard's views
// catalog registers when a lazy shell loads, after the boot catalog; asking
// for Spanish loads every registered catalog, and a Spanish visitor is held
// until a late one arrives or falls back to English.

const sentry = vi.hoisted(() => ({ captureError: vi.fn() }));
vi.mock('../../utils/sentry.js', () => sentry);

// A catalog whose Spanish arrives only when the test releases it.
function controlled(product, name, source, es) {
  const state = { calls: 0, release: null, fail: null };
  registerCatalogs(product, {
    name,
    source,
    loaders: {
      es: () => {
        state.calls += 1;
        return new Promise((resolve, reject) => {
          state.release = () => resolve({ messages: es });
          state.fail = () => reject(new Error('chunk 404'));
        });
      },
    },
  });
  return state;
}

const BOOT_EN = { b1: 'Settings', shared: 'Loading…' };
const VIEWS_EN = { v1: 'THIS WEEK', shared: 'Loading…' };

beforeEach(() => {
  __resetLocaleCacheForTests();
  sentry.captureError.mockClear();
  window.localStorage.clear();
  document.documentElement.setAttribute('lang', 'en');
});

describe('the dashboard views catalog', () => {
  it('registers with the dashboard, and Spanish loads both catalogs', async () => {
    expect(localeReady('es', 'dashboard')).toBe(false);
    expect(await ensureLocale('es', 'dashboard')).toBe(true);
    expect(localeReady('es', 'dashboard')).toBe(true);
    i18n.activate('es');
    expect(i18n._({ id: linguiId('THIS WEEK') })).toBe('ESTA SEMANA');
    expect(i18n._({ id: linguiId('Settings') })).toBe('Configuración');
  });

  it('falls back to English, per message, for a views message Spanish lacks', async () => {
    const boot = controlled('fb', 'main', BOOT_EN, { b1: 'Configuración' });
    const views = controlled('fb', 'views', VIEWS_EN, { shared: 'Cargando…' });
    const done = ensureLocale('es', 'fb');
    boot.release();
    views.release();
    expect(await done).toBe(true);
    i18n.activate('es');
    expect(i18n._({ id: 'v1' })).toBe('THIS WEEK');
    expect(i18n._({ id: 'b1' })).toBe('Configuración');
  });

  it('never lets a late catalog put English back over Spanish already loaded', async () => {
    const boot = controlled('late', 'main', BOOT_EN, {
      b1: 'Configuración',
      shared: 'Cargando…',
    });
    const first = ensureLocale('es', 'late');
    boot.release();
    await first;
    // The views catalog arrives later and its Spanish lacks the shared id.
    const views = controlled('late', 'views', VIEWS_EN, { v1: 'ESTA SEMANA' });
    const second = ensureLocale('es', 'late');
    views.release();
    expect(await second).toBe(true);
    i18n.activate('es');
    expect(i18n._({ id: 'shared' })).toBe('Cargando…');
    expect(i18n._({ id: 'v1' })).toBe('ESTA SEMANA');
    // The boot catalog was not fetched twice.
    expect(boot.calls).toBe(1);
  });
});

function Probe() {
  return (
    <>
      <p data-testid="views">
        <Trans>THIS WEEK</Trans>
      </p>
      <p data-testid="boot">
        <Trans>Settings</Trans>
      </p>
      <LanguageToggle />
    </>
  );
}

const mount = (product) =>
  render(
    <Suspense fallback={<p>ground</p>}>
      <LanguageProvider product={product}>
        <Probe />
      </LanguageProvider>
    </Suspense>
  );

describe('LanguageProvider with a views catalog', () => {
  it('a runtime switch loads the views Spanish too, without suspending', async () => {
    mount('dashboard');
    const draft = screen.getByTestId('views');
    fireEvent.click(screen.getByRole('button', { name: 'ES, Español' }));
    await waitFor(() =>
      expect(screen.getByTestId('views')).toHaveTextContent('ESTA SEMANA')
    );
    expect(screen.getByTestId('boot')).toHaveTextContent('Configuración');
    // Same element: the switch did not drop to the fallback and remount.
    expect(screen.getByTestId('views')).toBe(draft);
  });

  it('holds a stored Spanish visitor on the ground when the views catalog registers, then paints Spanish — never English', async () => {
    const boot = controlled('shell', 'main', bootEn, {
      ...bootEn,
      [linguiId('Settings')]: 'Configuración',
    });
    window.localStorage.setItem(LANG_KEY, 'es');
    const booted = bootLocale('es', 'shell');
    boot.release();
    await act(async () => {
      mount('shell');
      await booted;
    });
    expect(screen.getByTestId('boot')).toHaveTextContent('Configuración');

    const seen = [];
    const observer = new window.MutationObserver(() =>
      seen.push(document.body.textContent)
    );
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    const viewsId = linguiId('THIS WEEK');
    let views;
    try {
      await act(async () => {
        // What src/i18n/views.js does when a lazy shell loads.
        views = controlled('shell', 'views', viewsEn, {
          ...viewsEn,
          [viewsId]: 'ESTA SEMANA',
        });
      });
      expect(screen.getByText('ground')).toBeInTheDocument();
      await act(async () => {
        const held = bootLocale('es', 'shell');
        views.release();
        await held;
      });
    } finally {
      observer.disconnect();
    }
    expect(screen.getByTestId('views')).toHaveTextContent('ESTA SEMANA');
    expect(seen.some((t) => t.includes('THIS WEEK'))).toBe(false);
    expect(document.documentElement.getAttribute('lang')).toBe('es-CO');
  });

  it('falls back to English with the status when the views catalog fails', async () => {
    const boot = controlled('broken-views', 'main', bootEn, bootEn);
    window.localStorage.setItem(LANG_KEY, 'es');
    const booted = bootLocale('es', 'broken-views');
    boot.release();
    await act(async () => {
      mount('broken-views');
      await booted;
    });
    let views;
    await act(async () => {
      views = controlled('broken-views', 'views', viewsEn, viewsEn);
    });
    await act(async () => {
      const held = bootLocale('es', 'broken-views');
      views.fail();
      await held;
    });
    expect(screen.getByTestId('views')).toHaveTextContent('THIS WEEK');
    expect(screen.getByText(/Spanish could not be loaded/)).toBeInTheDocument();
    expect(document.documentElement.getAttribute('lang')).toBe('en');
    expect(i18n.locale).toBe('en');
    expect(sentry.captureError).toHaveBeenCalledTimes(1);
    // Nothing persisted over the visitor's choice.
    expect(window.localStorage.getItem(LANG_KEY)).toBe('es');
  });

  it('times a stalled views catalog out at the same limit, and never rejects', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      const boot = controlled('slow-views', 'main', BOOT_EN, BOOT_EN);
      const first = ensureLocale('es', 'slow-views');
      boot.release();
      await first;
      controlled('slow-views', 'views', VIEWS_EN, VIEWS_EN);
      const result = ensureLocale('es', 'slow-views');
      await vi.advanceTimersByTimeAsync(LOCALE_TIMEOUT_MS);
      await expect(result).resolves.toBe(false);
      expect(sentry.captureError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringMatching(/views .*timed out/),
        }),
        { where: 'i18n', product: 'slow-views', lang: 'es' }
      );
    } finally {
      vi.useRealTimers();
    }
  });
});

// A views Spanish prefetch the test releases, and the loader the late
// registration would call if the prefetch were not reused.
function prefetched(product, es) {
  const state = { calls: 0, lateCalls: 0, release: null };
  registerPrefetch(product, {
    name: 'views',
    loaders: {
      es: () => {
        state.calls += 1;
        return new Promise((resolve) => {
          state.release = () => resolve({ messages: es });
        });
      },
    },
  });
  state.register = (source) =>
    registerCatalogs(product, {
      name: 'views',
      source,
      loaders: {
        es: () => {
          state.lateCalls += 1;
          return Promise.resolve({ messages: es });
        },
      },
    });
  return state;
}

describe('prefetching the views Spanish before its catalog registers', () => {
  it('the dashboard boot path names the views Spanish, never its English', () => {
    const src = readFileSync(
      resolve(import.meta.dirname, '../dashboard.js'),
      'utf8'
    );
    expect(src).toMatch(
      /registerPrefetch\('dashboard',[\s\S]*import\('..\/locales\/views\/es\.po'\)/
    );
    expect(src).not.toMatch(/views\/en\.po/);
  });

  it('starts on Spanish, never on English, and only once', async () => {
    const boot = controlled('pf', 'main', BOOT_EN, BOOT_EN);
    const views = prefetched('pf', VIEWS_EN);
    prefetchLocale('en', 'pf');
    await ensureLocale('en', 'pf');
    expect(views.calls).toBe(0);
    const done = ensureLocale('es', 'pf');
    expect(views.calls).toBe(1);
    prefetchLocale('es', 'pf');
    expect(views.calls).toBe(1);
    boot.release();
    // The boot catalog alone decides this switch: views has not registered.
    expect(await done).toBe(true);
  });

  it('a late registration takes the prefetched promise: one fetch, not two', async () => {
    const boot = controlled('reuse', 'main', BOOT_EN, BOOT_EN);
    const views = prefetched('reuse', { v1: 'ESTA SEMANA' });
    const first = ensureLocale('es', 'reuse');
    boot.release();
    await first;
    views.register(VIEWS_EN);
    const second = ensureLocale('es', 'reuse');
    views.release();
    expect(await second).toBe(true);
    expect(views.calls).toBe(1);
    expect(views.lateCalls).toBe(0);
    i18n.activate('es');
    expect(i18n._({ id: 'v1' })).toBe('ESTA SEMANA');
  });

  it('does not prefetch a catalog that has already registered', async () => {
    const boot = controlled('reg', 'main', BOOT_EN, BOOT_EN);
    const views = prefetched('reg', VIEWS_EN);
    views.register(VIEWS_EN);
    const done = ensureLocale('es', 'reg');
    boot.release();
    expect(await done).toBe(true);
    expect(views.calls).toBe(0);
    expect(views.lateCalls).toBe(1);
  });

  it('a failed prefetch is reported once, through the registered load, and the next attempt fetches again', async () => {
    const boot = controlled('pf-fail', 'main', BOOT_EN, BOOT_EN);
    let calls = 0;
    registerPrefetch('pf-fail', {
      name: 'views',
      loaders: {
        es: () => {
          calls += 1;
          return Promise.reject(new Error('chunk 404'));
        },
      },
    });
    const first = ensureLocale('es', 'pf-fail');
    boot.release();
    await first;
    expect(sentry.captureError).not.toHaveBeenCalled();
    let lateCalls = 0;
    registerCatalogs('pf-fail', {
      name: 'views',
      source: VIEWS_EN,
      loaders: {
        es: () => {
          lateCalls += 1;
          return Promise.resolve({ messages: VIEWS_EN });
        },
      },
    });
    expect(await ensureLocale('es', 'pf-fail')).toBe(false);
    expect(sentry.captureError).toHaveBeenCalledTimes(1);
    expect(await ensureLocale('es', 'pf-fail')).toBe(true);
    expect([calls, lateCalls]).toEqual([1, 1]);
  });

  it('a stored Spanish boot starts the prefetch', async () => {
    const boot = controlled('pf-boot', 'main', bootEn, bootEn);
    const views = prefetched('pf-boot', viewsEn);
    window.localStorage.setItem(LANG_KEY, 'es');
    await act(async () => {
      mount('pf-boot');
    });
    expect(views.calls).toBe(1);
    await act(async () => boot.release());
  });

  it('a runtime switch starts the prefetch; English never does', async () => {
    const boot = controlled('pf-switch', 'main', bootEn, bootEn);
    const views = prefetched('pf-switch', viewsEn);
    mount('pf-switch');
    expect(views.calls).toBe(0);
    fireEvent.click(screen.getByRole('button', { name: 'ES, Español' }));
    expect(views.calls).toBe(1);
    await act(async () => boot.release());
  });

  it('Spanish chosen on the login card, then sign-in: the shell paints Spanish without a second fetch', async () => {
    const boot = controlled('login', 'main', bootEn, {
      ...bootEn,
      [linguiId('Settings')]: 'Configuración',
    });
    const viewsId = linguiId('THIS WEEK');
    const views = prefetched('login', { ...viewsEn, [viewsId]: 'ESTA SEMANA' });
    mount('login');
    fireEvent.click(screen.getByRole('button', { name: 'ES, Español' }));
    await act(async () => boot.release());
    await waitFor(() =>
      expect(screen.getByTestId('boot')).toHaveTextContent('Configuración')
    );
    // The views Spanish lands while the visitor is still signing in.
    await act(async () => views.release());
    await act(async () => {
      // Sign-in: the lazy shell loads and src/i18n/views.js registers.
      views.register(viewsEn);
      await bootLocale('es', 'login');
    });
    expect(screen.getByTestId('views')).toHaveTextContent('ESTA SEMANA');
    expect(views.calls).toBe(1);
    expect(views.lateCalls).toBe(0);
  });
});
