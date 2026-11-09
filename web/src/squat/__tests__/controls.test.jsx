import { useLayoutEffect } from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TimeControls, {
  readoutText,
  valueText,
  WAITING_TEXT,
} from '../components/TimeControls.jsx';
import CameraControls, {
  CAMERA_WAITING,
  cameraKey,
} from '../components/CameraControls.jsx';
import ViewOptions, { LAYERS_WAITING } from '../components/ViewOptions.jsx';
import { reloadPage } from '../utils/reloadPage.js';

vi.mock('../utils/reloadPage.js', () => ({ reloadPage: vi.fn() }));
import SceneError, { SCENE_ERROR_MESSAGES } from '../components/SceneError.jsx';
import {
  useAnatomyViewState,
  viewReducer,
} from '../hooks/useAnatomyViewState.js';
import { PHASES } from '../constants/phases.js';

const REP = JSON.parse(
  readFileSync(
    join(process.cwd(), 'src/squat/assets/squat-manifest.json'),
    'utf8'
  )
).meta.rep;
const LAST = REP.s.length - 1;

// The real hook behind the real controls, so keyboard → state → readout is
// exercised end to end. `probe.view` exposes the hook's value to assertions.
const probe = {};
function Harness({ rep = REP, initialT }) {
  const view = useAnatomyViewState(rep, initialT);
  useLayoutEffect(() => {
    probe.view = view;
  });
  return <TimeControls view={view} />;
}

const slider = () => screen.getByRole('slider', { name: 'Rep time' });
const readout = () => screen.getByTestId('depth-readout').textContent;
const chips = () =>
  within(screen.getByRole('group', { name: 'Jump to phase' }));
const playButton = () => screen.getByRole('button', { name: /^(Play|Pause)$/ });

const START = '0.00 s · Setup and brace · 0% depth · lowering — modelled';
const END = '3.68 s · Lockout · 0% depth · drive — modelled';

describe('TimeControls', () => {
  it('AC1: starts at 0.00 s and ends at 3.68 s, and the two read differently', () => {
    render(<Harness />);
    expect(readout()).toBe(START);
    fireEvent.keyDown(slider(), { key: 'End' });
    expect(readout()).toBe(END);
    expect(START).not.toBe(END);
    expect(readoutText(probe.view)).toBe(END);
  });

  it('AC2: is a rep-time slider in seconds with a full aria-valuetext', () => {
    render(<Harness />);
    expect(slider()).toHaveAttribute('min', '0');
    expect(slider()).toHaveAttribute('max', '3.68');
    expect(slider()).toHaveAttribute('step', '0.02');
    expect(slider()).toHaveValue('0.00');
    fireEvent.change(slider(), { target: { value: '2.44' } });
    expect(slider()).toHaveAttribute(
      'aria-valuetext',
      'Drive, 2.44 s, 89% depth, modelled'
    );
    expect(slider().getAttribute('aria-valuetext')).toBe(valueText(probe.view));
  });

  it('AC3: there is no depth slider, and the drive never reads as lowering', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.queryByRole('slider', { name: 'Depth' })).toBeNull();
    act(() => probe.view.setFrame(REP.s.indexOf(Math.max(...REP.s))));
    let prev = probe.view.pct;
    const fwd = screen.getByRole('button', { name: 'Step forward' });
    while (probe.view.frame < LAST) {
      await user.click(fwd);
      expect(probe.view.pct).toBeLessThanOrEqual(prev);
      expect(readout()).not.toMatch(/lowering/);
      prev = probe.view.pct;
    }
    expect(readout()).toBe(END);
    await user.click(screen.getByRole('button', { name: 'Step back' }));
    expect(slider()).toHaveValue('3.66');
  });

  it('AC4: the pressed chip always names the frame’s phase, and chips land on band starts', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    for (let f = 0; f <= LAST; f++) {
      act(() => probe.view.setFrame(f));
      const pressed = chips()
        .getAllByRole('button')
        .filter((b) => b.getAttribute('aria-pressed') === 'true');
      expect(pressed).toHaveLength(1);
      expect(slider().getAttribute('aria-valuetext')).toMatch(
        new RegExp(`^${pressed[0].textContent}, `)
      );
    }
    const starts = ['0.00', '0.58', '2.02', '2.32', '3.14'];
    for (const p of PHASES) {
      await user.click(chips().getByRole('button', { name: p.name }));
      expect(slider()).toHaveValue(starts[p.index]);
      expect(chips().getByRole('button', { name: p.name })).toHaveAttribute(
        'aria-pressed',
        'true'
      );
    }
  });

  it('AC5: direction is a readout, not a control', () => {
    render(<Harness />);
    expect(screen.queryByRole('radiogroup', { name: 'Direction' })).toBeNull();
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
    expect(readout()).toMatch(/lowering|drive/);
  });

  it('pins PageUp/PageDown to ±5 frames and Home/End to the ends', () => {
    render(<Harness />);
    fireEvent.keyDown(slider(), { key: 'PageUp' });
    expect(slider()).toHaveValue('0.10');
    fireEvent.keyDown(slider(), { key: 'PageUp' });
    fireEvent.keyDown(slider(), { key: 'PageDown' });
    expect(slider()).toHaveValue('0.10');
    fireEvent.keyDown(slider(), { key: 'End' });
    expect(slider()).toHaveValue('3.68');
    fireEvent.keyDown(slider(), { key: 'PageUp' });
    expect(slider()).toHaveValue('3.68');
    fireEvent.keyDown(slider(), { key: 'Home' });
    expect(slider()).toHaveValue('0.00');
    fireEvent.keyDown(slider(), { key: 'PageDown' });
    expect(slider()).toHaveValue('0.00');
    fireEvent.keyDown(slider(), { key: 'a' });
    expect(slider()).toHaveValue('0.00');
  });

  it('seeds once from an initial time and snaps it to a frame', () => {
    const { rerender } = render(<Harness initialT={2.45} />);
    expect(slider()).toHaveValue('2.46');
    expect(probe.view.moved).toBe(false);
    rerender(<Harness initialT={1} />);
    expect(slider()).toHaveValue('2.46');
  });

  describe('playback', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('plays one frame per dt, pauses, and holds', () => {
      render(<Harness />);
      expect(playButton()).toHaveTextContent('Play');
      expect(screen.getByTestId('depth-readout')).toHaveAttribute(
        'aria-live',
        'polite'
      );
      fireEvent.click(playButton());
      expect(playButton()).toHaveTextContent('Pause');
      expect(screen.getByTestId('depth-readout')).toHaveAttribute(
        'aria-live',
        'off'
      );
      act(() => vi.advanceTimersByTime(200));
      expect(slider()).toHaveValue('0.20');
      fireEvent.click(playButton());
      expect(playButton()).toHaveTextContent('Play');
      act(() => vi.advanceTimersByTime(200));
      expect(slider()).toHaveValue('0.20');
      expect(vi.getTimerCount()).toBe(0);
    });

    it('stops at the end without looping, and restarts from the end at 0', () => {
      render(<Harness />);
      fireEvent.click(playButton());
      act(() => vi.advanceTimersByTime(5000));
      expect(slider()).toHaveValue('3.68');
      expect(playButton()).toHaveTextContent('Play');
      expect(vi.getTimerCount()).toBe(0);
      act(() => vi.advanceTimersByTime(1000));
      expect(slider()).toHaveValue('3.68');
      fireEvent.click(playButton());
      expect(slider()).toHaveValue('0.00');
      act(() => vi.advanceTimersByTime(40));
      expect(slider()).toHaveValue('0.04');
    });

    it('a scrub or a chip during play pauses it', () => {
      render(<Harness />);
      fireEvent.click(playButton());
      act(() => vi.advanceTimersByTime(100));
      fireEvent.change(slider(), { target: { value: '1.00' } });
      expect(playButton()).toHaveTextContent('Play');
      fireEvent.click(playButton());
      fireEvent.click(chips().getByRole('button', { name: 'Bottom' }));
      expect(playButton()).toHaveTextContent('Play');
      act(() => vi.advanceTimersByTime(200));
      expect(slider()).toHaveValue('2.02');
    });

    it('keeps to wall-clock time when ticks arrive late, and waits when early', () => {
      render(<Harness />);
      fireEvent.click(playButton());
      // A slow frame: 100 ms pass before the next tick can run.
      vi.setSystemTime(Date.now() + 100);
      act(() => vi.advanceTimersByTime(20));
      expect(slider()).toHaveValue('0.12');
      // A clock that has not reached the next frame yet: no tick.
      vi.setSystemTime(Date.now() - 50);
      act(() => vi.advanceTimersByTime(20));
      expect(slider()).toHaveValue('0.12');
    });

    it('never autoplays, and leaves no timer behind on unmount', () => {
      const { unmount } = render(<Harness />);
      act(() => vi.advanceTimersByTime(5000));
      expect(slider()).toHaveValue('0.00');
      fireEvent.click(playButton());
      expect(vi.getTimerCount()).toBe(1);
      unmount();
      expect(vi.getTimerCount()).toBe(0);
    });
  });

  it('AC10: keeps its frame, disabled with a reason, until the rep is known', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Harness rep={null} />);
    expect(slider()).toBeDisabled();
    expect(slider()).toHaveAccessibleDescription(WAITING_TEXT);
    expect(slider()).toHaveAttribute('aria-valuetext', WAITING_TEXT);
    expect(readout()).toBe(WAITING_TEXT);
    for (const name of ['Step back', 'Play', 'Step forward']) {
      expect(screen.getByRole('button', { name })).toBeDisabled();
    }
    const all = chips().getAllByRole('button');
    expect(all).toHaveLength(5);
    for (const c of all) {
      expect(c).toBeDisabled();
      expect(c).toHaveAttribute('aria-pressed', 'false');
    }
    // A disabled control ignores the keys it would otherwise pin, and the
    // hook's actions are no-ops with no rep to index.
    fireEvent.keyDown(slider(), { key: 'End' });
    await user.click(screen.getByRole('button', { name: 'Step forward' }));
    act(() => {
      probe.view.setFrame(10);
      probe.view.setTime(1);
      probe.view.step(1);
      probe.view.jumpToPhase(2);
      probe.view.play();
      probe.view.pause();
    });
    expect(probe.view.playing).toBe(false);
    expect(probe.view.moved).toBe(false);

    rerender(<Harness rep={REP} />);
    expect(slider()).toBeEnabled();
    expect(slider()).toHaveValue('0.00');
    expect(slider()).not.toHaveAttribute('aria-describedby');
    expect(readout()).toBe(START);
    expect(screen.getByRole('button', { name: 'Step forward' })).toBeEnabled();
  });

  it('stays disabled, without throwing, on a rep it cannot index', () => {
    render(<Harness rep={{ ...REP, ph: REP.ph.slice(1) }} />);
    expect(slider()).toBeDisabled();
    expect(readout()).toBe(WAITING_TEXT);
  });
});

describe('viewReducer', () => {
  const s0 = {
    frame: 3,
    playing: false,
    moved: false,
    layers: { muscles: true, skeleton: true },
    heatmap: false,
  };
  const playing = { ...s0, playing: true };
  const starts = [0, 29, 101, 116, 157];

  it('returns the same state for actions it cannot apply', () => {
    expect(viewReducer(s0, { type: 'nope' })).toBe(s0);
    expect(viewReducer(s0, { type: 'phase', code: 9, starts })).toBe(s0);
    expect(viewReducer(s0, { type: 'phase', code: 1 })).toBe(s0);
    expect(viewReducer(s0, { type: 'pause' })).toBe(s0);
    expect(viewReducer(s0, { type: 'tick', last: LAST })).toBe(s0);
    expect(viewReducer(s0, { type: 'layer', name: 'body', on: true })).toBe(s0);
  });

  it('clamps frames and steps', () => {
    expect(
      viewReducer(s0, { type: 'frame', frame: 999, last: LAST }).frame
    ).toBe(LAST);
    expect(
      viewReducer(s0, { type: 'frame', frame: -3, last: LAST }).frame
    ).toBe(0);
    expect(viewReducer(s0, { type: 'step', delta: -9, last: LAST }).frame).toBe(
      0
    );
    expect(
      viewReducer(s0, { type: 'seed', frame: 999, last: LAST }).frame
    ).toBe(LAST);
  });

  it('stops the tick on the last frame', () => {
    expect(
      viewReducer({ ...playing, frame: LAST - 1 }, { type: 'tick', last: LAST })
    ).toMatchObject({ frame: LAST, playing: false });
    expect(viewReducer(playing, { type: 'tick', last: LAST })).toMatchObject({
      frame: 4,
      playing: true,
    });
    expect(
      viewReducer(playing, { type: 'tick', delta: 6, last: LAST })
    ).toMatchObject({ frame: 9, playing: true });
    expect(
      viewReducer(playing, { type: 'tick', delta: 999, last: LAST })
    ).toMatchObject({ frame: LAST, playing: false });
  });

  it('marks user moves, but not the seed', () => {
    expect(viewReducer(s0, { type: 'seed', frame: 5, last: LAST }).moved).toBe(
      false
    );
    for (const a of [
      { type: 'frame', frame: 5, last: LAST },
      { type: 'step', delta: 1, last: LAST },
      { type: 'play', last: LAST },
      { type: 'phase', code: 2, starts },
    ]) {
      expect(viewReducer(s0, a).moved).toBe(true);
    }
    expect(viewReducer(playing, { type: 'pause' })).toMatchObject({
      playing: false,
      moved: true,
    });
  });

  it('toggles layers and the heatmap', () => {
    expect(
      viewReducer(s0, { type: 'layer', name: 'skeleton', on: false }).layers
    ).toEqual({ muscles: true, skeleton: false });
    expect(viewReducer(s0, { type: 'heatmap', on: 1 }).heatmap).toBe(true);
  });

  it('derives depth, phase and direction from the rep', () => {
    const { result } = renderHook(() => useAnatomyViewState(REP));
    act(() => result.current.setFrame(122));
    expect(result.current).toMatchObject({
      ready: true,
      frames: 185,
      s: REP.s[122],
      pct: 89,
      phaseCode: 3,
      phase: 'Drive',
      direction: 'drive',
    });
    expect(result.current.t).toBeCloseTo(2.44, 10);
  });
});

describe('CameraControls', () => {
  const makeCamera = () => ({
    reset: vi.fn(),
    preset: vi.fn(),
    orbit: vi.fn(),
    zoom: vi.fn(),
  });

  it('is a labelled, focusable group with a visible key legend', () => {
    render(<CameraControls camera={makeCamera()} />);
    const group = screen.getByRole('group', { name: 'Camera controls' });
    expect(group).toHaveAttribute('tabindex', '0');
    expect(group).toHaveAccessibleDescription('Arrows rotate · + / − zoom');
  });

  it('maps arrows to 15° orbits and +/− to zoom', () => {
    const camera = makeCamera();
    render(<CameraControls camera={camera} />);
    const group = screen.getByRole('group', { name: 'Camera controls' });
    const step = (15 * Math.PI) / 180;
    fireEvent.keyDown(group, { key: 'ArrowLeft' });
    expect(camera.orbit).toHaveBeenLastCalledWith(-step, 0);
    fireEvent.keyDown(group, { key: 'ArrowRight' });
    expect(camera.orbit).toHaveBeenLastCalledWith(step, 0);
    fireEvent.keyDown(group, { key: 'ArrowUp' });
    expect(camera.orbit).toHaveBeenLastCalledWith(0, -step);
    fireEvent.keyDown(group, { key: 'ArrowDown' });
    expect(camera.orbit).toHaveBeenLastCalledWith(0, step);
    for (const k of ['+', '=']) fireEvent.keyDown(group, { key: k });
    for (const k of ['-', '_']) fireEvent.keyDown(group, { key: k });
    expect(camera.zoom.mock.calls.map(([f]) => f < 1)).toEqual([
      true,
      true,
      false,
      false,
    ]);
    fireEvent.keyDown(group, { key: 'x' });
    expect(camera.orbit).toHaveBeenCalledTimes(4);
    expect(cameraKey('Tab')).toBeNull();
  });

  it('wires every button', async () => {
    const user = userEvent.setup();
    const camera = makeCamera();
    render(<CameraControls camera={camera} />);
    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(camera.reset).toHaveBeenCalled();
    for (const [name, id] of [
      ['Front (anterior) view', 'front'],
      ['Back (posterior) view', 'back'],
      ['Left side (lateral) view', 'left'],
      ['Right side (lateral) view', 'right'],
    ]) {
      await user.click(screen.getByRole('button', { name }));
      expect(camera.preset).toHaveBeenLastCalledWith(id);
    }
    await user.click(screen.getByRole('button', { name: 'Zoom in' }));
    await user.click(screen.getByRole('button', { name: 'Zoom out' }));
    expect(camera.zoom).toHaveBeenCalledTimes(2);
  });

  // jsdom has no layout, so this checks only the declared style contract.
  // The rendered 44 × 44 px boxes are measured in e2e (smallTargets).
  it('declares the 44 px minimum on every button (style contract)', () => {
    render(<CameraControls camera={makeCamera()} />);
    for (const b of screen.getAllByRole('button')) {
      expect(b.style.minHeight).toBe('44px');
      expect(b.style.minWidth).toBe('44px');
    }
  });
});

describe('CameraControls before the scene is ready', () => {
  it('is present but disabled, out of the tab order, and says why', () => {
    const camera = {
      reset: vi.fn(),
      preset: vi.fn(),
      orbit: vi.fn(),
      zoom: vi.fn(),
    };
    const { rerender } = render(<CameraControls camera={camera} disabled />);
    const group = screen.getByRole('group', { name: 'Camera controls' });
    expect(group).toHaveAttribute('aria-disabled', 'true');
    expect(group).toHaveAttribute('tabindex', '-1');
    expect(group).toHaveAccessibleDescription(
      `Arrows rotate · + / − zoom ${CAMERA_WAITING}`
    );
    for (const b of screen.getAllByRole('button')) expect(b).toBeDisabled();
    fireEvent.keyDown(group, { key: 'ArrowLeft' });
    fireEvent.keyDown(group, { key: '+' });
    expect(camera.orbit).not.toHaveBeenCalled();
    expect(camera.zoom).not.toHaveBeenCalled();

    rerender(<CameraControls camera={camera} />);
    expect(group).not.toHaveAttribute('aria-disabled');
    expect(group).toHaveAttribute('tabindex', '0');
    expect(group).toHaveAccessibleDescription('Arrows rotate · + / − zoom');
    for (const b of screen.getAllByRole('button')) expect(b).toBeEnabled();
    fireEvent.keyDown(group, { key: 'ArrowLeft' });
    expect(camera.orbit).toHaveBeenCalledTimes(1);
  });
});

describe('ViewOptions', () => {
  it('is present but disabled, with a reason, before the scene is ready', async () => {
    const user = userEvent.setup();
    const onLayer = vi.fn();
    const layers = { muscles: true, skeleton: true };
    const { rerender } = render(
      <ViewOptions layers={layers} onLayer={onLayer} disabled />
    );
    const muscles = screen.getByRole('switch', { name: 'Muscles' });
    expect(muscles).toBeDisabled();
    expect(
      screen.getByRole('group', { name: 'Show' })
    ).toHaveAccessibleDescription(LAYERS_WAITING);
    await user.click(muscles);
    expect(onLayer).not.toHaveBeenCalled();
    rerender(<ViewOptions layers={layers} onLayer={onLayer} />);
    expect(muscles).toBeEnabled();
    await user.click(muscles);
    expect(onLayer).toHaveBeenCalledWith('muscles', false);
  });

  it('offers muscles and skeleton as switches, not body', async () => {
    const user = userEvent.setup();
    const onLayer = vi.fn();
    render(
      <ViewOptions
        layers={{ muscles: true, skeleton: false }}
        onLayer={onLayer}
      />
    );
    const muscles = screen.getByRole('switch', { name: 'Muscles' });
    expect(muscles).toBeChecked();
    expect(screen.getByRole('switch', { name: 'Skeleton' })).not.toBeChecked();
    expect(screen.queryByRole('switch', { name: 'Body' })).toBeNull();
    await user.click(muscles);
    expect(onLayer).toHaveBeenCalledWith('muscles', false);
  });
});

describe('SceneError', () => {
  afterEach(() => {
    delete window.navigator.onLine;
  });

  it.each([
    ['contextlost', SCENE_ERROR_MESSAGES.contextlost, 'Restart 3D view'],
    ['build', SCENE_ERROR_MESSAGES.build, 'Retry'],
  ])('%s explains itself and retries in place', async (kind, text, label) => {
    reloadPage.mockClear();
    const onRetry = vi.fn();
    render(<SceneError kind={kind} onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent(text);
    await userEvent.click(screen.getByRole('button', { name: label }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(reloadPage).not.toHaveBeenCalled();
  });

  it('a failed import offers a page reload, not an in-place retry', async () => {
    reloadPage.mockClear();
    const onRetry = vi.fn();
    render(<SceneError kind="load" onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      SCENE_ERROR_MESSAGES.load
    );
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Reload page' }));
    expect(reloadPage).toHaveBeenCalledTimes(1);
    expect(onRetry).not.toHaveBeenCalled();
  });

  it('says a load failure offline needs a connection', () => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      get: () => false,
    });
    render(<SceneError kind="load" onRetry={() => {}} />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      SCENE_ERROR_MESSAGES.offline
    );
  });
});
