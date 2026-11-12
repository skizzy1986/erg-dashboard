import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SquatRoute from '../../SquatApp.jsx';

const mocks = vi.hoisted(() => ({ workers: [] }));
vi.mock('../../hooks/useCapabilities.js', () => ({
  useCapabilities: () => ({ webgl: true, decompression: true, worker: true }),
}));
vi.mock('../../workers/createAnatomyWorker.js', () => ({
  createAnatomyWorker: () => {
    const w = { postMessage: vi.fn(), terminate: vi.fn() };
    mocks.workers.push(w);
    return w;
  },
}));
vi.mock('../../../utils/sentry.js', () => ({ captureError: vi.fn() }));

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
    const listeners = new Set();
    const ctl = {
      setDepth: vi.fn(),
      setLayers: vi.fn(),
      setPalette: vi.fn(),
      setReducedMotion: vi.fn(),
      setActivation: vi.fn(),
      setEmphasis: vi.fn(),
      focusOf: vi.fn(() => ({ centre: [0.1, 0.9, 0.1], radius: 0.12 })),
      camera: {
        reset: vi.fn(),
        preset: vi.fn(),
        orbit: vi.fn(),
        zoom: vi.fn(),
        set: vi.fn(),
        follow: vi.fn(),
        onUser: (fn) => {
          listeners.add(fn);
          return () => listeners.delete(fn);
        },
      },
      drag: () => listeners.forEach((fn) => fn()),
      dispose: vi.fn(),
    };
    instances.push(ctl);
    setTimeout(() => opts.onFirstFrame());
    return ctl;
  });
  return {
    instances,
    loadScene: () => Promise.resolve({ createAnatomyScene: factory }),
  };
}

beforeEach(() => {
  mocks.workers.length = 0;
  globalThis.fetch = vi
    .fn()
    .mockResolvedValue({ ok: true, json: () => Promise.resolve(manifest) });
  window.history.replaceState(null, '', '/squat?lab');
});

afterEach(() => {
  window.history.replaceState(null, '', '/squat');
  window.localStorage.clear();
});

async function ready(loadScene) {
  render(<SquatRoute loadScene={loadScene} />);
  await waitFor(() => expect(mocks.workers).toHaveLength(1));
  act(() => {
    mocks.workers[0].onmessage({ data: { type: 'done', buffer } });
  });
  await screen.findByTestId('strain-panel');
}

describe('SquatLab (/squat?lab)', () => {
  it('autoplays, drives the director camera, and spotlights the top three', async () => {
    const { loadScene, instances } = fakeScene();
    await ready(loadScene);
    const ctl = instances[0];
    expect(
      await screen.findByRole('button', { name: 'Pause' })
    ).toBeInTheDocument();
    await waitFor(() => expect(ctl.camera.follow).toHaveBeenCalled());
    const panel = screen.getByTestId('strain-panel');
    expect(within(panel).getAllByRole('button')).toHaveLength(3);
    expect(panel.textContent).toMatch(/not EMG/);
    const last = ctl.setEmphasis.mock.calls.at(-1)[0];
    expect(last).toHaveLength(3);
  });

  it('hands the camera to the user on drag and offers fixed angles', async () => {
    const user = userEvent.setup();
    const { loadScene, instances } = fakeScene();
    await ready(loadScene);
    const ctl = instances[0];
    await user.click(await screen.findByRole('button', { name: 'Pause' }));
    act(() => ctl.drag());
    expect(screen.getByRole('button', { name: 'Fixed' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await user.click(screen.getByRole('button', { name: 'Front' }));
    expect(ctl.camera.preset).toHaveBeenCalledWith('front');
    ctl.camera.follow.mockClear();
    await user.click(screen.getByRole('button', { name: 'Drive' }));
    expect(ctl.camera.follow).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Director' }));
    expect(ctl.camera.follow).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Show-off' })).toBeNull();
  });

  it('picking a top muscle emphasises only that muscle', async () => {
    const user = userEvent.setup();
    const { loadScene, instances } = fakeScene();
    await ready(loadScene);
    await user.click(await screen.findByRole('button', { name: 'Pause' }));
    const first = within(screen.getByTestId('strain-panel')).getAllByRole(
      'button'
    )[0];
    await user.click(first);
    await waitFor(() =>
      expect(instances[0].setEmphasis.mock.calls.at(-1)[0]).toHaveLength(1)
    );
    expect(window.location.hash).toMatch(/m=/);
    // Director pushes in on the picked muscle.
    await user.click(screen.getByRole('button', { name: 'Director' }));
    await waitFor(() =>
      expect(instances[0].camera.follow.mock.calls.at(-1)[1]).toEqual([
        0.1, 0.9, 0.1,
      ])
    );
    await user.click(screen.getByRole('button', { name: 'Fixed' }));
    await user.click(screen.getByRole('button', { name: 'Frame muscle' }));
    expect(instances[0].camera.follow.mock.calls.at(-1)[1]).toEqual([
      0.1, 0.9, 0.1,
    ]);
    await user.click(screen.getByRole('button', { name: 'Heatmap' }));
    expect(screen.queryByTestId('strain-panel')).toBeNull();
  });
});
