import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHashRoute } from '../useHashRoute.js';
import {
  DESTINATIONS,
  DEFAULT_DESTINATION,
  isDestination,
} from '../../constants/destinations.js';

const setHash = (h) => {
  window.location.hash = h;
};

describe('destinations', () => {
  it('is the five the artboards draw, in their drawn order', () => {
    expect(DESTINATIONS.map((d) => d.id)).toEqual([
      'today',
      'train',
      'progress',
      'body',
      'coach',
    ]);
  });

  it('defaults to today', () => {
    expect(DEFAULT_DESTINATION).toBe('today');
    expect(isDestination(DEFAULT_DESTINATION)).toBe(true);
  });

  it('every destination has a label and an icon', () => {
    for (const d of DESTINATIONS) {
      expect(d.label, d.id).toBeTruthy();
      expect(d.icon, d.id).toBeTruthy();
    }
  });

  it('no label is a substring of another — the e2e suite selects by name', () => {
    const labels = DESTINATIONS.map((d) => d.label);
    for (const a of labels) {
      expect(labels.filter((b) => b.includes(a))).toEqual([a]);
    }
  });
});

describe('useHashRoute', () => {
  beforeEach(() => setHash(''));
  afterEach(() => setHash(''));

  it('starts on the default when there is no hash', () => {
    const { result } = renderHook(() => useHashRoute());
    expect(result.current[0]).toBe('today');
  });

  it('reads a destination out of the hash on mount', () => {
    setHash('#/body');
    const { result } = renderHook(() => useHashRoute());
    expect(result.current[0]).toBe('body');
  });

  it('falls back to the default for a hash that names nothing', () => {
    setHash('#/not-a-destination');
    const { result } = renderHook(() => useHashRoute());
    expect(result.current[0]).toBe('today');
  });

  it('navigating writes the hash, which is what drives the change', () => {
    const { result } = renderHook(() => useHashRoute());
    act(() => result.current[1]('progress'));
    expect(window.location.hash).toBe('#/progress');
    expect(result.current[0]).toBe('progress');
  });

  it('follows a hash changed from outside — the browser back button', () => {
    const { result } = renderHook(() => useHashRoute());
    act(() => result.current[1]('coach'));
    expect(result.current[0]).toBe('coach');
    act(() => {
      setHash('#/train');
      window.dispatchEvent(new window.Event('hashchange'));
    });
    expect(result.current[0]).toBe('train');
  });

  it('ignores a navigate to something that is not a destination', () => {
    const { result } = renderHook(() => useHashRoute());
    act(() => result.current[1]('erg'));
    expect(result.current[0]).toBe('today');
    expect(window.location.hash).toBe('');
  });
});
