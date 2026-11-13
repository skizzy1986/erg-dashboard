import { render, screen } from '@testing-library/react';
import { LANG_KEY } from '../lang.js';

// AC 8: the offline first-visit message reads the stored language before any
// chunk — and so before any catalog — has loaded.
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false },
}));
vi.mock('../../AuthGate.jsx', () => ({ default: () => null }));
vi.mock('../../squat/SquatApp.jsx', () => {
  throw new Error('Failed to fetch dynamically imported module');
});

beforeEach(() => {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    get: () => false,
  });
});
afterEach(() => {
  delete window.navigator.onLine;
  window.localStorage.clear();
});

async function renderSquat() {
  window.history.replaceState(null, '', '/squat');
  vi.resetModules();
  const { default: RouteRoot } = await import('../../RouteRoot.jsx');
  return render(<RouteRoot />);
}

describe('RouteRoot offline message', () => {
  it('is Spanish, and tagged es-CO, for a visitor who chose Spanish', async () => {
    window.localStorage.setItem(LANG_KEY, 'es');
    await renderSquat();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      'La herramienta de sentadilla necesita conexión la primera vez.'
    );
    expect(alert).toHaveAttribute('lang', 'es-CO');
  });

  it('stays English by default', async () => {
    await renderSquat();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/needs a connection the first time/);
    expect(alert).toHaveAttribute('lang', 'en');
  });
});
