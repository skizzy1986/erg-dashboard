import { act, renderHook } from '@testing-library/react';
import { useStrainAnnouncement } from '../hooks/useStrainAnnouncement.js';

// Criterion 23: polite, and never once per frame while the rep plays.
const base = {
  key: 'a',
  text: 'Lowering: A',
  phase: 'Lowering',
  playing: false,
  userPlayed: false,
  minMs: 3000,
};

function setup(props = {}) {
  return renderHook((p) => useStrainAnnouncement(p), {
    initialProps: { ...base, ...props },
  });
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('useStrainAnnouncement', () => {
  it('paused, it follows every change of the readout', () => {
    const { result, rerender } = setup();
    expect(result.current).toBe('Lowering: A');
    rerender({ ...base, key: 'b', text: 'Lowering: B' });
    expect(result.current).toBe('Lowering: B');
    // A new text under the same key is the same readout: nothing new to say.
    rerender({ ...base, key: 'b', text: 'Lowering: B again' });
    expect(result.current).toBe('Lowering: B');
  });

  it('an empty key (heatmap off) clears it', () => {
    const { result, rerender } = setup();
    rerender({ ...base, key: '', text: '' });
    expect(result.current).toBe('');
  });

  it('playing, it ignores readout changes inside a phase', () => {
    const { result, rerender } = setup();
    const playing = { ...base, playing: true, userPlayed: true };
    rerender(playing);
    for (const k of ['b', 'c', 'd', 'e']) {
      rerender({ ...playing, key: k, text: `Lowering: ${k}` });
      act(() => vi.advanceTimersByTime(1000));
    }
    expect(result.current).toBe('Lowering: A');
  });

  it('playing, it speaks on a phase change, at most once per minMs', () => {
    const { result, rerender } = setup();
    const playing = { ...base, playing: true, userPlayed: true };
    rerender(playing);
    // The first phase change lands inside the window opened by the paused
    // announcement at t = 0, so it waits for the window to close.
    act(() => vi.advanceTimersByTime(1000));
    rerender({ ...playing, key: 'b', phase: 'Bottom', text: 'Bottom: B' });
    expect(result.current).toBe('Lowering: A');
    act(() => vi.advanceTimersByTime(1999));
    expect(result.current).toBe('Lowering: A');
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe('Bottom: B');
    // Two phase changes in quick succession: only the later one is said,
    // once its window is up.
    rerender({ ...playing, key: 'c', phase: 'Drive', text: 'Drive: C' });
    act(() => vi.advanceTimersByTime(500));
    rerender({ ...playing, key: 'd', phase: 'Lockout', text: 'Lockout: D' });
    act(() => vi.advanceTimersByTime(2499));
    expect(result.current).toBe('Bottom: B');
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe('Lockout: D');
  });

  it('a phase change after the window is said at once', () => {
    const { result, rerender } = setup();
    const playing = { ...base, playing: true, userPlayed: true };
    rerender(playing);
    act(() => vi.advanceTimersByTime(5000));
    rerender({ ...playing, key: 'b', phase: 'Bottom', text: 'Bottom: B' });
    expect(result.current).toBe('Bottom: B');
  });

  it('never narrates a rep the user did not start (PR A autoplay)', () => {
    const { result, rerender } = setup({ key: '', text: '' });
    const auto = { ...base, playing: true, userPlayed: false };
    for (const phase of ['Lowering', 'Bottom', 'Drive', 'Lockout']) {
      rerender({ ...auto, key: phase, phase, text: `${phase}: x` });
      act(() => vi.advanceTimersByTime(4000));
    }
    expect(result.current).toBe('');
  });

  it('pausing says where it stopped', () => {
    const { result, rerender } = setup();
    const playing = { ...base, playing: true, userPlayed: true };
    rerender({ ...playing, key: 'b', text: 'Lowering: B' });
    expect(result.current).toBe('Lowering: A');
    rerender({ ...base, key: 'b', text: 'Lowering: B' });
    expect(result.current).toBe('Lowering: B');
  });

  it('a pending announcement is dropped on unmount', () => {
    const { rerender, unmount } = setup();
    const playing = { ...base, playing: true, userPlayed: true };
    rerender(playing);
    rerender({ ...playing, key: 'b', phase: 'Bottom', text: 'Bottom: B' });
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
