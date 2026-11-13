import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SquatApp, { PAGE_DESCRIPTION, PAGE_TITLE } from '../SquatApp.jsx';
import { HEADER_HEIGHT } from '../components/SquatHeader.jsx';
import { ACT_NOTE } from '../constants/activationBands.js';

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

const manifest = JSON.parse(
  readFileSync(
    join(process.cwd(), 'src/squat/assets/squat-manifest.json'),
    'utf8'
  )
);

beforeEach(() => {
  mocks.caps = { webgl: true, decompression: true, worker: true };
  mocks.workers.length = 0;
  globalThis.fetch = vi
    .fn()
    .mockResolvedValue({ ok: true, json: () => Promise.resolve(manifest) });
  window.history.replaceState(null, '', '/squat');
  document.title = 'SplitIQ';
});

afterEach(() => window.localStorage.clear());

describe('SquatApp', () => {
  it('renders the shell, sets the page title, and restores it on unmount', async () => {
    const { unmount, container } = render(<SquatApp />);
    expect(document.title).toBe(PAGE_TITLE);
    expect(
      document.querySelector('meta[name="description"]').getAttribute('content')
    ).toBe(PAGE_DESCRIPTION);
    expect(
      screen.getByRole('heading', { level: 1, name: 'High-bar back squat' })
    ).toBeInTheDocument();
    // Two status regions now: the loader and the muscle filter's match count.
    expect(screen.getByTestId('load-status')).toHaveAttribute('role', 'status');
    expect(screen.getByTestId('load-status').textContent).toMatch(
      /Downloading anatomy/
    );
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(container.firstChild).toHaveAttribute('data-theme', 'light');
    await waitFor(() =>
      expect(
        screen.getByText('10 of 10 targets met by the reference rep')
      ).toBeInTheDocument()
    );
    expect(window.__squat).toBeUndefined();
    unmount();
    expect(document.title).toBe('SplitIQ');
    expect(document.querySelector('meta[name="description"]')).toBeNull();
  });

  it('keeps an existing description meta and restores its content', () => {
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'description');
    meta.setAttribute('content', 'Dashboard');
    document.head.appendChild(meta);
    const { unmount } = render(<SquatApp />);
    expect(meta.getAttribute('content')).toBe(PAGE_DESCRIPTION);
    unmount();
    expect(meta.getAttribute('content')).toBe('Dashboard');
    meta.remove();
  });

  it('opens the guide from the hero, deep-links it, and closes it', async () => {
    const user = userEvent.setup();
    render(<SquatApp />);
    await user.click(screen.getByRole('button', { name: 'Coaching guide' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(window.location.hash).toBe('#guide=phases');
    await user.keyboard('{ArrowRight}');
    expect(window.location.hash).toBe('#guide=metrics');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(window.location.hash).toBe('');
  });

  it('opens straight to a pane from the URL, and Sources from the footer', async () => {
    window.history.replaceState(null, '', '/squat#guide=method');
    const user = userEvent.setup();
    const { unmount } = render(<SquatApp />);
    expect(
      screen.getByRole('tab', { name: 'Method and limits' })
    ).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{Escape}');
    await user.click(
      within(screen.getByRole('contentinfo')).getByRole('button', {
        name: 'Sources',
      })
    );
    expect(screen.getByRole('tab', { name: 'Sources' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    unmount();
  });

  it('switches to dark on the tool root and the document ground', async () => {
    const user = userEvent.setup();
    const { container } = render(<SquatApp />);
    // Phone layout (no matchMedia): one cycling button, Auto → Light → Dark.
    await user.click(screen.getByRole('button', { name: /Switch to Light/ }));
    await user.click(screen.getByRole('button', { name: /Switch to Dark/ }));
    expect(container.firstChild).toHaveAttribute('data-theme', 'dark');
    expect(document.body.style.backgroundColor).toBe('rgb(8, 8, 13)');
  });

  it('keeps the guide and form check without WebGL, and skips the download', async () => {
    mocks.caps = { webgl: false, decompression: true, worker: true };
    render(<SquatApp />);
    expect(
      screen.getByRole('note', { name: '3D view unavailable' })
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByText('10 of 10 targets met by the reference rep')
      ).toBeInTheDocument()
    );
    expect(mocks.workers).toHaveLength(0);
    expect(
      screen.getByRole('button', { name: 'Coaching guide' })
    ).toBeEnabled();
    // Criterion 21: the controls still render, the time controls work from
    // the manifest, and the scene-only groups are left out.
    const controls = screen.getByRole('region', { name: 'Controls' });
    await waitFor(() =>
      expect(
        within(controls).getByRole('slider', { name: 'Rep time' })
      ).toBeEnabled()
    );
    expect(
      within(controls).queryByRole('group', { name: 'Camera controls' })
    ).toBeNull();
    expect(within(controls).queryByRole('switch')).toBeNull();
  });

  // R11 criterion 1, on both layouts and with or without WebGL.
  it.each([
    ['phone', false, true],
    ['phone, no WebGL', false, false],
    ['desktop', true, true],
    ['desktop, no WebGL', true, false],
  ])(
    'lays Copy link out from the first paint, disabled until the data loads (%s)',
    async (_label, wide, webgl) => {
      mocks.caps = { webgl, decompression: true, worker: true };
      window.matchMedia = (q) => ({
        matches: wide && q === '(min-width: 761px)',
        addEventListener() {},
        removeEventListener() {},
      });
      try {
        render(<SquatApp />);
        // On a phone it sits in the closed Share tab: mounted, but hidden.
        const copy = screen.getByRole('button', {
          name: 'Copy link to this view',
          hidden: !wide,
        });
        expect(copy).toBeDisabled();
        expect(screen.getByTestId('share-status')).toHaveAttribute(
          'role',
          'status'
        );
        const controls = screen.getByRole('region', { name: 'Controls' });
        expect(controls).toContainElement(copy);
        if (wide) {
          // The third rail footer button, beside the guide buttons.
          expect(copy.parentElement).toBe(
            within(controls).getByRole('button', { name: 'Coaching guide' })
              .parentElement
          );
        } else {
          expect(
            within(controls).getByRole('button', { name: 'Share' })
          ).toHaveAttribute('aria-expanded', 'false');
        }
        // The manifest alone readies it: no 3D is needed to share.
        await waitFor(() => expect(copy).toBeEnabled());
      } finally {
        delete window.matchMedia;
      }
    }
  );

  it('opens the method pane from the modelled-values note', async () => {
    const user = userEvent.setup();
    render(<SquatApp />);
    await user.click(screen.getByRole('button', { name: 'Method and limits' }));
    expect(
      screen.getByRole('tab', { name: 'Method and limits' })
    ).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: 'Cues and faults' }));
    expect(screen.getByRole('tab', { name: 'Phases' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('lays out the desktop grid at 761 px and up', async () => {
    window.matchMedia = (q) => ({
      matches: q === '(min-width: 761px)',
      addEventListener() {},
      removeEventListener() {},
    });
    try {
      const user = userEvent.setup();
      render(<SquatApp />);
      expect(
        screen.getByRole('link', { name: /Open SplitIQ/ })
      ).toBeInTheDocument();
      await waitFor(() =>
        expect(
          screen.getByText('10 of 10 targets met by the reference rep')
        ).toBeInTheDocument()
      );
      await user.click(
        screen.getByRole('button', { name: 'Metrics and targets' })
      );
      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getAllByRole('row')).toHaveLength(19);
      expect(screen.getByText('1.15 at depth')).toBeInTheDocument();
    } finally {
      delete window.matchMedia;
    }
  });

  describe('model as hero', () => {
    const wideScreen = () => {
      window.matchMedia = (q) => ({
        matches: q === '(min-width: 761px)',
        addEventListener() {},
        removeEventListener() {},
      });
    };
    afterEach(() => {
      delete window.matchMedia;
    });
    const FOLLOWING = 4; // Node.DOCUMENT_POSITION_FOLLOWING
    const follows = (a, b) =>
      (a.compareDocumentPosition(b) & FOLLOWING) === FOLLOWING;
    // Let the mocked manifest fetch settle inside act before the test ends.
    const settle = () =>
      waitFor(() =>
        expect(
          screen.getByRole('listbox', { name: 'Muscles by region' })
        ).toBeInTheDocument()
      );

    it('criterion 15: desktop puts the stage in the first column, the rail beside it', async () => {
      wideScreen();
      render(<SquatApp />);
      const hero = screen.getByTestId('squat-hero');
      expect(hero.style.display).toBe('grid');
      expect(hero.style.gridTemplateColumns).toBe(
        'minmax(0, 1fr) clamp(260px, 26vw, 320px)'
      );
      const [first, second] = hero.children;
      expect(first).toBe(screen.getByRole('region', { name: '3D model' }));
      expect(second).toBe(screen.getByRole('region', { name: 'Controls' }));
      // The stage's floor; the e2e measures the rendered size at 1280 × 720.
      expect(first.style.minHeight).toBe('520px');
      // The guide buttons moved from the intro into the rail's footer.
      expect(
        within(second).getByRole('button', { name: 'Coaching guide' })
      ).toBeInTheDocument();
      expect(
        screen.getAllByRole('button', { name: 'Coaching guide' })
      ).toHaveLength(1);
      await settle();
    });

    it('criterion 19: a phone stacks the stage over the docked bar', async () => {
      render(<SquatApp />);
      const hero = screen.getByTestId('squat-hero');
      expect(hero.style.flexDirection).toBe('column');
      const [first, second] = hero.children;
      expect(first).toBe(screen.getByRole('region', { name: '3D model' }));
      expect(second).toBe(screen.getByRole('region', { name: 'Controls' }));
      expect(
        within(second).getByRole('button', { name: 'Rep', exact: true })
      ).toHaveAttribute('aria-expanded', 'true');
      await settle();
    });

    it('the h1 sits on the stage and is the first heading', async () => {
      wideScreen();
      render(<SquatApp />);
      const h1 = screen.getByRole('heading', {
        level: 1,
        name: 'High-bar back squat',
      });
      expect(screen.getByRole('region', { name: '3D model' })).toContainElement(
        h1
      );
      expect(screen.getAllByRole('heading')[0]).toBe(h1);
      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
      await settle();
    });

    it('clears the sticky header with scroll-padding, and restores it on unmount', async () => {
      wideScreen();
      document.documentElement.style.scrollPaddingTop = '3px';
      const { unmount } = render(<SquatApp />);
      expect(document.documentElement.style.scrollPaddingTop).toBe(
        `calc(${HEADER_HEIGHT.wide}px + env(safe-area-inset-top, 0px))`
      );
      await settle();
      unmount();
      expect(document.documentElement.style.scrollPaddingTop).toBe('3px');
      document.documentElement.style.scrollPaddingTop = '';
    });

    it('criterion 18: the non-tool content stays in the DOM, after the tools', async () => {
      wideScreen();
      render(<SquatApp />);
      const rail = screen.getByRole('region', { name: 'Controls' });
      const below = [
        screen.getByRole('heading', { name: 'Form check' }),
        screen.getByRole('heading', { name: 'Every muscle in the lift' }),
        screen.getByRole('heading', { name: 'The rep in five phases' }),
        screen.getByText(/Every value on this page comes from a modelled/),
        screen.getByRole('contentinfo'),
      ];
      for (const el of below) expect(follows(rail, el)).toBe(true);
      await waitFor(() =>
        expect(
          screen.getByRole('listbox', { name: 'Muscles by region' })
        ).toBeInTheDocument()
      );
    });
  });
});

// PR B (HERO_STAGE_SPEC.md): the strain readout, which needs only the rep
// data, so it shows here while the 3D download is still pending.
describe('strain readout (criteria 9, 12, 13, 14)', () => {
  const readout = () =>
    within(screen.getByTestId('strain-panel').querySelector('ol'))
      .getAllByRole('listitem')
      .map((li) => li.textContent);

  // jsdom has no matchMedia here, so this is the phone bar: the switch is
  // behind its Show tab.
  it('is off by default: no readout, no key, no caveat on the stage (criterion 13)', async () => {
    const user = userEvent.setup();
    render(<SquatApp />);
    await user.click(screen.getByRole('button', { name: 'Show' }));
    await waitFor(() =>
      expect(
        screen.getByRole('switch', { name: 'Activation heatmap' })
      ).toBeEnabled()
    );
    expect(
      screen.getByRole('switch', { name: 'Activation heatmap' })
    ).not.toBeChecked();
    const stage = screen.getByRole('region', { name: '3D model' });
    expect(screen.queryByTestId('strain-panel')).toBeNull();
    expect(within(stage).queryByText('Activation key')).toBeNull();
    expect(within(stage).queryByText(ACT_NOTE)).toBeNull();
  });

  it('heatmap on: three regions with their bands in text, and the key and caveat in the stage (criteria 9, 12)', async () => {
    const user = userEvent.setup();
    render(<SquatApp />);
    await user.click(screen.getByRole('button', { name: 'Show' }));
    const heat = screen.getByRole('switch', { name: 'Activation heatmap' });
    await waitFor(() => expect(heat).toBeEnabled());
    await user.click(heat);
    const stage = screen.getByRole('region', { name: '3D model' });
    const panel = within(stage).getByTestId('strain-panel');
    expect(readout()).toHaveLength(3);
    for (const line of readout()) {
      expect(line).toMatch(/^[A-Z][^:]+: .+ \((Low|Moderate|High)\)$/);
    }
    expect(within(panel).getByText('Activation key')).toBeInTheDocument();
    expect(within(panel).getByText(ACT_NOTE)).toBeInTheDocument();
    // The legend has left the muscle section: one key, beside the model.
    expect(screen.getAllByText('Activation key')).toHaveLength(1);
    await user.click(heat);
    expect(screen.queryByTestId('strain-panel')).toBeNull();
  });

  it('a step changes the list, reading the frame’s own side of the turn (criterion 14)', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', '/squat#t=2.18&heat');
    render(<SquatApp />);
    await waitFor(() =>
      expect(screen.getByTestId('depth-readout')).toHaveTextContent(
        /^2\.18 s · Bottom/
      )
    );
    // Frame 109 is the last on the lowering side; 110 is the first on drive.
    expect(screen.getByTestId('depth-readout')).toHaveTextContent('lowering');
    const before = readout();
    expect(before[1]).toMatch(/^Trunk and bracing: .+ \(Moderate\)$/);
    await user.click(screen.getByRole('button', { name: 'Step forward' }));
    expect(screen.getByTestId('depth-readout')).toHaveTextContent('drive');
    const after = readout();
    expect(after).not.toEqual(before);
    expect(after[1]).toMatch(/^Trunk and bracing: .+ \(High\)$/);
    expect(
      screen.getByRole('region', { name: /^Working hardest now · Bottom$/ })
    ).toBeInTheDocument();
  });
});
