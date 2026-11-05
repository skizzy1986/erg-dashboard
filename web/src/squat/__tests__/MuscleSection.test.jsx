import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SquatApp from '../SquatApp.jsx';
import { ACT_NOTE, STALE_LINK } from '../constants/activationBands.js';
import { activationAt } from '../utils/activation.js';

// The muscle panel inside the real app shell, with the scene faked at the
// loadScene seam — the same seam SquatScene.test.jsx uses.
const mocks = vi.hoisted(() => ({ caps: null, workers: [] }));
vi.mock('../hooks/useCapabilities.js', () => ({
  useCapabilities: () => mocks.caps,
}));
vi.mock('../workers/createAnatomyWorker.js', () => ({
  createAnatomyWorker: () => {
    const w = { postMessage: vi.fn(), terminate: vi.fn() };
    mocks.workers.push(w);
    return w;
  },
}));
vi.mock('../../utils/sentry.js', () => ({ captureError: vi.fn() }));

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
  return {
    factory,
    instances,
    loadScene: vi.fn(() => Promise.resolve({ createAnatomyScene: factory })),
  };
}

async function finishDownload() {
  await waitFor(() => expect(mocks.workers).toHaveLength(1));
  act(() => {
    mocks.workers[0].onmessage({ data: { type: 'done', buffer } });
  });
}

const options = () => screen.getAllByRole('option');
const filter = () => screen.getByRole('searchbox', { name: /Filter muscles/ });

beforeEach(() => {
  mocks.caps = { webgl: true, decompression: true, worker: true };
  mocks.workers.length = 0;
  globalThis.fetch = vi
    .fn()
    .mockResolvedValue({ ok: true, json: () => Promise.resolve(manifest) });
  window.history.replaceState(null, '', '/squat');
});
afterEach(() => window.localStorage.clear());

async function openList() {
  const scene = fakeScene();
  render(<SquatApp loadScene={scene.loadScene} />);
  await finishDownload();
  await waitFor(() => expect(options()).toHaveLength(118));
  return scene;
}

describe('the muscle section in the page', () => {
  it('sits between the depth controls and the phase strip', async () => {
    await openList();
    const section = screen
      .getByRole('heading', { level: 2, name: 'Every muscle in the lift' })
      .closest('section');
    const depth = screen
      .getByRole('heading', { name: 'Depth' })
      .closest('section');
    const phases = screen
      .getByRole('heading', { name: 'The rep in five phases' })
      .closest('section');
    // The depth and direction the card's band depends on come first.
    const FOLLOWING = 4; // Node.DOCUMENT_POSITION_FOLLOWING
    expect(depth.compareDocumentPosition(section)).toBe(FOLLOWING);
    expect(section.compareDocumentPosition(phases)).toBe(FOLLOWING);
  });

  it('keeps attribution and the modelled framing visible beside the card', async () => {
    const user = userEvent.setup();
    await openList();
    await user.click(screen.getByRole('option', { name: 'Soleus' }));
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(
      screen.getByText(/Anatomy: BodyParts3D © DBCLS, CC BY-SA 2.1 JP/)
    ).toBeInTheDocument();
    expect(screen.getByText('Modelled, not measured')).toBeInTheDocument();
    expect(
      screen.getByText(/Muscle activation is estimated from joint moments/)
    ).toBeInTheDocument();
  });

  it('opens the card on a click and deep-links the selection', async () => {
    const user = userEvent.setup();
    await openList();
    await user.click(screen.getByRole('option', { name: 'Soleus' }));
    expect(window.location.hash).toBe('#m=soleus');
    expect(
      screen.getByRole('heading', { level: 3, name: 'Soleus' })
    ).toHaveFocus();
    expect(screen.getByTestId('muscle-band')).toHaveTextContent(ACT_NOTE);
  });

  it('restores a selection from #m= on load, after the manifest arrives', async () => {
    window.history.replaceState(null, '', '/squat#m=vastus-lateralis');
    await openList();
    expect(
      screen.getByRole('heading', { level: 3, name: 'Vastus lateralis' })
    ).toBeInTheDocument();
    expect(window.location.hash).toBe('#m=vastus-lateralis');
  });

  it('shows the stale-link message and strips a dead #m=', async () => {
    window.history.replaceState(null, '', '/squat#m=not-a-muscle');
    await openList();
    expect(await screen.findByRole('alert')).toHaveTextContent(STALE_LINK);
    expect(window.location.hash).toBe('');
    expect(screen.getByText(/Pick a muscle from the list/)).toBeInTheDocument();
  });

  it('never injects the hash value into the DOM as markup', async () => {
    const evil = 'img-src-x-onerror-alert-1';
    window.history.replaceState(null, '', `/squat#m=${evil}`);
    await openList();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByRole('alert')).toHaveTextContent(STALE_LINK);
    // And a shape-invalid value is dropped by the parser before this point.
    expect(document.body.innerHTML).not.toContain('onerror');
  });

  it('the band follows depth and direction; the list does not re-render per step', async () => {
    const user = userEvent.setup();
    await openList();
    await user.click(screen.getByRole('option', { name: 'Gluteus maximus' }));
    expect(screen.getByTestId('muscle-band')).toHaveTextContent(
      /Low at 0% depth, lowering \(Standing\)/
    );
    fireEvent.change(screen.getByRole('slider', { name: 'Depth' }), {
      target: { value: '40' },
    });
    expect(screen.getByTestId('muscle-band')).toHaveTextContent(
      /Moderate at 100% depth, lowering \(Bottom\)/
    );
    await user.click(screen.getByRole('radio', { name: 'Drive' }));
    expect(screen.getByTestId('muscle-band')).toHaveTextContent(/drive/);
    // The peak line is depth-independent — that is its job.
    expect(screen.getByTestId('muscle-peak')).toHaveTextContent(
      'Peaks at High in the drive.'
    );
    // No per-option band, so no option carries a depth-dependent name.
    for (const o of options().slice(0, 5)) {
      expect(o.textContent).not.toMatch(/Low|Moderate|High/);
    }
  });

  it('typing in the filter adds NO history entry per keystroke', async () => {
    const user = userEvent.setup();
    await openList();
    const before = window.history.length;
    await user.type(filter(), 'soleus');
    expect(window.history.length).toBe(before);
    expect(window.location.hash).toBe('');
    await waitFor(() => expect(options()).toHaveLength(1));
  });

  it('a filter that hides the selection keeps the card open', async () => {
    const user = userEvent.setup();
    await openList();
    await user.click(screen.getByRole('option', { name: 'Gluteus maximus' }));
    await user.type(filter(), 'soleus');
    await waitFor(() => expect(options()).toHaveLength(1));
    expect(
      screen.queryByRole('option', { name: 'Gluteus maximus' })
    ).toBeNull();
    // Still selected, still shown, and still in the URL.
    expect(
      screen.getByRole('heading', { level: 3, name: 'Gluteus maximus' })
    ).toBeInTheDocument();
    expect(window.location.hash).toBe('#m=gluteus-maximus');
    expect(options().filter((o) => o.tabIndex === 0)).toHaveLength(1);
  });

  it('after Clear, focus lands somewhere sensible — not the document body', async () => {
    const user = userEvent.setup();
    await openList();
    await user.click(screen.getByRole('option', { name: 'Soleus' }));
    await user.click(screen.getByRole('button', { name: 'Clear selection' }));
    expect(window.location.hash).toBe('');
    // The Clear button has just been unmounted, so focus would otherwise fall
    // to the document body.
    expect(document.activeElement).not.toBe(document.body);
    expect(
      screen.getByRole('heading', { level: 3, name: 'Muscle detail' })
    ).toHaveFocus();
    expect(screen.getByText(/Pick a muscle from the list/)).toBeInTheDocument();
  });

  it('drives the scene heatmap from the switch, off by default', async () => {
    const user = userEvent.setup();
    const { instances } = await openList();
    await waitFor(() => expect(instances).toHaveLength(1));
    const ctl = instances[0];
    await waitFor(() => expect(ctl.setActivation).toHaveBeenCalled());
    // Off by default: the scene is told to use the anatomy colours.
    expect(ctl.setActivation).toHaveBeenLastCalledWith(null);
    expect(screen.queryByText(/Activation key/i)).toBeNull();

    await user.click(
      screen.getByRole('switch', { name: 'Activation heatmap' })
    );
    const weights = ctl.setActivation.mock.calls.at(-1)[0];
    expect(weights).toBeInstanceOf(Float32Array);
    expect([...weights]).toEqual([
      ...activationAt(manifest.meta.muscles, 0, 'lowering'),
    ]);
    expect(screen.getByText(/Activation key/i)).toBeInTheDocument();

    await user.click(
      screen.getByRole('switch', { name: 'Activation heatmap' })
    );
    expect(ctl.setActivation).toHaveBeenLastCalledWith(null);
    expect(screen.queryByText(/Activation key/i)).toBeNull();
  });

  it('re-sends the weights when depth moves under the heatmap', async () => {
    const user = userEvent.setup();
    const { instances } = await openList();
    await waitFor(() => expect(instances).toHaveLength(1));
    const ctl = instances[0];
    await user.click(
      screen.getByRole('switch', { name: 'Activation heatmap' })
    );
    const first = ctl.setActivation.mock.calls.length;
    fireEvent.change(screen.getByRole('slider', { name: 'Depth' }), {
      target: { value: '40' },
    });
    expect(ctl.setActivation.mock.calls.length).toBeGreaterThan(first);
    expect([...ctl.setActivation.mock.calls.at(-1)[0]]).toEqual([
      ...activationAt(manifest.meta.muscles, 1, 'lowering'),
    ]);
  });

  it('a deep link selects a muscle without turning the heatmap on', async () => {
    window.history.replaceState(null, '', '/squat#m=soleus');
    const { instances } = await openList();
    expect(
      screen.getByRole('switch', { name: 'Activation heatmap' })
    ).not.toBeChecked();
    await waitFor(() =>
      expect(instances[0].setActivation).toHaveBeenLastCalledWith(null)
    );
    expect(screen.queryByText(/Activation key/i)).toBeNull();
  });
});

describe('the no-scene path keeps the list whole', () => {
  it('lists, filters and bands every muscle with no WebGL at all', async () => {
    const user = userEvent.setup();
    mocks.caps = { webgl: false, decompression: false, worker: false };
    render(<SquatApp />);
    await waitFor(() => expect(options()).toHaveLength(118));
    // The manifest still loads, so names, roles and act are all present.
    expect(mocks.workers).toHaveLength(0);
    expect(
      screen.getByRole('note', { name: '3D view unavailable' })
    ).toBeInTheDocument();

    await user.click(screen.getByRole('option', { name: 'Gluteus maximus' }));
    expect(screen.getByTestId('muscle-band')).toHaveTextContent(
      /Low at 0% depth/
    );
    expect(screen.getByTestId('muscle-peak')).toHaveTextContent('Peaks at');
    await user.type(filter(), 'calves');
    await waitFor(() => expect(options()).toHaveLength(14));

    // The heatmap and its legend cannot exist here, and the switch is gone
    // with the rest of ViewOptions.
    expect(
      screen.queryByRole('switch', { name: 'Activation heatmap' })
    ).toBeNull();
    expect(screen.queryByText(/Activation key/i)).toBeNull();
  });
});
