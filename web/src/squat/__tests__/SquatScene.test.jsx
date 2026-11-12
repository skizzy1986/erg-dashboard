import { StrictMode } from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SquatApp from '../SquatApp.jsx';
import { captureError } from '../../utils/sentry.js';
import { scenePalette } from '../../anatomy/utils/sceneColours.js';
import { useAnatomyScene } from '../hooks/useAnatomyScene.js';
import { reloadPage } from '../utils/reloadPage.js';

// The 3D view's lifecycle inside the real app shell. three.js never loads
// here: the `loadScene` seam hands SquatApp a fake scene factory that records
// what the hook asks of it. The real scene needs WebGL and is covered by e2e.
const mocks = vi.hoisted(() => ({ workers: [] }));
vi.mock('../hooks/useCapabilities.js', () => ({
  useCapabilities: () => ({ webgl: true, decompression: true, worker: true }),
}));
vi.mock('../workers/createAnatomyWorker.js', () => ({
  createAnatomyWorker: () => {
    const w = { postMessage: vi.fn(), terminate: vi.fn() };
    mocks.workers.push(w);
    return w;
  },
}));
vi.mock('../../utils/sentry.js', () => ({ captureError: vi.fn() }));
vi.mock('../utils/reloadPage.js', () => ({ reloadPage: vi.fn() }));

const ASSETS = join(process.cwd(), 'src/squat/assets');
const manifest = JSON.parse(
  readFileSync(join(ASSETS, 'squat-manifest.json'), 'utf8')
);
const raw = gunzipSync(readFileSync(join(ASSETS, 'squat-anatomy.bin')));
const buffer = raw.buffer.slice(
  raw.byteOffset,
  raw.byteOffset + raw.byteLength
);

function fakeScene() {
  const instances = [];
  const factory = vi.fn((opts) => {
    const canvas = document.createElement('canvas');
    opts.container.appendChild(canvas);
    const ctl = {
      opts,
      canvas,
      setDepth: vi.fn(),
      setLayers: vi.fn(),
      setPalette: vi.fn(),
      setReducedMotion: vi.fn(),
      setActivation: vi.fn(),
      camera: {
        reset: vi.fn(),
        preset: vi.fn(),
        orbit: vi.fn(),
        zoom: vi.fn(),
      },
      dispose: vi.fn(() => canvas.remove()),
    };
    instances.push(ctl);
    setTimeout(() => opts.onFirstFrame());
    return ctl;
  });
  const loadScene = vi.fn(() =>
    Promise.resolve({ createAnatomyScene: factory })
  );
  return { factory, loadScene, instances };
}

async function finishDownload() {
  await waitFor(() => expect(mocks.workers).toHaveLength(1));
  act(() => {
    mocks.workers[0].onmessage({ data: { type: 'done', buffer } });
  });
}

const status = () => screen.getByTestId('load-status');

// These tests drive the scene through its controls, so they run on the desktop
// rail, where every group is on screen; the phone bar's tabs are covered in
// StageControls.test.jsx.
const WIDE = '(min-width: 761px)';
function wideScreen() {
  window.matchMedia = (q) => ({
    matches: q === WIDE,
    media: q,
    addEventListener() {},
    removeEventListener() {},
  });
}

beforeEach(() => {
  wideScreen();
  mocks.workers.length = 0;
  captureError.mockClear();
  globalThis.fetch = vi
    .fn()
    .mockResolvedValue({ ok: true, json: () => Promise.resolve(manifest) });
  window.history.replaceState(null, '', '/squat');
});
afterEach(() => {
  window.localStorage.clear();
  delete window.matchMedia;
});

describe('SquatApp 3D stage', () => {
  it('loads the engine, builds once, and hides the status after the first frame', async () => {
    const { factory, loadScene, instances } = fakeScene();
    let resolveLoad;
    loadScene.mockImplementationOnce(
      () =>
        new Promise((r) => {
          resolveLoad = () => r({ createAnatomyScene: factory });
        })
    );
    render(<SquatApp loadScene={loadScene} />);
    expect(screen.getByTestId('scene-host')).toBeInTheDocument();
    expect(screen.getByText('Modelled, not measured')).toBeInTheDocument();
    await finishDownload();
    await waitFor(() =>
      expect(status()).toHaveTextContent('Loading 3D engine')
    );
    // Rep time works from the manifest before the scene exists.
    expect(
      screen.getByRole('slider', { name: 'Rep time' })
    ).toBeInTheDocument();
    // Present from the first paint so nothing below moves, but inert.
    const camera = screen.getByRole('group', { name: 'Camera controls' });
    expect(camera).toHaveAttribute('aria-disabled', 'true');
    for (const b of within(camera).getAllByRole('button')) {
      expect(b).toBeDisabled();
    }
    expect(screen.getByRole('switch', { name: 'Muscles' })).toBeDisabled();
    act(() => resolveLoad());
    await waitFor(() => expect(status()).toHaveTextContent('3D model ready'));
    expect(factory).toHaveBeenCalledTimes(1);
    const ctl = instances[0];
    expect(ctl.opts.manifest).toBe(manifest);
    expect(ctl.opts.buffer).toBe(buffer);
    expect(ctl.opts.palette).toEqual(scenePalette('light'));
    expect(screen.getByTestId('scene-host').querySelector('canvas')).toBe(
      ctl.canvas
    );
    expect(ctl.setDepth).toHaveBeenCalledWith(0);
    expect(ctl.setLayers).toHaveBeenCalledWith({
      muscles: true,
      skeleton: true,
    });
    expect(status().style.position).toBe('absolute');
    expect(camera).not.toHaveAttribute('aria-disabled');
    for (const b of within(camera).getAllByRole('button')) {
      expect(b).toBeEnabled();
    }
    expect(screen.getByRole('switch', { name: 'Muscles' })).toBeEnabled();
  });

  it('shows "Building 3D model" between the chunk and the first frame', async () => {
    const { factory, loadScene } = fakeScene();
    factory.mockImplementationOnce((opts) => ({
      setDepth() {},
      setLayers() {},
      setPalette() {},
      setReducedMotion() {},
      setActivation() {},
      camera: {},
      dispose() {},
      opts,
    }));
    render(<SquatApp loadScene={loadScene} />);
    await finishDownload();
    await waitFor(() =>
      expect(status()).toHaveTextContent('Building 3D model')
    );
  });

  it('passes view, layer, camera and theme changes to the scene without rebuilding', async () => {
    const user = userEvent.setup();
    const { factory, loadScene, instances } = fakeScene();
    render(<SquatApp loadScene={loadScene} />);
    await finishDownload();
    await waitFor(() => expect(status()).toHaveTextContent('3D model ready'));
    const ctl = instances[0];

    fireEvent.change(screen.getByRole('slider', { name: 'Rep time' }), {
      target: { value: '1.00' },
    });
    expect(ctl.setDepth).toHaveBeenLastCalledWith(manifest.meta.rep.s[50]);

    await user.click(screen.getByRole('switch', { name: 'Skeleton' }));
    expect(ctl.setLayers).toHaveBeenLastCalledWith({
      muscles: true,
      skeleton: false,
    });

    await user.click(
      screen.getByRole('button', { name: 'Front (anterior) view' })
    );
    expect(ctl.camera.preset).toHaveBeenCalledWith('front');

    // Desktop header: the segmented theme control, not the phone's cycler.
    await user.click(screen.getByRole('button', { name: 'Dark' }));
    expect(ctl.setPalette).toHaveBeenLastCalledWith(
      scenePalette('dark'),
      expect.objectContaining({ shadowMapSize: expect.any(Number) })
    );
    expect(factory).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('scene-host').querySelector('canvas')).toBe(
      ctl.canvas
    );
  });

  it('survives a StrictMode double mount with exactly one live scene', async () => {
    const { factory, loadScene, instances } = fakeScene();
    const { unmount } = render(
      <StrictMode>
        <SquatApp loadScene={loadScene} />
      </StrictMode>
    );
    await finishDownload();
    await waitFor(() => expect(status()).toHaveTextContent('3D model ready'));
    const live = () => instances.filter((c) => !c.dispose.mock.calls.length);
    expect(live()).toHaveLength(1);
    expect(
      screen.getByTestId('scene-host').querySelectorAll('canvas')
    ).toHaveLength(1);
    // StrictMode only double-invokes effects on mount; the scene effect
    // first runs for real when the data arrives, so exactly one load and
    // one build. The hook-level test below covers the double mount itself.
    expect(loadScene).toHaveBeenCalledTimes(1);
    expect(factory).toHaveBeenCalledTimes(1);
    unmount();
    expect(live()).toHaveLength(0);
    expect(instances[0].dispose).toHaveBeenCalledTimes(1);
  });

  it('never builds a scene whose chunk arrives after unmount', async () => {
    const { factory, loadScene } = fakeScene();
    let resolveLoad;
    loadScene.mockImplementationOnce(
      () =>
        new Promise((r) => {
          resolveLoad = () => r({ createAnatomyScene: factory });
        })
    );
    const { unmount } = render(<SquatApp loadScene={loadScene} />);
    await finishDownload();
    await waitFor(() => expect(loadScene).toHaveBeenCalled());
    unmount();
    await act(async () => resolveLoad());
    expect(factory).not.toHaveBeenCalled();
  });

  it('reports an import failure online and offers a page reload', async () => {
    const user = userEvent.setup();
    reloadPage.mockClear();
    const { loadScene } = fakeScene();
    loadScene.mockImplementationOnce(() =>
      Promise.reject(new Error('chunk 404'))
    );
    render(<SquatApp loadScene={loadScene} />);
    await finishDownload();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('The 3D engine could not be loaded');
    expect(captureError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ where: 'useAnatomyScene', stage: 'import' })
    );
    await user.click(screen.getByRole('button', { name: 'Reload page' }));
    expect(reloadPage).toHaveBeenCalledTimes(1);
    // No in-place re-import: a cached failure would just fail again.
    expect(loadScene).toHaveBeenCalledTimes(1);
  });

  it('scrubs the rep from the manifest alone when the 3D engine never loads', async () => {
    const { loadScene, instances } = fakeScene();
    loadScene.mockImplementationOnce(() =>
      Promise.reject(new Error('chunk 404'))
    );
    render(<SquatApp loadScene={loadScene} />);
    await finishDownload();
    await screen.findByRole('alert');
    expect(instances).toHaveLength(0);
    const slider = screen.getByRole('slider', { name: 'Rep time' });
    expect(slider).toBeEnabled();
    fireEvent.change(slider, { target: { value: '2.44' } });
    expect(screen.getByTestId('depth-readout')).toHaveTextContent(
      '2.44 s · Drive · 89% depth · drive'
    );
    expect(slider).toHaveAttribute(
      'aria-valuetext',
      'Drive, 2.44 s, 89% depth, modelled'
    );
    const chips = within(screen.getByRole('group', { name: 'Jump to phase' }));
    expect(chips.getByRole('button', { name: 'Drive' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await waitFor(() => expect(window.location.hash).toBe('#t=2.44&paused'));
  });

  it('does not report an import failure while offline', async () => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      get: () => false,
    });
    try {
      const { loadScene } = fakeScene();
      loadScene.mockImplementationOnce(() =>
        Promise.reject(new Error('Failed to fetch'))
      );
      render(<SquatApp loadScene={loadScene} />);
      await finishDownload();
      expect(await screen.findByRole('alert')).toHaveTextContent(
        '3D view needs a connection the first time.'
      );
      expect(
        screen.getByRole('button', { name: 'Reload page' })
      ).toBeInTheDocument();
      expect(captureError).not.toHaveBeenCalled();
    } finally {
      delete window.navigator.onLine;
    }
  });

  it('disposes a scene unmounted while building, before its first frame', async () => {
    const { factory, loadScene } = fakeScene();
    const ctl = {
      setDepth: vi.fn(),
      setLayers: vi.fn(),
      setPalette: vi.fn(),
      setReducedMotion: vi.fn(),
      setActivation: vi.fn(),
      camera: {},
      dispose: vi.fn(),
    };
    factory.mockImplementationOnce(() => ctl);
    const { unmount } = render(<SquatApp loadScene={loadScene} />);
    await finishDownload();
    await waitFor(() => expect(factory).toHaveBeenCalledTimes(1));
    expect(status()).toHaveTextContent('Building 3D model');
    unmount();
    expect(ctl.dispose).toHaveBeenCalledTimes(1);
  });

  it('recovers from a build failure on Retry', async () => {
    const user = userEvent.setup();
    const { factory, loadScene } = fakeScene();
    factory.mockImplementationOnce(() => {
      throw new Error('no context');
    });
    render(<SquatApp loadScene={loadScene} />);
    await finishDownload();
    await screen.findByRole('alert');
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(status()).toHaveTextContent('3D model ready'));
    expect(factory).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('wires the camera controls through the hook', async () => {
    const user = userEvent.setup();
    const { loadScene, instances } = fakeScene();
    render(<SquatApp loadScene={loadScene} />);
    await finishDownload();
    await waitFor(() => expect(status()).toHaveTextContent('3D model ready'));
    const cam = instances[0].camera;
    const group = screen.getByRole('group', { name: 'Camera controls' });
    await user.click(within(group).getByRole('button', { name: 'Reset' }));
    expect(cam.reset).toHaveBeenCalledTimes(1);
    await user.click(within(group).getByRole('button', { name: 'Zoom in' }));
    expect(cam.zoom).toHaveBeenCalledWith(expect.any(Number));
    expect(cam.zoom.mock.calls[0][0]).toBeLessThan(1);
    fireEvent.keyDown(group, { key: 'ArrowRight' });
    expect(cam.orbit).toHaveBeenCalledWith((15 * Math.PI) / 180, 0);
  });

  it('writes t and paused when a scrub settles, never on load', async () => {
    const user = userEvent.setup();
    const { loadScene } = fakeScene();
    render(<SquatApp loadScene={loadScene} />);
    await finishDownload();
    await waitFor(() => expect(status()).toHaveTextContent('3D model ready'));
    // Loading, and a layer switch, leave the URL alone.
    await user.click(screen.getByRole('switch', { name: 'Muscles' }));
    await new Promise((r) => setTimeout(r, 300));
    expect(window.location.hash).toBe('');
    fireEvent.change(screen.getByRole('slider', { name: 'Rep time' }), {
      target: { value: '1.00' },
    });
    await waitFor(() => expect(window.location.hash).toBe('#t=1.00&paused'));
    await user.click(screen.getByRole('switch', { name: 'Skeleton' }));
    await new Promise((r) => setTimeout(r, 300));
    expect(window.location.hash).toBe('#t=1.00&paused');
  });

  it('opens a deep link on its frame and keeps the muscle through a scrub', async () => {
    const slug = 'soleus';
    window.history.replaceState(null, '', `/squat#t=2.44&m=${slug}`);
    const { loadScene, instances } = fakeScene();
    render(<SquatApp loadScene={loadScene} />);
    await finishDownload();
    await waitFor(() => expect(status()).toHaveTextContent('3D model ready'));
    expect(instances[0].setDepth).toHaveBeenLastCalledWith(
      manifest.meta.rep.s[122]
    );
    const chips = screen.getByRole('group', { name: 'Jump to phase' });
    expect(
      within(chips).getByRole('button', { name: 'Drive' })
    ).toHaveAttribute('aria-pressed', 'true');
    expect(window.location.hash).toBe(`#t=2.44&m=${slug}`);
    fireEvent.change(screen.getByRole('slider', { name: 'Rep time' }), {
      target: { value: '1.00' },
    });
    await waitFor(() =>
      expect(window.location.hash).toBe(`#t=1.00&m=${slug}&paused`)
    );
  });

  it('clamps and snaps a hand-written time to the timeline', async () => {
    window.history.replaceState(null, '', '/squat#t=99');
    const { loadScene } = fakeScene();
    const { unmount } = render(<SquatApp loadScene={loadScene} />);
    // The time control works from the manifest alone; no download needed.
    const slider = screen.getByRole('slider', { name: 'Rep time' });
    await waitFor(() => expect(slider).toHaveValue('3.68'));
    const chips = screen.getByRole('group', { name: 'Jump to phase' });
    expect(
      within(chips).getByRole('button', { name: 'Lockout' })
    ).toHaveAttribute('aria-pressed', 'true');
    unmount();

    window.history.replaceState(null, '', '/squat#t=2.45');
    render(<SquatApp loadScene={fakeScene().loadScene} />);
    await waitFor(() =>
      expect(screen.getByRole('slider', { name: 'Rep time' })).toHaveValue(
        '2.46'
      )
    );
  });

  it('reports a build failure', async () => {
    const { factory, loadScene } = fakeScene();
    factory.mockImplementationOnce(() => {
      throw new Error('no context');
    });
    render(<SquatApp loadScene={loadScene} />);
    await finishDownload();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'could not be drawn'
    );
    expect(captureError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ stage: 'build' })
    );
  });

  it('explains a lost context, and Restart builds a fresh scene', async () => {
    const user = userEvent.setup();
    const { factory, loadScene, instances } = fakeScene();
    render(<SquatApp loadScene={loadScene} />);
    await finishDownload();
    await waitFor(() => expect(status()).toHaveTextContent('3D model ready'));
    act(() => instances[0].opts.onContextLost());
    expect(screen.getByRole('alert')).toHaveTextContent('paused the 3D view');
    expect(captureError).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Restart 3D view' }));
    await waitFor(() => expect(status()).toHaveTextContent('3D model ready'));
    expect(factory).toHaveBeenCalledTimes(2);
    expect(instances[0].dispose).toHaveBeenCalled();
    expect(
      screen.getByTestId('scene-host').querySelectorAll('canvas')
    ).toHaveLength(1);
  });

  it('rebuilds when the browser restores the context itself', async () => {
    const { factory, loadScene, instances } = fakeScene();
    render(<SquatApp loadScene={loadScene} />);
    await finishDownload();
    await waitFor(() => expect(status()).toHaveTextContent('3D model ready'));
    act(() => instances[0].opts.onContextLost());
    act(() => instances[0].opts.onContextRestored());
    await waitFor(() => expect(factory).toHaveBeenCalledTimes(2));
  });
});

// matchMedia with live listeners, for the queries SquatApp reads.
function installMatchMedia(initial) {
  const state = { ...initial };
  const listeners = {};
  window.matchMedia = (q) => ({
    get matches() {
      return !!state[q];
    },
    media: q,
    addEventListener: (_, fn) => {
      (listeners[q] ??= new Set()).add(fn);
    },
    removeEventListener: (_, fn) => listeners[q]?.delete(fn),
  });
  return (q, value) => {
    state[q] = value;
    for (const fn of listeners[q] ?? []) fn({ matches: value, media: q });
  };
}

describe('reduced motion', () => {
  const RM = '(prefers-reduced-motion: reduce)';
  afterEach(() => {
    delete window.matchMedia;
  });

  it('builds the scene without motion when the OS asks, and follows changes', async () => {
    const set = installMatchMedia({ [RM]: true });
    const { factory, loadScene, instances } = fakeScene();
    render(<SquatApp loadScene={loadScene} />);
    await finishDownload();
    await waitFor(() => expect(status()).toHaveTextContent('3D model ready'));
    expect(factory.mock.calls[0][0].reducedMotion).toBe(true);
    const ctl = instances[0];
    act(() => set(RM, false));
    expect(ctl.setReducedMotion).toHaveBeenLastCalledWith(false);
    act(() => set(RM, true));
    expect(ctl.setReducedMotion).toHaveBeenLastCalledWith(true);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('builds with motion when the OS does not ask', async () => {
    installMatchMedia({});
    const { factory, loadScene } = fakeScene();
    render(<SquatApp loadScene={loadScene} />);
    await finishDownload();
    await waitFor(() => expect(factory).toHaveBeenCalled());
    expect(factory.mock.calls[0][0].reducedMotion).toBe(false);
  });

  it('builds with shadows off on a coarse pointer', async () => {
    installMatchMedia({ '(pointer: coarse)': true });
    const { factory, loadScene } = fakeScene();
    render(<SquatApp loadScene={loadScene} />);
    await finishDownload();
    await waitFor(() => expect(factory).toHaveBeenCalled());
    expect(factory.mock.calls[0][0].coarsePointer).toBe(true);
  });
});

describe('useAnatomyScene directly', () => {
  const VIEW = { s: 0.25, layers: { muscles: true, skeleton: false } };
  const props = (loadScene, ready = true) => ({
    containerRef: { current: document.createElement('div') },
    manifest,
    buffer,
    ready,
    view: VIEW,
    themeName: 'dark',
    reducedMotion: false,
    loadScene,
  });

  it('survives a StrictMode double mount: two loads, one build, one live scene', async () => {
    const { factory, loadScene, instances } = fakeScene();
    const p = props(loadScene);
    const { result, unmount } = renderHook(() => useAnatomyScene(p), {
      wrapper: StrictMode,
    });
    await waitFor(() => expect(result.current.status).toBe('ready'));
    // Mount, StrictMode's simulated unmount, remount: the first load is
    // cancelled before its chunk resolves, so it never builds.
    expect(loadScene).toHaveBeenCalledTimes(2);
    expect(factory).toHaveBeenCalledTimes(1);
    expect(instances[0].dispose).not.toHaveBeenCalled();
    expect(instances[0].setDepth).toHaveBeenCalledWith(0.25);
    expect(instances[0].setLayers).toHaveBeenCalledWith(VIEW.layers);
    expect(factory.mock.calls[0][0].palette).toEqual(scenePalette('dark'));
    unmount();
    expect(instances[0].dispose).toHaveBeenCalledTimes(1);
  });

  it('accepts camera calls before the scene exists', () => {
    const { loadScene } = fakeScene();
    const { result } = renderHook(() =>
      useAnatomyScene(props(loadScene, false))
    );
    expect(result.current.status).toBe('idle');
    expect(() => {
      result.current.camera.reset();
      result.current.camera.preset('front');
      result.current.camera.orbit(0.1, 0);
      result.current.camera.zoom(0.9);
    }).not.toThrow();
    expect(loadScene).not.toHaveBeenCalled();
  });
});
