import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SquatApp from '../SquatApp.jsx';
import {
  camToPose,
  formatSquatHash,
  parseSquatHash,
} from '../utils/squatHash.js';

// GOLDEN LINKS — a public contract (R11, #439, criterion 11).
//
// A link is out in the world from the moment it is sent. Every row below is
// what such a link must keep opening. Changing an expected value here is a
// breaking change to every link already shared, not a test update: it needs
// its own decision, not a drive-by edit in a later PR (R9's tabs, R12–R14's
// generalisation, a data change).

const G1 = '';
const G2 = '#t=2.44&paused';
const G3 = '#t=1.00&m=soleus&paused';
const G4 = '#guide=metrics&m=soleus&paused';
const G5 =
  '#t=2.44&m=vastus-lateralis&paused&cam=90,85,2.50&hide=skeleton&heat';
const G6 = '#cam=-135,20,6.00';
const G7 =
  '#t=99&cam=999,-5,0.1&hide=bogus,muscles,muscles&heat=0&foo=1&cam=10,10,1';
const G8 = `#t=${'9'.repeat(400)}`;
const G9 = '#cam=10,200,abc';

// [name, input, re-format, opened view]
const GOLDEN = [
  ['G1', G1, '', { t: '0.00', cam: null }],
  ['G2', G2, G2, { t: '2.44', phase: 'Drive', cam: null }],
  ['G3', G3, G3, { t: '1.00', muscle: 'Soleus', cam: null }],
  [
    'G4',
    G4,
    G4,
    { t: '0.00', muscle: 'Soleus', guide: 'Metrics and targets', cam: null },
  ],
  [
    'G5',
    G5,
    G5,
    {
      t: '2.44',
      muscle: 'Vastus lateralis',
      skeleton: false,
      heat: true,
      cam: { az: 90, pol: 85, dist: 2.5 },
    },
  ],
  ['G6', G6, G6, { t: '0.00', cam: { az: -135, pol: 20, dist: 6 } }],
  [
    'G7',
    G7,
    '#t=99.00&cam=10,10,1.00&hide=muscles',
    {
      t: '3.68',
      phase: 'Lockout',
      muscles: false,
      heat: false,
      cam: { az: 10, pol: 10, dist: 1 },
    },
  ],
  ['G8', G8, '#t=600.00', { t: '3.68', phase: 'Lockout', cam: null }],
  ['G9', G9, '', { t: '0.00', cam: null }],
];

const ORIGIN = 'https://splitiq.example';

describe('golden links: parse and re-format', () => {
  it.each(GOLDEN)('%s', (_name, input, again) => {
    const once = formatSquatHash(parseSquatHash(input));
    expect(once).toBe(again);
    expect(formatSquatHash(parseSquatHash(once))).toBe(again);
    expect(new URL(`${ORIGIN}/squat${once}`).search).toBe('');
  });
});

// ── the opened view ─────────────────────────────────────────────────────

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

const ASSETS = join(process.cwd(), 'src/squat/assets');
const manifest = JSON.parse(
  readFileSync(join(ASSETS, 'squat-manifest.json'), 'utf8')
);
const raw = gunzipSync(readFileSync(join(ASSETS, 'squat-anatomy.bin')));
const buffer = raw.buffer.slice(
  raw.byteOffset,
  raw.byteOffset + raw.byteLength
);

// A scene that records what it was built with and reports `ctl.pose`.
function fakeScene() {
  const instances = [];
  const factory = (opts) => {
    const ctl = {
      opts,
      pose: { radius: 3.6, polar: 1.32, azimuth: 0.92, home: true },
      setDepth() {},
      setLayers: vi.fn(),
      setPalette() {},
      setReducedMotion() {},
      setActivation: vi.fn(),
      setFocus: vi.fn(),
      camera: {
        reset() {},
        preset() {},
        orbit() {},
        zoom() {},
        pose: () => ctl.pose,
        setPose: vi.fn(),
      },
      dispose() {},
    };
    instances.push(ctl);
    setTimeout(() => opts.onFirstFrame());
    return ctl;
  };
  return {
    instances,
    loadScene: () => Promise.resolve({ createAnatomyScene: factory }),
  };
}

const WIDE = '(min-width: 761px)';
beforeEach(() => {
  window.matchMedia = (q) => ({
    matches: q === WIDE,
    media: q,
    addEventListener() {},
    removeEventListener() {},
  });
  mocks.workers.length = 0;
  globalThis.fetch = vi
    .fn()
    .mockResolvedValue({ ok: true, json: () => Promise.resolve(manifest) });
});
afterEach(() => {
  window.localStorage.clear();
  delete window.matchMedia;
  window.history.replaceState(null, '', '/squat');
});

async function open(hash) {
  mocks.workers.length = 0;
  window.history.replaceState(null, '', `/squat${hash}`);
  const scene = fakeScene();
  const utils = render(<SquatApp loadScene={scene.loadScene} />);
  await waitFor(() => expect(mocks.workers).toHaveLength(1));
  act(() => mocks.workers[0].onmessage({ data: { type: 'done', buffer } }));
  await waitFor(() =>
    expect(screen.getByTestId('load-status')).toHaveTextContent(
      '3D model ready'
    )
  );
  return { ...scene, ...utils };
}

const near = (a, b) => {
  expect(a.radius).toBeCloseTo(b.radius, 9);
  expect(a.polar).toBeCloseTo(b.polar, 9);
  expect(a.azimuth).toBeCloseTo(b.azimuth, 9);
};
const slider = () => screen.getByRole('slider', { name: 'Rep time' });
const sw = (name) => screen.getByRole('switch', { name });

describe('golden links: the view each one opens', () => {
  it.each(GOLDEN)('%s', async (_name, input, _again, want) => {
    const { instances } = await open(input);
    await waitFor(() => expect(slider()).toHaveValue(want.t));
    if (want.phase) {
      expect(
        within(screen.getByRole('group', { name: 'Jump to phase' })).getByRole(
          'button',
          { name: want.phase }
        )
      ).toHaveAttribute('aria-pressed', 'true');
    }
    const selected = screen
      .queryAllByRole('option')
      .filter((o) => o.getAttribute('aria-selected') === 'true');
    if (want.muscle) {
      expect(selected).toHaveLength(1);
      expect(selected[0]).toHaveAccessibleName(
        expect.stringContaining(want.muscle)
      );
    } else {
      expect(selected).toHaveLength(0);
    }
    expect(sw('Muscles').checked).toBe(want.muscles ?? true);
    expect(sw('Skeleton').checked).toBe(want.skeleton ?? true);
    expect(sw('Activation heatmap').checked).toBe(want.heat ?? false);
    if (want.guide) {
      expect(
        within(screen.getByRole('dialog')).getByRole('tab', {
          name: want.guide,
        })
      ).toHaveAttribute('aria-selected', 'true');
    } else {
      expect(screen.queryByRole('dialog')).toBeNull();
    }
    const initial = instances[0].opts.initialPose;
    if (want.cam) near(initial, camToPose(want.cam));
    else expect(initial).toBeNull();
    // Never starts playback.
    expect(
      screen.getByRole('button', { name: 'Play', exact: true })
    ).toBeInTheDocument();
  });
});

// Criterion 6: one round trip over EVERY key Copy can emit. It walks the keys
// of the copied link's own parse, so a key added to the grammar without a
// restore check here fails this test.
describe('copy, then open: every key round-trips', () => {
  const RESTORED = {
    t: (s) => expect(slider()).toHaveValue(s.t.toFixed(2)),
    paused: () =>
      expect(
        screen.getByRole('button', { name: 'Play', exact: true })
      ).toBeInTheDocument(),
    // R11 gives `tab` no meaning on screen; restoring it means the reopened
    // address bar still carries it.
    tab: (s) => expect(parseSquatHash(window.location.hash).tab).toBe(s.tab),
    m: () =>
      expect(screen.getByRole('option', { name: /Soleus/ })).toHaveAttribute(
        'aria-selected',
        'true'
      ),
    cam: (s, _h, ctl) => near(ctl.opts.initialPose, camToPose(s.cam)),
    hide: () => {
      expect(sw('Muscles')).not.toBeChecked();
      expect(sw('Skeleton')).not.toBeChecked();
    },
    heat: () => {
      expect(sw('Activation heatmap')).toBeChecked();
      // The legend shows only with the heatmap on and the scene drawn.
      expect(
        screen.getByRole('heading', { name: 'Activation key' })
      ).toBeInTheDocument();
    },
  };
  const DEFAULTS = parseSquatHash('');

  it('restores each one', async () => {
    const user = userEvent.setup();
    const first = await open('#tab=act');
    const ctl = first.instances[0];
    fireEvent.change(slider(), { target: { value: '2.44' } });
    await user.click(sw('Muscles'));
    await user.click(sw('Skeleton'));
    await user.click(sw('Activation heatmap'));
    await user.click(screen.getByRole('option', { name: /Soleus/ }));
    ctl.pose = { ...camToPose({ az: -45, pol: 70, dist: 3.2 }), home: false };
    await user.click(
      screen.getByRole('button', { name: 'Copy link to this view' })
    );
    const link = await window.navigator.clipboard.readText();
    const url = new URL(link);
    expect(url.pathname).toBe('/squat');
    expect(url.search).toBe('');
    const state = parseSquatHash(url.hash);
    const emitted = Object.keys(state).filter(
      (k) => JSON.stringify(state[k]) !== JSON.stringify(DEFAULTS[k])
    );
    // Everything but guide, which the button never shares.
    expect(emitted.sort()).toEqual(
      ['t', 'tab', 'm', 'paused', 'cam', 'hide', 'heat'].sort()
    );
    first.unmount();

    const second = await open(url.hash);
    await waitFor(() => expect(slider()).toHaveValue('2.44'));
    for (const key of emitted) {
      expect(RESTORED[key], `no restore check for "${key}"`).toBeTypeOf(
        'function'
      );
      RESTORED[key](state, window.location.hash, second.instances[0]);
    }
    // Opening the link did not rewrite it.
    expect(window.location.hash).toBe(url.hash);
  });
});
