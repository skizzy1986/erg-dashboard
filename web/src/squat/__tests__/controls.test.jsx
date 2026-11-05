import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DepthControls, {
  depthPercent,
  valueText,
  WAITING_TEXT,
} from '../components/DepthControls.jsx';
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

const NS = 41;

// The real hook behind the real controls, so keyboard → state → readout is
// exercised end to end.
function Harness({ ns = NS }) {
  const view = useAnatomyViewState(ns);
  return <DepthControls view={view} />;
}

const slider = () => screen.getByRole('slider', { name: 'Depth' });
const readout = () => screen.getByTestId('depth-readout').textContent;

describe('DepthControls', () => {
  it('starts standing, with a full aria-valuetext', () => {
    render(<Harness />);
    expect(slider()).toHaveAttribute(
      'aria-valuetext',
      'Standing, 0% depth, modelled'
    );
    expect(slider()).toHaveAttribute('max', '40');
    expect(readout()).toBe('Depth 0% · Standing · lowering — modelled');
  });

  it('moves with the slider and names the phase', () => {
    render(<Harness />);
    fireEvent.change(slider(), { target: { value: '26' } });
    expect(readout()).toBe('Depth 65% · Descent · lowering — modelled');
    expect(slider()).toHaveAttribute(
      'aria-valuetext',
      'Descent, 65% depth, modelled'
    );
  });

  it('pins PageUp/PageDown to ±5 and Home/End to the ends', () => {
    render(<Harness />);
    fireEvent.keyDown(slider(), { key: 'PageUp' });
    expect(slider()).toHaveValue('5');
    fireEvent.keyDown(slider(), { key: 'PageUp' });
    fireEvent.keyDown(slider(), { key: 'PageDown' });
    expect(slider()).toHaveValue('5');
    fireEvent.keyDown(slider(), { key: 'End' });
    expect(slider()).toHaveValue('40');
    expect(readout()).toMatch(/Bottom/);
    fireEvent.keyDown(slider(), { key: 'PageUp' });
    expect(slider()).toHaveValue('40');
    fireEvent.keyDown(slider(), { key: 'Home' });
    expect(slider()).toHaveValue('0');
    fireEvent.keyDown(slider(), { key: 'PageDown' });
    expect(slider()).toHaveValue('0');
    fireEvent.keyDown(slider(), { key: 'a' });
    expect(slider()).toHaveValue('0');
  });

  it('steps along the rep and turns at the bottom', async () => {
    const user = userEvent.setup();
    render(<Harness ns={3} />);
    const fwd = screen.getByRole('button', { name: 'Step forward' });
    await user.click(fwd);
    await user.click(fwd);
    expect(readout()).toMatch(/Bottom · lowering/);
    await user.click(fwd);
    expect(readout()).toMatch(/Bottom · drive/);
    await user.click(fwd);
    expect(readout()).toMatch(/50% · Drive · drive/);
    await user.click(screen.getByRole('button', { name: 'Step back' }));
    expect(readout()).toMatch(/Bottom · drive/);
  });

  it('switches direction as a radio group, by click and by arrow', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const lowering = screen.getByRole('radio', { name: 'Lowering' });
    const drive = screen.getByRole('radio', { name: 'Drive' });
    expect(lowering).toHaveAttribute('aria-checked', 'true');
    expect(drive).toHaveAttribute('tabindex', '-1');
    await user.click(drive);
    expect(readout()).toMatch(/Lockout · drive/);
    fireEvent.keyDown(drive, { key: 'ArrowLeft' });
    expect(lowering).toHaveAttribute('aria-checked', 'true');
    expect(lowering).toHaveFocus();
    fireEvent.keyDown(lowering, { key: 'Enter' });
    expect(lowering).toHaveAttribute('aria-checked', 'true');
  });

  it('jumps to a phase, with aria-pressed on the current one', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const chip = (name) =>
      within(screen.getByRole('group', { name: 'Jump to phase' })).getByRole(
        'button',
        { name }
      );
    expect(chip('Standing')).toHaveAttribute('aria-pressed', 'true');
    await user.click(chip('Drive'));
    expect(readout()).toBe('Depth 50% · Drive · drive — modelled');
    expect(chip('Drive')).toHaveAttribute('aria-pressed', 'true');
    await user.click(chip('Bottom'));
    expect(readout()).toBe('Depth 100% · Bottom · drive — modelled');
    await user.click(chip('Standing'));
    expect(readout()).toMatch(/Standing · lowering/);
  });

  it('keeps its frame, disabled with a reason, until the sample count is known', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Harness ns={null} />);
    expect(slider()).toBeDisabled();
    expect(slider()).toHaveAccessibleDescription(WAITING_TEXT);
    expect(slider()).toHaveAttribute('aria-valuetext', WAITING_TEXT);
    expect(readout()).toBe(WAITING_TEXT);
    for (const name of ['Step back', 'Step forward']) {
      expect(screen.getByRole('button', { name })).toBeDisabled();
    }
    for (const r of screen.getAllByRole('radio')) expect(r).toBeDisabled();
    const chips = within(
      screen.getByRole('group', { name: 'Jump to phase' })
    ).getAllByRole('button');
    expect(chips).toHaveLength(5);
    for (const c of chips) {
      expect(c).toBeDisabled();
      expect(c).toHaveAttribute('aria-pressed', 'false');
    }
    // A disabled control ignores the keys it would otherwise pin.
    fireEvent.keyDown(slider(), { key: 'End' });
    await user.click(screen.getByRole('button', { name: 'Step forward' }));

    rerender(<Harness ns={NS} />);
    expect(slider()).toBeEnabled();
    expect(slider()).toHaveValue('0');
    expect(slider()).not.toHaveAttribute('aria-describedby');
    expect(readout()).toBe('Depth 0% · Standing · lowering — modelled');
    expect(screen.getByRole('button', { name: 'Step forward' })).toBeEnabled();
  });

  it('formats percent and value text', () => {
    expect(depthPercent(20, 41)).toBe(50);
    expect(valueText('Bottom', 40, 41)).toBe('Bottom, 100% depth, modelled');
  });
});

describe('viewReducer', () => {
  const s0 = {
    sample: 3,
    direction: 'lowering',
    layers: { muscles: true, skeleton: true },
  };
  it('ignores unknown actions, directions, phases and layers', () => {
    expect(viewReducer(s0, { type: 'nope' })).toBe(s0);
    expect(viewReducer(s0, { type: 'direction', direction: 'up' })).toBe(s0);
    expect(viewReducer(s0, { type: 'phase', name: 'Nope', ns: NS })).toBe(s0);
    expect(viewReducer(s0, { type: 'layer', name: 'body', on: true })).toBe(s0);
  });
  it('clamps samples and toggles layers', () => {
    expect(viewReducer(s0, { type: 'sample', sample: 99, ns: NS }).sample).toBe(
      40
    );
    expect(
      viewReducer(s0, { type: 'layer', name: 'skeleton', on: false }).layers
    ).toEqual({ muscles: true, skeleton: false });
  });
  it('derives s from the sample count', () => {
    const { result } = renderHook(() => useAnatomyViewState(41));
    act(() => result.current.setSample(10));
    expect(result.current.s).toBe(0.25);
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
