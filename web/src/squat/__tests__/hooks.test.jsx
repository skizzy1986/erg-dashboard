import { act, renderHook } from '@testing-library/react';
import { THEME_KEY, useSquatTheme } from '../hooks/useSquatTheme.js';
import { useSquatHashState } from '../hooks/useSquatHashState.js';
import {
  detectCapabilities,
  useCapabilities,
} from '../hooks/useCapabilities.js';
import { useMediaQuery } from '../hooks/useMediaQuery.js';
import { createAnatomyWorker } from '../workers/createAnatomyWorker.js';

// A controllable matchMedia: one shared list of listeners per query.
function installMatchMedia(initial = {}) {
  const state = { ...initial };
  const listeners = {};
  window.matchMedia = (q) => ({
    get matches() {
      return !!state[q];
    },
    addEventListener: (_t, fn) => (listeners[q] ??= new Set()).add(fn),
    removeEventListener: (_t, fn) => listeners[q]?.delete(fn),
  });
  return (q, matches) => {
    state[q] = matches;
    listeners[q]?.forEach((fn) => fn({ matches }));
  };
}
const DARK_Q = '(prefers-color-scheme: dark)';

afterEach(() => {
  delete window.matchMedia;
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe('useSquatTheme', () => {
  it('follows the OS preference by default, live', () => {
    const set = installMatchMedia({ [DARK_Q]: true });
    const { result } = renderHook(() => useSquatTheme());
    expect(result.current).toMatchObject({
      preference: 'system',
      resolved: 'dark',
    });
    act(() => set(DARK_Q, false));
    expect(result.current.resolved).toBe('light');
  });

  it('persists an explicit choice and clears it for system', () => {
    installMatchMedia();
    const { result } = renderHook(() => useSquatTheme());
    act(() => result.current.setPreference('dark'));
    expect(result.current.resolved).toBe('dark');
    expect(window.localStorage.getItem(THEME_KEY)).toBe('dark');
    act(() => result.current.setPreference('system'));
    expect(window.localStorage.getItem(THEME_KEY)).toBeNull();
    act(() => result.current.setPreference('purple'));
    expect(result.current.preference).toBe('system');
  });

  it('restores a stored choice and ignores junk', () => {
    window.localStorage.setItem(THEME_KEY, 'light');
    installMatchMedia({ [DARK_Q]: true });
    expect(renderHook(() => useSquatTheme()).result.current.resolved).toBe(
      'light'
    );
    window.localStorage.setItem(THEME_KEY, 'neon');
    expect(renderHook(() => useSquatTheme()).result.current.preference).toBe(
      'system'
    );
  });

  it('survives blocked storage and a missing matchMedia', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { result } = renderHook(() => useSquatTheme());
    expect(result.current.resolved).toBe('light');
    act(() => result.current.setPreference('dark'));
    expect(result.current.resolved).toBe('dark');
  });
});

describe('useSquatHashState', () => {
  beforeEach(() => window.history.replaceState(null, '', '/squat'));

  it('reads the hash, writes with replaceState, and follows hashchange', () => {
    window.history.replaceState(null, '', '/squat#guide=metrics&t=1.60');
    const push = vi.spyOn(window.history, 'pushState');
    const { result } = renderHook(() => useSquatHashState());
    expect(result.current[0]).toMatchObject({ guide: 'metrics', t: 1.6 });

    act(() => result.current[1]({ guide: 'sources' }));
    expect(window.location.hash).toBe('#guide=sources&t=1.60');
    expect(push).not.toHaveBeenCalled();

    act(() => result.current[1]({ guide: null, t: null }));
    expect(window.location.hash).toBe('');
    expect(window.location.pathname).toBe('/squat');

    act(() => {
      window.history.replaceState(null, '', '/squat#tab=force&paused');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(result.current[0]).toMatchObject({ tab: 'force', paused: true });
  });
});

describe('capabilities', () => {
  const win = (overrides = {}) => ({
    document: {
      createElement: () => ({
        getContext: overrides.getContext ?? (() => null),
      }),
    },
    DecompressionStream: function D() {},
    Worker: function W() {},
    ...overrides,
  });

  it('reports a full house and releases the probe context', () => {
    const loseContext = vi.fn();
    const gl = { getExtension: () => ({ loseContext }) };
    expect(
      detectCapabilities(
        win({ getContext: (k) => (k === 'webgl' ? gl : null) })
      )
    ).toEqual({ webgl: true, decompression: true, worker: true });
    expect(loseContext).toHaveBeenCalled();
  });

  it('answers no for each missing API, including a throwing getContext', () => {
    expect(
      detectCapabilities(
        win({
          getContext: () => {
            throw new Error('nope');
          },
          DecompressionStream: undefined,
          Worker: undefined,
        })
      )
    ).toEqual({ webgl: false, decompression: false, worker: false });
    expect(detectCapabilities({}).webgl).toBe(false);
  });

  it('probes once per mount', () => {
    const probe = vi.fn(() => ({
      webgl: true,
      decompression: true,
      worker: true,
    }));
    const { result, rerender } = renderHook(() => useCapabilities(probe));
    rerender();
    expect(probe).toHaveBeenCalledTimes(1);
    expect(result.current.webgl).toBe(true);
  });
});

describe('useMediaQuery', () => {
  it('is false without matchMedia and tracks changes with it', () => {
    expect(
      renderHook(() => useMediaQuery('(min-width: 761px)')).result.current
    ).toBe(false);
    const set = installMatchMedia({ '(min-width: 761px)': true });
    const { result } = renderHook(() => useMediaQuery('(min-width: 761px)'));
    expect(result.current).toBe(true);
    act(() => set('(min-width: 761px)', false));
    expect(result.current).toBe(false);
  });
});

describe('createAnatomyWorker', () => {
  it('builds a module worker from the decode script', () => {
    const calls = [];
    const original = globalThis.Worker;
    globalThis.Worker = function FakeWorker(url, opts) {
      calls.push([String(url), opts]);
    };
    try {
      createAnatomyWorker();
    } finally {
      globalThis.Worker = original;
    }
    // `?worker_file` is Vite's mark that it recognised the constructor
    // pattern and will bundle the worker — not just copy a URL.
    expect(calls[0][0]).toMatch(/anatomyDecode\.worker\.js\?worker_file/);
    expect(calls[0][1]).toEqual({ type: 'module' });
  });
});
