import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { cwd } from 'node:process';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const invokeMock = vi.fn();

vi.mock('../../supabaseClient.js', () => ({
  supabase: { functions: { invoke: (...args) => invokeMock(...args) } },
}));

import { useStravaConnect, DISCONNECT_CONFIRM } from '../useStravaConnect.js';

let client;
let locationStub;
let realLocation;
let fetchSpy;

function wrapper({ children }) {
  return React.createElement(QueryClientProvider, { client }, children);
}

beforeEach(() => {
  invokeMock.mockReset();
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  // jsdom refuses a real navigation, so location is replaced with a plain
  // object whose href we can read back.
  realLocation = window.location;
  locationStub = {
    href: 'http://localhost/',
    pathname: '/',
    search: '',
    hash: '',
  };
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: locationStub,
  });
  fetchSpy = vi.fn(() => Promise.resolve({ ok: true, json: async () => ({}) }));
  vi.stubGlobal('fetch', fetchSpy);
});

afterEach(() => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: realLocation,
  });
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('useStravaConnect — start', () => {
  it('navigates to the authorize_url the edge function returns, and never fetches Strava itself', async () => {
    invokeMock.mockResolvedValue({
      data: { authorize_url: 'https://example.test/oauth/authorize?x=1' },
      error: null,
    });
    const { result } = renderHook(() => useStravaConnect(), { wrapper });
    result.current.start.mutate();
    await waitFor(() => expect(result.current.start.isSuccess).toBe(true));

    expect(invokeMock).toHaveBeenCalledWith('strava-connect', {
      body: { action: 'start' },
    });
    expect(window.location.href).toBe(
      'https://example.test/oauth/authorize?x=1'
    );

    // The only Strava interaction the browser makes is a top-level navigation.
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("accepts the edge function's `url` key as well as `authorize_url`", async () => {
    invokeMock.mockResolvedValue({
      data: { ok: true, url: 'https://example.test/oauth/authorize?y=2' },
      error: null,
    });
    const { result } = renderHook(() => useStravaConnect(), { wrapper });
    result.current.start.mutate();
    await waitFor(() => expect(result.current.start.isSuccess).toBe(true));
    expect(window.location.href).toBe(
      'https://example.test/oauth/authorize?y=2'
    );
  });

  it('fails loudly when the function returns no authorize url', async () => {
    invokeMock.mockResolvedValue({ data: {}, error: null });
    const { result } = renderHook(() => useStravaConnect(), { wrapper });
    result.current.start.mutate();
    await waitFor(() => expect(result.current.start.isError).toBe(true));
    expect(window.location.href).toBe('http://localhost/');
  });

  it('surfaces an edge-function error without navigating', async () => {
    invokeMock.mockResolvedValue({ data: null, error: { message: 'nope' } });
    const { result } = renderHook(() => useStravaConnect(), { wrapper });
    result.current.start.mutate();
    await waitFor(() => expect(result.current.start.isError).toBe(true));
    expect(window.location.href).toBe('http://localhost/');
  });
});

describe('useStravaConnect — disconnect', () => {
  it('confirms first, then disconnects and invalidates the connection query', async () => {
    invokeMock.mockResolvedValue({ data: { ok: true }, error: null });
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(() => useStravaConnect(), { wrapper });
    result.current.requestDisconnect();
    await waitFor(() => expect(result.current.disconnect.isSuccess).toBe(true));

    expect(confirmSpy).toHaveBeenCalledWith(DISCONNECT_CONFIRM);
    expect(invokeMock).toHaveBeenCalledWith('strava-connect', {
      body: { action: 'disconnect' },
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['strava', 'connection'],
    });
  });

  it('does nothing when the confirm is declined', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { result } = renderHook(() => useStravaConnect(), { wrapper });
    result.current.requestDisconnect();
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it('promises in the confirm text that imported sessions are kept', () => {
    expect(DISCONNECT_CONFIRM).toMatch(/never deleted/i);
  });
});

// A security review checkpoint, not a style rule: the browser must never hold a
// Strava endpoint or credential. Asserting it here means the guarantee survives
// a later edit that a one-off grep would not catch.
describe('the browser bundle never references Strava directly', () => {
  // Vitest's root is web/, so this is web/src.
  const SRC = resolve(cwd(), 'src');

  const walk = (dir) =>
    readdirSync(dir).flatMap((entry) => {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) return walk(full);
      return /\.(js|jsx)$/.test(entry) ? [full] : [];
    });

  // Built by concatenation so this guard does not itself put the forbidden
  // strings into src/ — a plain grep over the tree must come back empty.
  const NEEDLES = ['strava' + '.com', 'VITE_' + 'STRAVA'];

  it('has no Strava host literal and no build-time Strava env var in src/', () => {
    const offenders = walk(SRC).filter((file) => {
      const text = readFileSync(file, 'utf8');
      return NEEDLES.some((needle) => text.includes(needle));
    });
    expect(offenders).toEqual([]);
  });
});
