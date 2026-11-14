import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LanguageToggle, { LanguageStatus } from '../LanguageToggle.jsx';
import LanguageProvider from '../../i18n/LanguageProvider.jsx';
import '../../i18n/dashboard.js';
import {
  __resetLocaleCacheForTests,
  registerCatalogs,
} from '../../i18n/locale.js';

vi.mock('../../utils/sentry.js', () => ({ captureError: vi.fn() }));

beforeEach(() => {
  __resetLocaleCacheForTests();
  window.localStorage.clear();
});

describe('LanguageToggle', () => {
  it('segmented: one 44px button per language, named with its own name', () => {
    render(
      <LanguageProvider product="dashboard">
        <LanguageToggle />
      </LanguageProvider>
    );
    expect(screen.getByRole('group', { name: 'Language' })).toBeInTheDocument();
    const es = screen.getByRole('button', { name: 'ES, Español' });
    expect(es).toHaveTextContent(/^ES/);
    expect(es).toHaveAttribute('aria-pressed', 'false');
    expect(es.querySelector('[lang="es-CO"]')).not.toBeNull();
    expect(es.style.minWidth).toBe('44px');
    expect(es.style.minHeight).toBe('44px');
  });

  it('cycle: a single button that flips the language and renames itself', async () => {
    render(
      <LanguageProvider product="dashboard">
        <LanguageToggle variant="cycle" />
      </LanguageProvider>
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Language: English (EN). Switch to Spanish',
      })
    );
    await waitFor(() =>
      expect(
        screen.getByRole('button', {
          name: 'Idioma: español (ES). Cambiar a inglés',
        })
      ).toHaveTextContent('ES')
    );
  });

  it('is inert and English outside a provider', () => {
    render(<LanguageToggle variant="cycle" />);
    const button = screen.getByRole('button', { name: /Switch to Spanish/ });
    fireEvent.click(button);
    expect(button).toHaveTextContent('EN');
  });

  it('withStatus={false} leaves the failure line to a LanguageStatus placed elsewhere', async () => {
    registerCatalogs('broken', {
      source: {},
      loaders: { es: () => Promise.reject(new Error('chunk 404')) },
    });
    render(
      <LanguageProvider product="broken">
        <div data-testid="row">
          <LanguageToggle variant="cycle" withStatus={false} />
        </div>
        <div data-testid="below">
          <LanguageStatus />
        </div>
      </LanguageProvider>
    );
    expect(screen.getByTestId('row').querySelector('[aria-live]')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Switch to Spanish/ }));
    await waitFor(() =>
      expect(screen.getByTestId('below')).toHaveTextContent(
        'Spanish could not be loaded. Check your connection and reload the page.'
      )
    );
    expect(screen.getByTestId('row')).not.toHaveTextContent(/could not/);
  });
});
