import { describe, it, expect, vi, afterEach } from 'vitest';
import * as Sentry from '@sentry/react';
import { initSentry, captureError } from '../sentry.js';

vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  captureException: vi.fn(),
  browserTracingIntegration: vi.fn(() => ({ name: 'BrowserTracing' })),
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe('initSentry', () => {
  it('no-ops when no DSN is configured', () => {
    vi.stubEnv('VITE_SENTRY_DSN', '');
    expect(initSentry()).toBe(false);
    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it('initialises Sentry with the configured DSN and release', () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://k@o1.ingest.de.sentry.io/1');
    vi.stubEnv('VITE_SENTRY_RELEASE', 'splitiq@1.3.0');

    expect(initSentry()).toBe(true);
    expect(Sentry.init).toHaveBeenCalledOnce();

    const cfg = Sentry.init.mock.calls[0][0];
    expect(cfg.dsn).toBe('https://k@o1.ingest.de.sentry.io/1');
    expect(cfg.release).toBe('splitiq@1.3.0');
    expect(cfg.sendDefaultPii).toBe(false);
  });

  // tracesSampleRate alone does nothing: browserTracing is not one of the
  // browser SDK's default integrations, so this assertion is what stops the
  // tracing config silently reverting to inert.
  it('enables browser tracing so tracesSampleRate is not inert', () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://k@o1.ingest.de.sentry.io/1');

    initSentry();

    expect(Sentry.browserTracingIntegration).toHaveBeenCalledOnce();
    const cfg = Sentry.init.mock.calls[0][0];
    expect(cfg.integrations).toEqual([{ name: 'BrowserTracing' }]);
    expect(cfg.tracesSampleRate).toBe(0.1);
  });

  // vite build sets MODE=production for every build, Vercel target included, so
  // without the injected override a preview deploy files under `production`.
  it('prefers the injected environment over MODE', () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://k@o1.ingest.de.sentry.io/1');
    vi.stubEnv('VITE_SENTRY_ENVIRONMENT', 'preview');

    initSentry();

    expect(Sentry.init.mock.calls[0][0].environment).toBe('preview');
  });

  it('falls back to MODE when no environment is injected', () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://k@o1.ingest.de.sentry.io/1');
    vi.stubEnv('VITE_SENTRY_ENVIRONMENT', '');

    initSentry();

    expect(Sentry.init.mock.calls[0][0].environment).toBe(import.meta.env.MODE);
  });

  it('propagates trace headers to Supabase and same-origin only', () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://k@o1.ingest.de.sentry.io/1');
    vi.stubEnv('VITE_SUPABASE_URL', 'https://abc.supabase.co');

    initSentry();

    const cfg = Sentry.init.mock.calls[0][0];
    expect(cfg.tracePropagationTargets).toEqual([
      /^\//,
      'https://abc.supabase.co',
    ]);
  });

  it('falls back to same-origin when the Supabase URL is missing or unparseable', () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://k@o1.ingest.de.sentry.io/1');
    vi.stubEnv('VITE_SUPABASE_URL', 'not-a-url');

    initSentry();

    expect(Sentry.init.mock.calls[0][0].tracePropagationTargets).toEqual([
      /^\//,
    ]);
  });
});

describe('captureError', () => {
  it('forwards the error with its context as extra', () => {
    const error = new Error('boom');
    captureError(error, { queryKey: ['sessions'] });

    expect(Sentry.captureException).toHaveBeenCalledWith(error, {
      extra: { queryKey: ['sessions'] },
    });
  });

  it('omits the extra payload when no context is given', () => {
    const error = new Error('boom');
    captureError(error);

    expect(Sentry.captureException).toHaveBeenCalledWith(error, undefined);
  });

  it('ignores a null error', () => {
    captureError(null);
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });
});
