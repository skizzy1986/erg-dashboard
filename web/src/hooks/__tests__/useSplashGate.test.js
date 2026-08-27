import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StrictMode } from 'react';
import { renderHook, act } from '@testing-library/react';
import {
  useSplashGate,
  SPLASH_MIN_MS,
  SPLASH_MAX_MS,
} from '../useSplashGate.js';

const advance = (ms) => act(() => vi.advanceTimersByTime(ms));

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useSplashGate', () => {
  it('holds the splash for the floor even when boot finishes instantly', () => {
    const { result, rerender } = renderHook((props) => useSplashGate(props), {
      initialProps: {
        enabled: true,
        authResolved: false,
        dataReady: false,
        dataExpected: true,
      },
    });
    expect(result.current).toBe(true);

    rerender({
      enabled: true,
      authResolved: true,
      dataReady: true,
      dataExpected: true,
    });
    expect(result.current).toBe(true);

    advance(SPLASH_MIN_MS - 1);
    expect(result.current).toBe(true);

    advance(1);
    expect(result.current).toBe(false);
  });

  it('caps a slow boot at the ceiling', () => {
    const { result } = renderHook((props) => useSplashGate(props), {
      initialProps: {
        enabled: true,
        authResolved: true,
        dataReady: false,
        dataExpected: true,
      },
    });

    advance(SPLASH_MAX_MS - 1);
    expect(result.current).toBe(true);

    advance(1);
    expect(result.current).toBe(false);
  });

  it('clears a logged-out boot at the floor instead of riding to the ceiling', () => {
    const { result } = renderHook((props) => useSplashGate(props), {
      initialProps: {
        enabled: true,
        authResolved: true,
        dataReady: false,
        dataExpected: false,
      },
    });

    advance(SPLASH_MIN_MS - 1);
    expect(result.current).toBe(true);

    advance(1);
    expect(result.current).toBe(false);
  });

  it('exits immediately on auth rejection, bypassing the floor', () => {
    const { result, rerender } = renderHook((props) => useSplashGate(props), {
      initialProps: {
        enabled: true,
        authResolved: false,
        authFailed: false,
        dataExpected: true,
      },
    });
    advance(100);
    expect(result.current).toBe(true);

    rerender({
      enabled: true,
      authResolved: true,
      authFailed: true,
      dataExpected: false,
    });
    expect(result.current).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('arms nothing on desktop', () => {
    const { result } = renderHook((props) => useSplashGate(props), {
      initialProps: { enabled: false, authResolved: true, dataExpected: true },
    });
    expect(result.current).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('never re-shows once dismissed', () => {
    const { result, rerender } = renderHook((props) => useSplashGate(props), {
      initialProps: {
        enabled: true,
        authResolved: true,
        dataReady: true,
        dataExpected: true,
      },
    });
    advance(SPLASH_MIN_MS);
    expect(result.current).toBe(false);

    rerender({
      enabled: true,
      authResolved: true,
      dataReady: false,
      dataExpected: true,
    });
    expect(result.current).toBe(false);

    advance(SPLASH_MAX_MS);
    expect(result.current).toBe(false);
  });

  it('leaves no pending timers on unmount', () => {
    const { unmount } = renderHook((props) => useSplashGate(props), {
      initialProps: {
        enabled: true,
        authResolved: false,
        dataExpected: true,
      },
    });
    advance(300);
    expect(vi.getTimerCount()).toBe(2);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('clears both timers when the gate is disabled mid-splash', () => {
    const { result, rerender } = renderHook((props) => useSplashGate(props), {
      initialProps: {
        enabled: true,
        authResolved: true,
        dataReady: true,
        dataExpected: true,
      },
    });
    advance(400);
    rerender({
      enabled: false,
      authResolved: true,
      dataReady: true,
      dataExpected: true,
    });
    expect(result.current).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('defaults to hidden when called with no options', () => {
    const { result } = renderHook(() => useSplashGate());
    expect(result.current).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  // StrictMode double-invokes the arming effect: run, clean up, run again.
  // This pins the observable contract — one floor, still SPLASH_MIN_MS — rather
  // the latch's internals; both passes land in the same commit, so the re-armed
  // delay equals a fresh one and this would also pass without armedRef.
  it('keeps one clock across a StrictMode double-mount', () => {
    const { result } = renderHook((props) => useSplashGate(props), {
      wrapper: StrictMode,
      initialProps: {
        enabled: true,
        authResolved: true,
        dataReady: true,
        dataExpected: true,
      },
    });
    expect(result.current).toBe(true);
    advance(SPLASH_MIN_MS - 1);
    expect(result.current).toBe(true);
    advance(1);
    expect(result.current).toBe(false);
  });
});
