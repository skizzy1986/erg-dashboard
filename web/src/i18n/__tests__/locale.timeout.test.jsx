import { Suspense } from 'react';
import { render, screen, act } from '@testing-library/react';
import { Trans } from '@lingui/react/macro';
import { i18n } from '@lingui/core';
import LanguageProvider from '../LanguageProvider.jsx';
import LanguageToggle from '../../components/LanguageToggle.jsx';
import {
  LOCALE_TIMEOUT_MS,
  bootLocale,
  ensureLocale,
  registerCatalogs,
  __resetLocaleCacheForTests,
} from '../locale.js';
import { LANG_KEY } from '../lang.js';
import '../dashboard.js';
import { messages as en } from '../../locales/en.po';

const sentry = vi.hoisted(() => ({ captureError: vi.fn() }));
vi.mock('../../utils/sentry.js', () => sentry);

// A loader that hangs until the test releases it, as a stalled chunk fetch does.
function hangingCatalog(product) {
  const state = { calls: 0, release: null };
  registerCatalogs(product, {
    source: en,
    loaders: {
      es: () => {
        state.calls += 1;
        return new Promise((resolve) => {
          state.release = () =>
            resolve({ messages: { ...en, LATE: 'llegó tarde' } });
        });
      },
    },
  });
  return state;
}

beforeEach(() => {
  // Only the timer under test: React's scheduler runs on setImmediate here, and
  // faking it would stall every render.
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  __resetLocaleCacheForTests();
  sentry.captureError.mockClear();
  window.localStorage.clear();
  i18n.activate('en');
});

afterEach(() => {
  vi.useRealTimers();
});

describe('catalog load timeout', () => {
  it('resolves false at the timeout, reports once, and never rejects', async () => {
    hangingCatalog('stalled');
    const result = ensureLocale('es', 'stalled');
    let settled = false;
    result.then(() => (settled = true));

    await vi.advanceTimersByTimeAsync(LOCALE_TIMEOUT_MS - 1);
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    await expect(result).resolves.toBe(false);
    expect(sentry.captureError).toHaveBeenCalledTimes(1);
    expect(sentry.captureError).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/timed out/) }),
      { where: 'i18n', product: 'stalled', lang: 'es' }
    );
  });

  it('bootLocale resolves false at the timeout and leaves English active', async () => {
    hangingCatalog('stalled');
    const boot = bootLocale('es', 'stalled');
    await vi.advanceTimersByTimeAsync(LOCALE_TIMEOUT_MS);
    await expect(boot).resolves.toBe(false);
    expect(i18n.locale).toBe('en');
  });

  it('a catalog that arrives after the timeout neither loads nor flips the language', async () => {
    const catalog = hangingCatalog('stalled');
    const boot = bootLocale('es', 'stalled');
    await vi.advanceTimersByTimeAsync(LOCALE_TIMEOUT_MS);
    await boot;

    catalog.release();
    await vi.advanceTimersByTimeAsync(0);

    expect(i18n.locale).toBe('en');
    expect(i18n.messages.LATE).toBeUndefined();
    expect(sentry.captureError).toHaveBeenCalledTimes(1);
  });

  it('is not cached: asking again after a timeout fetches again', async () => {
    const catalog = hangingCatalog('stalled');
    const first = ensureLocale('es', 'stalled');
    await vi.advanceTimersByTimeAsync(LOCALE_TIMEOUT_MS);
    await first;

    const second = ensureLocale('es', 'stalled');
    expect(catalog.calls).toBe(2);
    catalog.release();
    await expect(second).resolves.toBe(true);
  });

  it('a catalog inside the window loads normally and clears its timer', async () => {
    const catalog = hangingCatalog('quick');
    const result = ensureLocale('es', 'quick');
    catalog.release();
    await expect(result).resolves.toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('a stored Spanish choice whose catalog stalls paints English with the status, not the ground forever', async () => {
    hangingCatalog('stalled');
    window.localStorage.setItem(LANG_KEY, 'es');
    const boot = bootLocale('es', 'stalled');
    await vi.advanceTimersByTimeAsync(LOCALE_TIMEOUT_MS);
    // React throttles a Suspense retry on setTimeout, so the render itself runs
    // on real timers; the boot it suspends on is the one that just timed out.
    vi.useRealTimers();
    await act(async () => {
      render(
        <Suspense fallback={<p>ground</p>}>
          <LanguageProvider product="stalled">
            <p>
              <Trans>Settings</Trans>
            </p>
            <LanguageToggle />
          </LanguageProvider>
        </Suspense>
      );
      await boot;
    });
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.queryByText('ground')).toBeNull();
    expect(screen.getByText(/Spanish could not be loaded/)).toBeInTheDocument();
    expect(document.documentElement.getAttribute('lang')).toBe('en');
  });
});
