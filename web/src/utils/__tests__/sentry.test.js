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

  it('passes a real Error through untouched, with no fingerprint', () => {
    const error = new Error('boom');
    captureError(error, { source: 'useSessionLog' });

    const [captured, options] = Sentry.captureException.mock.calls[0];
    expect(captured).toBe(error);
    expect(options).toEqual({ extra: { source: 'useSessionLog' } });
    expect(options).not.toHaveProperty('fingerprint');
  });

  // The bug this replaces: postgrest-js rejects with a plain object, and Sentry
  // titled every one of them "[object Object]" — one merged, unreadable issue.
  it('wraps a postgrest error object so the issue is titled by its message', () => {
    captureError(
      {
        code: '42501',
        details: 'row violates policy',
        hint: 'check RLS',
        message: 'permission denied for table sessions',
      },
      { source: 'useSessions' }
    );

    const [captured, options] = Sentry.captureException.mock.calls[0];
    expect(captured).toBeInstanceOf(Error);
    expect(captured.message).toBe('permission denied for table sessions');
    expect(captured.message).not.toBe('[object Object]');
    expect(options.extra.source).toBe('useSessions');
    expect(options.extra.originalError).toMatchObject({
      code: '42501',
      details: 'row violates policy',
      hint: 'check RLS',
    });
  });

  it('namespaces the original fields so they cannot collide with context keys', () => {
    captureError(
      { code: '42501', message: 'denied' },
      { code: 'caller-supplied' }
    );

    const { extra } = Sentry.captureException.mock.calls[0][1];
    expect(extra.code).toBe('caller-supplied');
    expect(extra.originalError.code).toBe('42501');
  });

  it('does not deep-copy nested payloads out of the original error', () => {
    captureError({ message: 'denied', row: { user_id: 'u1', srpe: 9 } });

    const { extra } = Sentry.captureException.mock.calls[0][1];
    expect(extra.originalError).not.toHaveProperty('row');
  });

  // Default grouping is stacktrace-led, so two different postgrest codes from
  // the same call site would otherwise merge into a single issue.
  it('fingerprints a wrapped error by its postgrest code', () => {
    captureError({ code: '42501', message: 'denied' });

    expect(Sentry.captureException.mock.calls[0][1].fingerprint).toEqual([
      '{{ default }}',
      '42501',
    ]);
  });

  it('falls back to the message when the wrapped error has no code', () => {
    captureError({ message: 'network request failed' });

    expect(Sentry.captureException.mock.calls[0][1].fingerprint).toEqual([
      '{{ default }}',
      'network request failed',
    ]);
  });

  // postgrest-js emits code: '' (never absent) for client-side/network
  // failures. ?? would not fall through on an empty string; the discriminator
  // must, or every network failure fingerprints as ['{{ default }}', ''].
  it('falls back to the message when the postgrest code is an empty string', () => {
    captureError({ code: '', message: 'network request failed' });

    expect(Sentry.captureException.mock.calls[0][1].fingerprint).toEqual([
      '{{ default }}',
      'network request failed',
    ]);
  });

  it('gives a message-less object something better than "[object Object]"', () => {
    captureError({});

    const captured = Sentry.captureException.mock.calls[0][0];
    expect(captured).toBeInstanceOf(Error);
    expect(captured.message).not.toBe('[object Object]');
    expect(captured.message.length).toBeGreaterThan(0);
  });

  it('survives a circular error object', () => {
    const circular = { code: 'X1' };
    circular.self = circular;

    captureError(circular);

    const captured = Sentry.captureException.mock.calls[0][0];
    expect(captured).toBeInstanceOf(Error);
    expect(captured.message).not.toBe('[object Object]');
    expect(captured.message).toContain('code');
  });

  it('wraps a thrown string into an Error carrying that string', () => {
    captureError('something went wrong');

    const [captured, options] = Sentry.captureException.mock.calls[0];
    expect(captured).toBeInstanceOf(Error);
    expect(captured.message).toBe('something went wrong');
    expect(options.extra.originalError).toEqual({
      value: 'something went wrong',
    });
  });

  it('carries the original name onto the wrapped error', () => {
    captureError({ name: 'PostgrestError', message: 'denied' });

    expect(Sentry.captureException.mock.calls[0][0].name).toBe(
      'PostgrestError'
    );
  });

  it('leaves the default Error name alone when the original has none', () => {
    captureError({ message: 'denied' });

    expect(Sentry.captureException.mock.calls[0][0].name).toBe('Error');
  });
});
