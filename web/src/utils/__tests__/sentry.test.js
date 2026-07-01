import { describe, it, expect, vi, afterEach } from 'vitest';
import * as Sentry from '@sentry/react';
import { initSentry } from '../sentry.js';

vi.mock('@sentry/react', () => ({ init: vi.fn() }));

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
    vi.stubEnv('VITE_SENTRY_DSN', 'https://k@o1.ingest.sentry.io/1');
    vi.stubEnv('VITE_SENTRY_RELEASE', 'splitiq@1.3.0');

    expect(initSentry()).toBe(true);
    expect(Sentry.init).toHaveBeenCalledOnce();

    const cfg = Sentry.init.mock.calls[0][0];
    expect(cfg.dsn).toBe('https://k@o1.ingest.sentry.io/1');
    expect(cfg.release).toBe('splitiq@1.3.0');
    expect(cfg.sendDefaultPii).toBe(false);
  });
});
