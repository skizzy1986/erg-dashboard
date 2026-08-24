import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePrefersReducedMotion } from '../usePrefersReducedMotion.js';

function stubMatchMedia(matches) {
  const listeners = { add: vi.fn(), remove: vi.fn() };
  vi.stubGlobal('matchMedia', (media) => ({
    matches,
    media,
    onchange: null,
    addEventListener: listeners.add,
    removeEventListener: listeners.remove,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  return listeners;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('usePrefersReducedMotion', () => {
  // jsdom ships no matchMedia at all. This is the guard that keeps every other
  // splash test from throwing on mount.
  it('returns false without throwing when matchMedia is unavailable', () => {
    expect(typeof window.matchMedia).toBe('undefined');
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);
  });

  it('reports the preference when matchMedia says reduce', () => {
    stubMatchMedia(true);
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(true);
  });

  it('reports false when matchMedia says no preference', () => {
    stubMatchMedia(false);
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);
  });

  it('subscribes to change and cleans up on unmount', () => {
    const listeners = stubMatchMedia(false);
    const { unmount } = renderHook(() => usePrefersReducedMotion());
    expect(listeners.add).toHaveBeenCalledWith('change', expect.any(Function));
    unmount();
    expect(listeners.remove).toHaveBeenCalledWith(
      'change',
      expect.any(Function)
    );
  });

  // The handler body never ran in any other test, so a wrong event shape
  // (e.target.matches, an inverted boolean) would have shipped silently.
  it('follows the preference when it changes while mounted', () => {
    const listeners = stubMatchMedia(false);
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);

    const [, handler] = listeners.add.mock.calls[0];
    act(() => handler({ matches: true }));
    expect(result.current).toBe(true);

    act(() => handler({ matches: false }));
    expect(result.current).toBe(false);
  });
});
