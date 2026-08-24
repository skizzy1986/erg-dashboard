import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
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
});
